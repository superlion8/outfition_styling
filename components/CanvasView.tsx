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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
    ArrowLeft, Plus, Upload, FolderOpen, Shirt, Image as ImageIcon,
    ZoomIn, ZoomOut, Maximize2, Trash2, Download, Sparkles, MousePointer2,
    Hand, Type, Layers
} from 'lucide-react';
import { WardrobeItem } from '../types';

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
            style={{ width: 80, height: 100 }}
        >
            <img
                src={data.imageUrl}
                alt={data.label}
                className="w-full h-full object-contain bg-white/5"
                draggable={false}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5">
                <span className="text-white text-[9px] font-medium truncate block">{data.label}</span>
            </div>
        </div>
    );
};

const nodeTypes = {
    canvasItem: CanvasItemNode,
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

    // Add item to canvas
    const handleAddItem = useCallback((imageUrl: string, label: string, type: CanvasItemData['type']) => {
        const newNode: Node<CanvasItemData> = {
            id: `node-${Date.now()}`,
            type: 'canvasItem',
            position: {
                x: 200 + Math.random() * 300,
                y: 100 + Math.random() * 200,
            },
            data: { imageUrl, label, type },
        };
        setNodes((nds) => [...nds, newNode]);
    }, [setNodes]);

    // Handle file upload
    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    handleAddItem(event.target.result as string, file.name, 'upload');
                }
            };
            reader.readAsDataURL(file);
        });
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

    // Group wardrobe items by category
    const categorizedItems = useMemo(() => {
        const grouped: Record<string, WardrobeItem[]> = {};
        wardrobeItems.forEach(item => {
            if (!grouped[item.category]) grouped[item.category] = [];
            grouped[item.category].push(item);
        });
        return grouped;
    }, [wardrobeItems]);
    // Handle drag and drop files onto canvas
    const handleCanvasDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        Array.from(files).forEach((file) => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    handleAddItem(event.target.result as string, file.name, 'upload');
                }
            };
            reader.readAsDataURL(file);
        });
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
                    nodeTypes={nodeTypes}
                    fitView
                    panOnScroll={activeTool === 'pan'}
                    panOnDrag={activeTool === 'pan' ? true : [1, 2]}
                    selectionOnDrag={activeTool === 'select'}
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
