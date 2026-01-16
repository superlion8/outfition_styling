import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
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
    Hand, Type, Layers, SquareDashed, User, Settings2, Filter, X, Check
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
            style={{ width: '100%', height: '100%' }}
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

const ModelSelectorNode: React.FC<NodeProps<Node<ModelSelectorData>>> = ({ id, data, selected }) => {
    return (
        <div
            className={`
                relative bg-card-dark rounded-xl overflow-hidden border-2 transition-all duration-200 shadow-2xl
                ${selected ? 'border-primary ring-4 ring-primary/30' : 'border-border-dark'}
            `}
            style={{ width: 180, height: 320 }}
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
                <button
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 rounded-lg text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent('openModelSelector', { detail: { nodeId: id } }));
                    }}
                >
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

// Model type for selector
interface Model {
    _id: string;
    model_id: string;
    image: string;
    model_ethnicity: string;
    model_gender: string;
}
const modelsData = modelsDataRaw as Model[];

const CanvasViewInner: React.FC<CanvasViewProps> = ({ wardrobeItems, onBack }) => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { fitView, zoomIn, zoomOut, deleteElements } = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
    const [activeTool, setActiveTool] = useState<'select' | 'pan'>('pan');
    const [assetTab, setAssetTab] = useState<'wardrobe' | 'uploads' | 'templates'>('wardrobe');

    // Model selector modal state
    const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
    const [editingModelNodeId, setEditingModelNodeId] = useState<string | null>(null);
    const [ethnicityFilter, setEthnicityFilter] = useState('All');
    const [genderFilter, setGenderFilter] = useState('All');

    // Go Styling state
    type StylingStep = 'idle' | 'config' | 'generating';
    interface CanvasStylingItem {
        index: number;
        nodeId: string;
        imageUrl: string;
    }
    const [stylingStep, setStylingStep] = useState<StylingStep>('idle');
    const [stylingItems, setStylingItems] = useState<CanvasStylingItem[]>([]);
    const [stylingOutfitCount, setStylingOutfitCount] = useState(3);
    const [stylingPrompt, setStylingPrompt] = useState('');

    // Listen for model selector open event from nodes
    useEffect(() => {
        const handleOpenModelSelector = (e: CustomEvent<{ nodeId: string }>) => {
            setEditingModelNodeId(e.detail.nodeId);
            setIsModelSelectorOpen(true);
        };
        window.addEventListener('openModelSelector', handleOpenModelSelector as EventListener);
        return () => window.removeEventListener('openModelSelector', handleOpenModelSelector as EventListener);
    }, []);

    // Filter options
    const ethnicityOptions = useMemo(() => {
        const ethnicities = new Set(modelsData.map(m => m.model_ethnicity));
        return ['All', ...Array.from(ethnicities)].sort();
    }, []);
    const genderOptions = useMemo(() => {
        const genders = new Set(modelsData.map(m => m.model_gender));
        return ['All', ...Array.from(genders)].sort();
    }, []);
    const filteredModels = useMemo(() => {
        return modelsData.filter(model => {
            const matchEthnicity = ethnicityFilter === 'All' || model.model_ethnicity === ethnicityFilter;
            const matchGender = genderFilter === 'All' || model.model_gender === genderFilter;
            return matchEthnicity && matchGender;
        });
    }, [ethnicityFilter, genderFilter]);

    // Handle model selection
    const handleSelectModel = useCallback((model: Model) => {
        if (editingModelNodeId) {
            setNodes((nds) => nds.map(n =>
                n.id === editingModelNodeId
                    ? { ...n, data: { ...n.data, modelImage: model.image, modelId: model.model_id } }
                    : n
            ));
        }
        setIsModelSelectorOpen(false);
        setEditingModelNodeId(null);
    }, [editingModelNodeId, setNodes]);

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

            // Only count canvasItem nodes for grid positioning
            const canvasItemCount = nds.filter(n => n.type === 'canvasItem').length;
            const col = canvasItemCount % cols;
            const row = Math.floor(canvasItemCount / cols);

            const newNode: Node<CanvasItemData> = {
                id: `node-${Date.now()}-${canvasItemCount}`,
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

    // Start Go Styling flow
    const handleStartStyling = useCallback(() => {
        // Get selected canvasItem nodes (images only, not whiteboards/models)
        const selectedImageNodes = nodes.filter(
            n => selectedNodes.includes(n.id) && n.type === 'canvasItem'
        );

        if (selectedImageNodes.length < 2) {
            alert('Please select at least 2 images for styling');
            return;
        }

        // Build styling items with index
        const items: CanvasStylingItem[] = selectedImageNodes.map((node, idx) => ({
            index: idx + 1,
            nodeId: node.id,
            imageUrl: (node.data as CanvasItemData).imageUrl,
        }));

        setStylingItems(items);
        setStylingStep('config');
    }, [nodes, selectedNodes]);

    // Generate styling via API and create whiteboards
    const handleGenerateStyling = useCallback(async () => {
        if (stylingItems.length < 2 || !reactFlowWrapper.current) return;

        setStylingStep('generating');

        // Calculate bounding box of selected items for positioning
        const selectedNodePositions = nodes.filter(n => stylingItems.some(item => item.nodeId === n.id));
        let maxX = -Infinity;
        let minY = Infinity;
        selectedNodePositions.forEach(n => {
            const nodeWidth = 40;
            if (n.position.x + nodeWidth > maxX) maxX = n.position.x + nodeWidth;
            if (n.position.y < minY) minY = n.position.y;
        });

        // Whiteboard sizing (wider, shorter)
        const whiteboardWidth = 420;
        const whiteboardHeight = 210;
        const whiteboardGapX = 25;
        const whiteboardGapY = 25;
        const startX = maxX + 100;
        const startY = minY;
        const maxPerColumn = 5;

        // Step 1: Create empty whiteboards immediately
        const whiteboardIds: string[] = [];
        const emptyWhiteboards: Node[] = [];

        for (let i = 0; i < stylingOutfitCount; i++) {
            const wbId = `styling-wb-${Date.now()}-${i}`;
            whiteboardIds.push(wbId);
            const col = Math.floor(i / maxPerColumn);
            const row = i % maxPerColumn;

            emptyWhiteboards.push({
                id: wbId,
                type: 'whiteboard',
                position: {
                    x: startX + col * (whiteboardWidth + whiteboardGapX),
                    y: startY + row * (whiteboardHeight + whiteboardGapY),
                },
                data: { label: `Look ${i + 1}` },
                style: { zIndex: -1, width: whiteboardWidth, height: whiteboardHeight },
            });
        }

        setNodes((nds) => [...nds, ...emptyWhiteboards]);

        // Zoom out and pan to show whiteboards
        setTimeout(() => {
            fitView({ padding: 0.2, duration: 500 });
        }, 100);

        try {
            // Step 2: Add index overlays
            const indexOverlays: HTMLDivElement[] = [];
            const reactFlowViewport = reactFlowWrapper.current.querySelector('.react-flow__viewport');

            if (reactFlowViewport) {
                stylingItems.forEach(item => {
                    const nodeEl = reactFlowWrapper.current?.querySelector(`[data-id="${item.nodeId}"]`);
                    if (nodeEl) {
                        const overlay = document.createElement('div');
                        overlay.style.cssText = `
                            position: absolute; top: 0; left: 0; z-index: 9999;
                            background: #8c30e8; color: #000; font-weight: bold; font-size: 12px;
                            padding: 2px 6px; border-radius: 0 0 6px 0;
                        `;
                        overlay.textContent = `#${item.index}`;
                        nodeEl.appendChild(overlay);
                        indexOverlays.push(overlay);
                    }
                });
            }

            // Step 3: Capture screenshot (lower quality for smaller payload)
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(reactFlowWrapper.current, {
                backgroundColor: '#1a1625',
                scale: 1, // Reduced scale for smaller file
            });
            const screenshot = canvas.toDataURL('image/jpeg', 0.7); // Use JPEG with 70% quality

            // Step 4: Remove overlays
            indexOverlays.forEach(el => el.remove());

            // Step 5: Call API with retry for cold start
            const callApi = async (retries = 2): Promise<any> => {
                const response = await fetch('/api/canvas-styling', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        screenshot,
                        itemCount: stylingItems.length,
                        outfitCount: stylingOutfitCount,
                        userPrompt: stylingPrompt || undefined,
                    }),
                });

                if (!response.ok) {
                    const text = await response.text();
                    let errorMsg = 'API request failed';
                    try {
                        const err = JSON.parse(text);
                        errorMsg = err.error || errorMsg;
                    } catch {
                        // Response wasn't JSON (cold start timeout)
                        if (retries > 0) {
                            console.log(`Retrying API call... (${retries} left)`);
                            return callApi(retries - 1);
                        }
                        errorMsg = 'Server timeout, please try again';
                    }
                    throw new Error(errorMsg);
                }

                return response.json();
            };

            const result = await callApi();

            if (!result.outfits || result.outfits.length === 0) {
                throw new Error('No outfits generated');
            }

            // Step 6: Fill whiteboards with items (single row, horizontal layout)
            const imageNodes: Node[] = [];
            const imageWidth = 80;
            const imageHeight = 80;
            const cols = 6; // All in one row
            const gap = 8;
            const offsetY = 20; // Below label

            result.outfits.forEach((outfit: { selectedIndices: number[]; reason: string }, outfitIdx: number) => {
                const wbId = whiteboardIds[outfitIdx];
                if (!wbId) return;

                outfit.selectedIndices.forEach((idx, imgIdx) => {
                    const item = stylingItems.find(i => i.index === idx);
                    if (!item) return;

                    const imgCol = imgIdx % cols;
                    const imgRow = Math.floor(imgIdx / cols);

                    imageNodes.push({
                        id: `styling-img-${Date.now()}-${outfitIdx}-${imgIdx}`,
                        type: 'resizableImage',
                        position: {
                            x: 8 + imgCol * (imageWidth + gap),
                            y: offsetY + imgRow * (imageHeight + gap),
                        },
                        data: { imageUrl: item.imageUrl },
                        parentId: wbId,
                        extent: 'parent',
                        style: { width: imageWidth, height: imageHeight },
                    });
                });
            });

            setNodes((nds) => [...nds, ...imageNodes]);

            // Fit view to show all content
            setTimeout(() => {
                fitView({ padding: 0.15, duration: 400 });
            }, 100);

            // Reset styling state
            setStylingStep('idle');
            setStylingItems([]);
            setStylingPrompt('');
            setSelectedNodes([]);

        } catch (error) {
            console.error('Styling generation failed:', error);
            alert(`Failed to generate outfits: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setStylingStep('config');
        }
    }, [stylingItems, stylingOutfitCount, stylingPrompt, setNodes]);

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

                {/* Go Styling Button - visible when ≥2 images selected */}
                {selectedNodes.filter(id => nodes.find(n => n.id === id)?.type === 'canvasItem').length >= 2 && stylingStep === 'idle' && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
                        <button
                            onClick={handleStartStyling}
                            className="px-6 py-3 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white rounded-full font-bold text-sm flex items-center gap-2 shadow-xl transition-all hover:scale-105"
                        >
                            <Sparkles className="w-5 h-5" />
                            Go Styling ({selectedNodes.filter(id => nodes.find(n => n.id === id)?.type === 'canvasItem').length} items)
                        </button>
                    </div>
                )}
            </div>

            {/* Styling Config Modal */}
            {stylingStep === 'config' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card-dark border border-border-dark rounded-2xl w-full max-w-[90vw] xl:max-w-[1600px] p-6 shadow-2xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <Sparkles className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-bold text-white">Configure Styling</h3>
                            </div>
                            <button
                                onClick={() => { setStylingStep('idle'); setStylingItems([]); }}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-text-muted" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <span className="text-sm text-text-muted">Selected Items ({stylingItems.length})</span>
                                <div className="grid grid-cols-10 sm:grid-cols-12 md:grid-cols-14 lg:grid-cols-16 xl:grid-cols-20 gap-2 mt-2 max-h-[50vh] overflow-y-auto">
                                    {stylingItems.map(item => (
                                        <div key={item.nodeId} className="relative aspect-[3/4] rounded-lg overflow-hidden border border-white/20">
                                            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                                            <div className="absolute top-0 left-0 bg-primary text-black text-[8px] font-bold px-1 py-0.5 rounded-br-lg">
                                                {item.index}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-text-muted mb-2">Number of Outfits</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={stylingOutfitCount}
                                    onChange={(e) => setStylingOutfitCount(Number(e.target.value) || 0)}
                                    onBlur={(e) => {
                                        const val = Math.max(1, Math.min(10, Number(e.target.value) || 1));
                                        setStylingOutfitCount(val);
                                    }}
                                    className="w-full bg-background-dark border border-border-dark rounded-lg px-4 py-2 text-white outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-text-muted mb-2">Additional Requirements (optional)</label>
                                <textarea
                                    value={stylingPrompt}
                                    onChange={(e) => setStylingPrompt(e.target.value)}
                                    placeholder="e.g., casual style, warm colors..."
                                    className="w-full bg-background-dark border border-border-dark rounded-lg px-4 py-3 text-white outline-none focus:border-primary resize-none h-24"
                                />
                            </div>

                            <button
                                onClick={handleGenerateStyling}
                                className="w-full py-3 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                            >
                                <Sparkles className="w-4 h-4" />
                                Generate {stylingOutfitCount} Outfit{stylingOutfitCount > 1 ? 's' : ''}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Styling Generating Overlay */}
            {stylingStep === 'generating' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-white font-bold text-lg">Generating Outfits...</p>
                        <p className="text-text-muted text-sm mt-2">AI is analyzing your wardrobe</p>
                    </div>
                </div>
            )}

            {/* Model Selector Modal */}
            {isModelSelectorOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card-dark border border-border-dark rounded-2xl w-full max-w-[95vw] xl:max-w-[1400px] p-6 shadow-2xl h-[85vh] flex flex-col">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-4 shrink-0">
                            <div className="flex items-center gap-3">
                                <User className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-bold text-white">Select Model</h3>
                                <span className="text-xs text-text-muted bg-white/5 px-2 py-1 rounded-full">{filteredModels.length} models</span>
                            </div>
                            <button
                                onClick={() => { setIsModelSelectorOpen(false); setEditingModelNodeId(null); }}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-text-muted" />
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="flex flex-wrap gap-4 mb-4 p-3 bg-white/5 rounded-xl border border-white/5 shrink-0">
                            <div className="flex items-center gap-2 text-text-muted text-sm border-r border-white/10 pr-4">
                                <Filter className="w-4 h-4" />
                                <span>Filters:</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-text-muted uppercase font-bold">Ethnicity</span>
                                <select
                                    value={ethnicityFilter}
                                    onChange={(e) => setEthnicityFilter(e.target.value)}
                                    className="bg-card-dark border border-border-dark text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary"
                                >
                                    {ethnicityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-text-muted uppercase font-bold">Gender</span>
                                <select
                                    value={genderFilter}
                                    onChange={(e) => setGenderFilter(e.target.value)}
                                    className="bg-card-dark border border-border-dark text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary"
                                >
                                    {genderOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="flex-1 overflow-y-auto min-h-0">
                            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-3">
                                {filteredModels.map((model) => {
                                    const currentNode = editingModelNodeId ? nodes.find(n => n.id === editingModelNodeId) : null;
                                    const isSelected = currentNode?.data?.modelId === model.model_id;
                                    return (
                                        <div
                                            key={model._id}
                                            className={`relative aspect-[9/16] rounded-xl overflow-hidden group border-2 transition-all cursor-pointer ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-primary/50'}`}
                                            onClick={() => handleSelectModel(model)}
                                        >
                                            <img loading="lazy" src={model.image} alt={model.model_id} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="absolute bottom-0 left-0 right-0 p-2">
                                                    <span className="text-white font-bold text-xs truncate block">{model.model_id}</span>
                                                    <span className="text-white/60 text-[10px]">{model.model_ethnicity}</span>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 bg-primary text-black rounded-full p-1">
                                                    <Check className="w-3 h-3" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
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
