import React, { useCallback, useState, useMemo, useRef } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    ReactFlowProvider,
    Panel,
    useReactFlow,
    Node,
    NodeProps,
    NodeResizer,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import imageCompression from 'browser-image-compression';
import {
    ArrowLeft, Plus, Upload, FolderOpen, Shirt, Image as ImageIcon,
    ZoomIn, ZoomOut, Maximize2, Trash2, Download, Sparkles, MousePointer2,
    Hand, Type, Layers, SquareDashed, User, Settings2
} from 'lucide-react';
import { WardrobeItem } from '../types';
import modelsDataRaw from '../data/models.json';

// Custom Node for Canvas Items
interface CanvasItemData {
    imageUrl: string;
    label: string;
    type: 'clothing' | 'upload' | 'template';
    [key: string]: unknown;
}

const CanvasItemNode: React.FC<NodeProps<Node<CanvasItemData>>> = ({ data, selected }) => {
    return (
        <div
            className={`
                relative bg-card-dark rounded-lg overflow-hidden border transition-all duration-200 shadow-lg
                ${selected ? 'border-primary ring-2 ring-primary/40' : 'border-border-dark hover:border-primary/50'}
            `}
            style={{ width: 40, height: 50 }}
        >
            <img
                src={data.imageUrl}
                alt={data.label}
                className="w-full h-full object-contain"
                draggable={false}
            />
        </div>
    );
};

// Whiteboard Node (container for grouping items)
interface WhiteboardData {
    label: string;
    [key: string]: unknown;
}

const WhiteboardNode: React.FC<NodeProps<Node<WhiteboardData>>> = ({ data, selected }) => {
    return (
        <div
            className={`
                bg-white rounded-xl shadow-2xl border-2 transition-all duration-200
                ${selected ? 'border-primary ring-4 ring-primary/30' : 'border-gray-200'}
            `}
            style={{ width: 300, height: 400, minWidth: 200, minHeight: 200 }}
        >
            <div className="absolute top-2 left-3 text-gray-400 text-xs font-medium">
                {data.label || 'Whiteboard'}
            </div>
        </div>
    );
};

// Resizable Image Node (for inside whiteboard - Figma-like)
interface ResizableImageData {
    imageUrl: string;
    [key: string]: unknown;
}

const ResizableImageNode: React.FC<NodeProps<Node<ResizableImageData>>> = ({ data, selected }) => {
    return (
        <>
            <NodeResizer
                isVisible={selected}
                minWidth={30}
                minHeight={30}
                handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
            />
            <img
                src={data.imageUrl}
                alt=""
                className="w-full h-full object-contain"
                draggable={false}
                style={{ pointerEvents: 'none' }}
            />
        </>
    );
};

// Model Selector Node (for canvas)
interface ModelSelectorData {
    modelImage: string;
    modelId: string;
    [key: string]: unknown;
}

const ModelSelectorNode: React.FC<NodeProps<Node<ModelSelectorData>>> = ({ data, selected }) => {
    return (
        <div
            className={`
                relative bg-card-dark rounded-xl overflow-hidden border-2 transition-all duration-200 shadow-2xl
                ${selected ? 'border-primary ring-4 ring-primary/30' : 'border-border-dark'}
            `}
            style={{ width: 200, height: 300 }}
        >
            {/* Header Badge */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10">
                <User className="w-3 h-3 text-primary" />
                <span className="text-white text-[10px] font-bold">Model Preview</span>
            </div>

            {/* Model Image */}
            <div
                className="w-full h-full bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${data.modelImage})` }}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {/* Customize Button */}
                <button className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 rounded-lg text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer">
                    <Settings2 className="w-3.5 h-3.5" />
                    Customize Avatar
                </button>
            </div>
        </div>
    );
};

const nodeTypes = {
    canvasItem: CanvasItemNode,
    whiteboard: WhiteboardNode,
    resizableImage: ResizableImageNode,
    modelSelector: ModelSelectorNode,
};

interface CanvasViewProps {
    wardrobeItems: WardrobeItem[];
    onBack: () => void;
}

const CanvasViewInner: React.FC<CanvasViewProps> = ({ wardrobeItems, onBack }) => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { fitView, zoomIn, zoomOut, deleteElements } = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
    const [activeTool, setActiveTool] = useState<'select' | 'pan'>('select');
    const [assetTab, setAssetTab] = useState<'wardrobe' | 'uploads' | 'templates'>('wardrobe');

    // Add item to canvas with grid layout
    const handleAddItem = useCallback((imageUrl: string, label: string, type: CanvasItemData['type']) => {
        setNodes((nds) => {
            const nodeWidth = 50;
            const nodeHeight = 60;
            const gap = 1;
            const cols = 12; // 12 columns per row
            // Center grid around origin (0,0)
            const gridWidth = cols * (nodeWidth + gap);
            const startX = -gridWidth / 2;
            const startY = -200;

            const index = nds.length;
            const col = index % cols;
            const row = Math.floor(index / cols);

            const newNode: Node<CanvasItemData> = {
                id: `node-${Date.now()}-${index}`,
                type: 'canvasItem',
                position: {
                    x: startX + col * (nodeWidth + gap),
                    y: startY + row * (nodeHeight + gap),
                },
                data: { imageUrl, label, type },
            };
            return [...nds, newNode];
        });
    }, [setNodes]);

    // Add whiteboard to canvas
    const handleAddWhiteboard = useCallback(() => {
        const newNode: Node<WhiteboardData> = {
            id: `whiteboard-${Date.now()}`,
            type: 'whiteboard',
            position: { x: 0, y: 0 },
            data: { label: `Board ${nodes.filter(n => n.type === 'whiteboard').length + 1}` },
            style: { zIndex: -1 }, // Behind other nodes
        };
        setNodes((nds) => [...nds, newNode]);
    }, [setNodes, nodes]);

    // Add model selector to canvas
    const handleAddModel = useCallback(() => {
        const models = modelsDataRaw as { model_id: string; image: string }[];
        const randomModel = models[Math.floor(Math.random() * models.length)];
        const newNode: Node<ModelSelectorData> = {
            id: `model-${Date.now()}`,
            type: 'modelSelector',
            position: { x: 150, y: 0 },
            data: { modelImage: randomModel.image, modelId: randomModel.model_id },
        };
        setNodes((nds) => [...nds, newNode]);
    }, [setNodes]);

    // Handle file upload with compression (parallel)
    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const processFile = async (file: File) => {
            if (!file.type.startsWith('image/')) return;
            try {
                const compressed = await imageCompression(file, {
                    maxSizeMB: 0.5,
                    maxWidthOrHeight: 400,
                    useWebWorker: true,
                });
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (event.target?.result) {
                        handleAddItem(event.target.result as string, '', 'upload');
                    }
                };
                reader.readAsDataURL(compressed);
            } catch (err) {
                console.error('Image compression failed:', err);
            }
        };

        // Process all files in parallel
        await Promise.all(Array.from(files).map(processFile));
    }, [handleAddItem]);

    // Delete selected
    const handleDeleteSelected = useCallback(() => {
        const nodesToDelete = nodes.filter(n => selectedNodes.includes(n.id));
        deleteElements({ nodes: nodesToDelete });
        setSelectedNodes([]);
    }, [nodes, selectedNodes, deleteElements]);

    // Clear canvas
    const handleClearCanvas = useCallback(() => {
        if (window.confirm('Clear all items from canvas?')) {
            setNodes([]);
            setEdges([]);
            setSelectedNodes([]);
        }
    }, [setNodes, setEdges]);

    // Export canvas
    const handleExport = useCallback(async () => {
        if (!reactFlowWrapper.current) return;
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(reactFlowWrapper.current, {
                backgroundColor: '#1a1625',
                scale: 2,
            });
            const link = document.createElement('a');
            link.download = `canvas-export-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) {
            console.error('Failed to export canvas:', e);
        }
    }, []);

    // Track selection
    const onSelectionChange = useCallback(({ nodes: selectedNds }: { nodes: Node[] }) => {
        setSelectedNodes(selectedNds.map(n => n.id));
    }, []);

    // Handle node drag stop - detect if dropped on whiteboard
    const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
        // Only process canvasItem nodes (thumbnails)
        if (node.type !== 'canvasItem') return;

        // Find whiteboards
        const whiteboards = nodes.filter(n => n.type === 'whiteboard');

        for (const wb of whiteboards) {
            const wbWidth = 300;
            const wbHeight = 400;

            // Check if node center is within whiteboard bounds
            const nodeCenter = {
                x: node.position.x + 20, // half of 40px width
                y: node.position.y + 25, // half of 50px height
            };

            if (
                nodeCenter.x >= wb.position.x &&
                nodeCenter.x <= wb.position.x + wbWidth &&
                nodeCenter.y >= wb.position.y &&
                nodeCenter.y <= wb.position.y + wbHeight
            ) {
                // Convert to resizable image inside whiteboard
                const imageData = node.data as CanvasItemData;
                setNodes((nds) => {
                    // Remove old node
                    const filtered = nds.filter(n => n.id !== node.id);
                    // Add new resizable image as child of whiteboard
                    const newNode: Node<ResizableImageData> = {
                        id: `resizable-${Date.now()}`,
                        type: 'resizableImage',
                        position: {
                            x: nodeCenter.x - wb.position.x - 40,
                            y: nodeCenter.y - wb.position.y - 40,
                        },
                        data: { imageUrl: imageData.imageUrl },
                        parentId: wb.id,
                        extent: 'parent',
                        style: { width: 80, height: 100 },
                    };
                    return [...filtered, newNode];
                });
                break;
            }
        }
    }, [nodes, setNodes]);

    // Group wardrobe items by category
    const categorizedItems = useMemo(() => {
        const grouped: Record<string, WardrobeItem[]> = {};
        wardrobeItems.forEach(item => {
            if (!grouped[item.category]) grouped[item.category] = [];
            grouped[item.category].push(item);
        });
        return grouped;
    }, [wardrobeItems]);
    // Handle drag and drop files onto canvas with compression (parallel)
    const handleCanvasDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        const processFile = async (file: File) => {
            if (!file.type.startsWith('image/')) return;
            try {
                const compressed = await imageCompression(file, {
                    maxSizeMB: 0.5,
                    maxWidthOrHeight: 400,
                    useWebWorker: true,
                });
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (event.target?.result) {
                        handleAddItem(event.target.result as string, '', 'upload');
                    }
                };
                reader.readAsDataURL(compressed);
            } catch (err) {
                console.error('Image compression failed:', err);
            }
        };

        // Process all files in parallel
        await Promise.all(Array.from(files).map(processFile));
    }, [handleAddItem]);

    const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }, []);

    return (
        <div
            className="h-screen w-full flex flex-col bg-background-dark"
            onDrop={handleCanvasDrop}
            onDragOver={handleCanvasDragOver}
        >
            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
            />
            {/* Top Toolbar */}
            <div className="h-14 bg-card-dark border-b border-border-dark flex items-center justify-between px-4">
                {/* Left - Tools */}
                <div className="flex items-center gap-1 bg-background-dark rounded-lg p-1">
                    <button
                        onClick={() => setActiveTool('select')}
                        className={`p-2 rounded-lg transition-colors ${activeTool === 'select' ? 'bg-primary text-background-dark' : 'text-text-muted hover:text-white hover:bg-white/10'}`}
                        title="Select"
                    >
                        <MousePointer2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setActiveTool('pan')}
                        className={`p-2 rounded-lg transition-colors ${activeTool === 'pan' ? 'bg-primary text-background-dark' : 'text-text-muted hover:text-white hover:bg-white/10'}`}
                        title="Pan"
                    >
                        <Hand className="w-4 h-4" />
                    </button>
                </div>

                {/* Center - Zoom */}
                <div className="flex items-center gap-1 bg-background-dark rounded-lg p-1">
                    <button onClick={() => zoomOut({ duration: 200 })} className="p-2 text-text-muted hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Zoom Out">
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <button onClick={() => fitView({ duration: 300 })} className="px-3 py-1 text-xs text-text-muted hover:text-white transition-colors">
                        Fit
                    </button>
                    <button onClick={() => zoomIn({ duration: 200 })} className="p-2 text-text-muted hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Zoom In">
                        <ZoomIn className="w-4 h-4" />
                    </button>
                </div>

                {/* Right - Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleAddWhiteboard}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-colors border border-border-dark"
                        title="Add a whiteboard container"
                    >
                        <SquareDashed className="w-4 h-4" />
                        Whiteboard
                    </button>
                    <button
                        onClick={handleAddModel}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-colors border border-border-dark"
                        title="Add a model selector"
                    >
                        <User className="w-4 h-4" />
                        Model
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-colors border border-border-dark"
                        title="Import images from local files"
                    >
                        <Upload className="w-4 h-4" />
                        Import
                    </button>
                    <div className="w-px h-6 bg-border-dark" />
                    <button
                        onClick={handleDeleteSelected}
                        disabled={selectedNodes.length === 0}
                        className="p-2 text-text-muted hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30"
                        title="Delete Selected"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-border-dark" />
                    <button
                        onClick={handleExport}
                        disabled={nodes.length === 0}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-background-dark rounded-lg font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-30"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div ref={reactFlowWrapper} className="flex-1 bg-[#1a1625]">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onSelectionChange={onSelectionChange}
                    onNodeDragStop={handleNodeDragStop}
                    nodeTypes={nodeTypes}
                    fitView
                    panOnScroll
                    panOnDrag={activeTool === 'pan' ? true : [1, 2]}
                    selectionOnDrag={activeTool === 'select'}
                    multiSelectionKeyCode="Shift"
                    className="bg-transparent"
                    proOptions={{ hideAttribution: true }}
                    minZoom={0.1}
                    maxZoom={4}
                >
                    <Background color="#3d3448" gap={32} size={1} />
                    <MiniMap
                        nodeColor="#8c30e8"
                        maskColor="rgba(0,0,0,0.8)"
                        className="!bg-card-dark !border-border-dark !rounded-lg"
                        style={{ width: 120, height: 80 }}
                    />
                </ReactFlow>
            </div>
        </div>
    );
};

// Wrapper with Provider
export const CanvasView: React.FC<CanvasViewProps> = (props) => {
    return (
        <ReactFlowProvider>
            <CanvasViewInner {...props} />
        </ReactFlowProvider>
    );
};
