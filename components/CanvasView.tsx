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
    Edge,
    NodeProps,
    NodeResizer,
    Handle,
    Position,
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
import { ModelPreviewCard } from './ModelPreview/ModelPreviewCard';
import { ModelSelectorModal, Model } from './ModelPreview/ModelSelectorModal';

const modelsData = modelsDataRaw as Model[];

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
    hasModelCard?: boolean;
    [key: string]: unknown;
}

const WhiteboardNode: React.FC<NodeProps<Node<WhiteboardData>>> = ({ id, data, selected }) => {
    const handleShootClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (data.hasModelCard) {
            // Already has model card, trigger confirm
            window.dispatchEvent(new CustomEvent('confirmShoot', { detail: { whiteboardId: id } }));
        } else {
            // Start shoot workflow
            window.dispatchEvent(new CustomEvent('startShoot', { detail: { whiteboardId: id } }));
        }
    };

    return (
        <div
            className={`
                bg-white rounded-xl shadow-2xl border-2 transition-all duration-200
                ${selected ? 'border-primary ring-4 ring-primary/30' : 'border-gray-200'}
            `}
            style={{ width: '100%', height: '100%' }}
        >
            {/* Connection handle on the right side */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-white !border-2 !border-white/50"
                style={{ right: -6 }}
            />
            <div className="absolute top-2 left-3 text-gray-400 text-xs font-medium">
                {data.label || 'Whiteboard'}
            </div>
            {/* Shoot / Confirm Shoot Button */}
            <button
                onClick={handleShootClick}
                className="absolute top-2 right-2 group"
            >
                {data.hasModelCard ? (
                    <div className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-[10px] font-bold tracking-wider uppercase rounded-full shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 flex items-center gap-1.5">
                        <span>Confirm Shoot</span>
                        <span>→</span>
                    </div>
                ) : (
                    <div className="px-3 py-1.5 bg-black/80 hover:bg-black text-white text-[10px] font-medium tracking-wider uppercase rounded-full border border-white/20 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        <span>Shoot</span>
                    </div>
                )}
            </button>
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

// Consolidated Model Node for all model previews on canvas
interface ModelNodeData {
    modelImage?: string;
    modelId?: string;
    whiteboardId?: string; // Present if originating from a shoot workflow
    isShootWorkflow?: boolean;
    cardHeight?: number;
    [key: string]: unknown;
}

const ModelNode: React.FC<NodeProps<Node<ModelNodeData>>> = ({ id, data, selected }) => {
    const handleOpenPicker = () => {
        if (data.isShootWorkflow) {
            window.dispatchEvent(new CustomEvent('openModelPicker', {
                detail: { nodeId: id, whiteboardId: data.whiteboardId }
            }));
        } else {
            window.dispatchEvent(new CustomEvent('openModelSelector', {
                detail: { nodeId: id }
            }));
        }
    };

    const modelImage = data.modelImage ||
        modelsData.find(m => m.model_id === data.modelId)?.image ||
        modelsData[0]?.image || '';

    const cardHeight = typeof data.cardHeight === 'number' ? data.cardHeight : undefined;

    return (
        <div className="relative">
            {/* Left handle - receives connection from whiteboard */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-white !border-2 !border-white/50"
                style={{ left: -6 }}
            />
            <ModelPreviewCard
                imageUrl={modelImage}
                isSelected={selected}
                showBadge={true}
                showCustomizeButton={true}
                onCustomize={handleOpenPicker}
                size={cardHeight ? 'medium' : 'large'}
                height={cardHeight}
            />
            {/* Right handle - connects to generation card */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-white !border-2 !border-white/50"
                style={{ right: -6 }}
            />
        </div>
    );
};


// Generation Card Node (shows loading/result)
interface GenerationCardData {
    status: 'loading' | 'success' | 'error';
    imageUrl?: string;
    errorMessage?: string;
    [key: string]: unknown;
}

const GenerationCardNode: React.FC<NodeProps<Node<GenerationCardData>>> = ({ data }) => {
    const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (data.status === 'success' && data.imageUrl) {
            window.dispatchEvent(new CustomEvent('openImageLightbox', { detail: { imageUrl: data.imageUrl } }));
        }
    };

    return (
        <div className="bg-card-dark border border-white/20 rounded-xl shadow-2xl overflow-hidden w-[200px] relative">
            {/* Left handle - receives connection from model card */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-white !border-2 !border-white/50"
                style={{ left: -6 }}
            />
            {data.status === 'loading' && (
                <div className="aspect-[3/4] flex flex-col items-center justify-center bg-black/20">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-pink-500 rounded-full animate-spin" />
                    <span className="text-white/60 text-xs mt-3 font-medium">Generating...</span>
                </div>
            )}
            {data.status === 'success' && data.imageUrl && (
                <div className="relative group cursor-pointer" onClick={handleImageClick}>
                    <img src={data.imageUrl} alt="Generated Look" className="w-full aspect-[3/4] object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
            )}
            {data.status === 'error' && (
                <div className="aspect-[3/4] flex flex-col items-center justify-center bg-red-900/20 p-4">
                    <span className="text-red-400 text-xs text-center">{data.errorMessage || 'Generation failed'}</span>
                </div>
            )}
        </div>
    );
};

const nodeTypes = {
    canvasItem: CanvasItemNode,
    whiteboard: WhiteboardNode,
    resizableImage: ResizableImageNode,
    modelNode: ModelNode,
    generationCard: GenerationCardNode,
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
    const [activeTool, setActiveTool] = useState<'select' | 'pan'>('pan');
    const [assetTab, setAssetTab] = useState<'wardrobe' | 'uploads' | 'templates'>('wardrobe');

    // Track drag start positions for "copy on drag" behavior
    const dragStartPosRef = useRef<Record<string, { x: number; y: number }>>({});

    // Model selector modal state
    const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
    const [editingModelNodeId, setEditingModelNodeId] = useState<string | null>(null);

    // Go Styling state
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

    // Shoot workflow state
    type ShootStep = 'idle' | 'selectModel' | 'inputPrompt' | 'generating';
    const [shootStep, setShootStep] = useState<ShootStep>('idle');
    const [shootingWhiteboardId, setShootingWhiteboardId] = useState<string | null>(null);
    const [selectedShootModel, setSelectedShootModel] = useState<{ id: string; image: string } | null>(null);
    const [shootPrompt, setShootPrompt] = useState('');

    // Lightbox state for image preview
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    // Listen for image lightbox event
    useEffect(() => {
        const handleOpenLightbox = (e: CustomEvent<{ imageUrl: string }>) => {
            setLightboxImage(e.detail.imageUrl);
        };
        window.addEventListener('openImageLightbox', handleOpenLightbox as EventListener);
        return () => window.removeEventListener('openImageLightbox', handleOpenLightbox as EventListener);
    }, []);

    // Listen for model selector open event from nodes
    useEffect(() => {
        const handleOpenModelSelector = (e: CustomEvent<{ nodeId: string }>) => {
            setEditingModelNodeId(e.detail.nodeId);
            setIsModelSelectorOpen(true);
        };
        window.addEventListener('openModelSelector', handleOpenModelSelector as EventListener);
        return () => window.removeEventListener('openModelSelector', handleOpenModelSelector as EventListener);
    }, []);

    // ===== Shoot Workflow Event Listeners =====

    // Handle "Shoot" button click on whiteboard
    useEffect(() => {
        const handleStartShoot = (e: CustomEvent<{ whiteboardId: string }>) => {
            const { whiteboardId } = e.detail;

            // Find the whiteboard node
            const wb = nodes.find(n => n.id === whiteboardId);
            if (!wb) return;

            const whiteboardHeight = typeof wb.style?.height === 'number' ? wb.style.height : 300;

            // Create ModelCard node to the right of whiteboard
            const modelCardId = `modelcard-${whiteboardId}`;
            const modelCardNode: Node<ModelNodeData> = {
                id: modelCardId,
                type: 'modelNode',
                position: {
                    x: wb.position.x + (typeof wb.style?.width === 'number' ? wb.style.width : 420) + 80,
                    y: wb.position.y,
                },
                data: {
                    whiteboardId,
                    isShootWorkflow: true,
                    modelImage: modelsData[0]?.image,
                    modelId: modelsData[0]?.model_id,
                    cardHeight: whiteboardHeight
                },
            };

            // Create white dashed edge from whiteboard to model card
            const edge: Edge = {
                id: `shoot-edge-${whiteboardId}`,
                source: whiteboardId,
                target: modelCardId,
                style: { strokeDasharray: '8,4', stroke: '#ffffff', strokeWidth: 2 },
                animated: false,
            };

            // Update whiteboard to show hasModelCard and add modelCard node
            setNodes((nds) => [
                ...nds.map(n =>
                    n.id === whiteboardId
                        ? { ...n, data: { ...n.data, hasModelCard: true } }
                        : n
                ),
                modelCardNode
            ]);
            setEdges((eds) => [...eds, edge]);
            setShootingWhiteboardId(whiteboardId);
            setShootStep('selectModel');
        };

        window.addEventListener('startShoot', handleStartShoot as EventListener);
        return () => window.removeEventListener('startShoot', handleStartShoot as EventListener);
    }, [nodes, setNodes, setEdges]);

    const [shootModelPickerOpen, setShootModelPickerOpen] = useState(false);
    const [editingModelCardId, setEditingModelCardId] = useState<string | null>(null);

    // Handle "Customize Avatar" click - open model picker
    useEffect(() => {
        const handleOpenModelPicker = (e: CustomEvent<{ nodeId: string; whiteboardId: string }>) => {
            setEditingModelCardId(e.detail.nodeId);
            setShootModelPickerOpen(true);
        };

        window.addEventListener('openModelPicker', handleOpenModelPicker as EventListener);
        return () => window.removeEventListener('openModelPicker', handleOpenModelPicker as EventListener);
    }, []);

    // Handle model selection from picker
    const handleShootModelSelect = useCallback((model: Model) => {
        if (!editingModelCardId) return;

        // Update the ModelCard node with selected model
        setNodes((nds) => nds.map(n =>
            n.id === editingModelCardId
                ? { ...n, data: { ...n.data, modelId: model.model_id, modelImage: model.image } }
                : n
        ));

        setSelectedShootModel({ id: model.model_id, image: model.image });
        setShootModelPickerOpen(false);
        setEditingModelCardId(null);
    }, [editingModelCardId, setNodes]);

    // Handle confirm shoot - show prompt input modal
    useEffect(() => {
        const handleConfirmShoot = (e: CustomEvent<{ whiteboardId: string }>) => {
            // Set default model if none was explicitly selected
            if (!selectedShootModel) {
                const defaultModel = modelsData[0];
                if (defaultModel) {
                    setSelectedShootModel({ id: defaultModel.model_id, image: defaultModel.image });
                }
            }
            setShootStep('inputPrompt');
        };

        window.addEventListener('confirmShoot', handleConfirmShoot as EventListener);
        return () => window.removeEventListener('confirmShoot', handleConfirmShoot as EventListener);
    }, [selectedShootModel]);

    // Execute the actual generation
    const executeShoot = useCallback(async () => {
        if (!shootingWhiteboardId || !selectedShootModel || !reactFlowWrapper.current) return;

        setShootStep('generating');

        const wb = nodes.find(n => n.id === shootingWhiteboardId);
        const modelCardId = `modelcard-${shootingWhiteboardId}`;
        const modelCard = nodes.find(n => n.id === modelCardId);

        if (!wb || !modelCard) return;

        // Create GenerationCard node
        const genCardId = `gencard-${shootingWhiteboardId}`;
        const genCardNode: Node = {
            id: genCardId,
            type: 'generationCard',
            position: {
                x: modelCard.position.x + 300,
                y: modelCard.position.y,
            },
            data: { status: 'loading' },
        };

        // Edge from ModelCard to GenerationCard (white dashed)
        const edge: Edge = {
            id: `gen-edge-${shootingWhiteboardId}`,
            source: modelCardId,
            target: genCardId,
            style: { strokeDasharray: '8,4', stroke: '#ffffff', strokeWidth: 2 },
            animated: false,
        };

        setNodes((nds) => [...nds, genCardNode]);
        setEdges((eds) => [...eds, edge]);

        try {
            // Capture screenshot directly of the whiteboard element
            // This is more accurate than capturing viewport and cropping
            const html2canvas = (await import('html2canvas')).default;

            // Find the whiteboard DOM element directly by data-id
            const wbElement = reactFlowWrapper.current.querySelector(`[data-id="${shootingWhiteboardId}"]`) as HTMLElement;
            if (!wbElement) throw new Error('Whiteboard element not found');

            // Get whiteboard dimensions from style (for debug node sizing)
            const wbWidth = typeof wb.style?.width === 'number' ? wb.style.width : 420;
            const wbHeight = typeof wb.style?.height === 'number' ? wb.style.height : 300;

            // Find all child image nodes that belong to this whiteboard
            // These are ResizableImage nodes with parentId = whiteboard id
            const childNodes = nodes.filter(n => n.parentId === shootingWhiteboardId);

            // Create a temporary container to render the whiteboard with its children
            const tempContainer = document.createElement('div');
            tempContainer.style.cssText = `
                position: fixed;
                left: -9999px;
                top: 0;
                width: ${wbWidth}px;
                height: ${wbHeight}px;
                background: white;
                border-radius: 12px;
                padding: 30px 8px 8px 8px;
                box-sizing: border-box;
            `;

            // Add whiteboard label
            const labelDiv = document.createElement('div');
            labelDiv.style.cssText = 'position: absolute; top: 8px; left: 12px; color: #9ca3af; font-size: 12px; font-weight: 500;';
            labelDiv.textContent = (wb.data as { label?: string })?.label || 'Whiteboard';
            tempContainer.appendChild(labelDiv);

            // Add child images to temp container
            for (const child of childNodes) {
                if (child.type === 'resizableImage' && child.data?.imageUrl) {
                    const imgDiv = document.createElement('div');
                    const childWidth = typeof child.style?.width === 'number' ? child.style.width : 80;
                    const childHeight = typeof child.style?.height === 'number' ? child.style.height : 80;
                    imgDiv.style.cssText = `
                        position: absolute;
                        left: ${child.position.x}px;
                        top: ${child.position.y}px;
                        width: ${childWidth}px;
                        height: ${childHeight}px;
                    `;
                    const img = document.createElement('img');
                    img.src = child.data.imageUrl as string;
                    img.style.cssText = 'width: 100%; height: 100%; object-fit: contain; border-radius: 8px;';
                    imgDiv.appendChild(img);
                    tempContainer.appendChild(imgDiv);
                }
            }

            // Also copy the typewriter text if present
            const typewriterEl = wbElement.querySelector('.typewriter-text');
            if (typewriterEl) {
                const textDiv = document.createElement('div');
                textDiv.style.cssText = `
                    position: absolute; bottom: 8px; left: 10px; right: 10px;
                    font-family: Georgia, serif; font-size: 11px; font-style: italic;
                    color: rgba(0,0,0,0.5); line-height: 1.4; max-height: 60px; overflow: hidden;
                `;
                textDiv.textContent = typewriterEl.textContent || '';
                tempContainer.appendChild(textDiv);
            }

            document.body.appendChild(tempContainer);

            // Wait for images to load
            await new Promise(resolve => setTimeout(resolve, 100));

            // Capture the temp container directly
            const canvas = await html2canvas(tempContainer, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: true,
            });

            // Clean up
            document.body.removeChild(tempContainer);

            const outfitScreenshot = canvas.toDataURL('image/jpeg', 0.9);

            // DEBUG: Add screenshot preview node to canvas - position to the right of generation card
            const genCardWidth = 200; // GenerationCardNode width
            const debugShootScreenshotNode: Node = {
                id: `debug-shoot-screenshot-${Date.now()}`,
                type: 'resizableImage',
                position: {
                    x: modelCard.position.x + genCardWidth + 350, // Right of model card + gen card space
                    y: modelCard.position.y,
                },
                data: { imageUrl: outfitScreenshot },
                style: { width: wbWidth * 0.6, height: wbHeight * 0.6 },
            };
            setNodes((nds) => [...nds, debugShootScreenshotNode]);
            console.log('🔍 DEBUG: Shoot whiteboard screenshot added to canvas');

            // Debug logging
            console.log('📸 Screenshot captured:', {
                whiteboardId: shootingWhiteboardId,
                whiteboardBounds: { x: wb.position.x, y: wb.position.y, w: wbWidth, h: wbHeight },
                childNodesCount: childNodes.length,
                canvasSize: { w: canvas.width, h: canvas.height },
                dataLength: outfitScreenshot.length,
                modelImage: selectedShootModel.image,
                userPrompt: shootPrompt
            });

            // Call API
            const response = await fetch('/api/shoot-whiteboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    outfitScreenshot,
                    modelImage: selectedShootModel.image,
                    userPrompt: shootPrompt || undefined,
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Generation failed');
            }

            const result = await response.json();

            // Update GenerationCard with result
            setNodes((nds) => nds.map(n =>
                n.id === genCardId
                    ? { ...n, data: { status: 'success', imageUrl: `data:${result.mimeType};base64,${result.image}` } }
                    : n
            ));

            // Reset state
            setShootStep('idle');
            setShootingWhiteboardId(null);
            setSelectedShootModel(null);
            setShootPrompt('');

        } catch (error) {
            console.error('Shoot generation error:', error);

            // Update GenerationCard with error
            setNodes((nds) => nds.map(n =>
                n.id === genCardId
                    ? { ...n, data: { status: 'error', errorMessage: error instanceof Error ? error.message : 'Unknown error' } }
                    : n
            ));

            setShootStep('idle');
        }
    }, [shootingWhiteboardId, selectedShootModel, shootPrompt, nodes, setNodes, setEdges]);

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
        const randomModel = modelsData[Math.floor(Math.random() * modelsData.length)];
        const newNode: Node<ModelNodeData> = {
            id: `model-${Date.now()}`,
            type: 'modelNode',
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

        // Whiteboard sizing
        const whiteboardWidth = 420;


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
                            position: absolute; top: 2px; left: 2px; z-index: 9999;
                            background: rgba(220, 220, 220, 0.8); color: #000; font-weight: 600; font-size: 6px;
                            padding: 1px 3px; border-radius: 2px; line-height: 1; pointer-events: none;
                        `;
                        overlay.textContent = `${item.index}`;
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

            // Step 5: Start Generation Process Immediately
            setStylingStep('generating');

            // Step 5.1: Create whiteboards immediately (Loading State)
            const whiteboardWidth = 420;
            const whiteboardHeight = 300;
            const whiteboardGapX = 25;
            const whiteboardGapY = 25;
            const startX = Math.max(...nodes.map(n => n.position.x + (n.measured?.width || 0)), 0) + 100;
            const minY = Math.min(...nodes.map(n => n.position.y)) || 0;
            const maxPerColumn = 4;

            // Clean up old styling nodes (but keep debug screenshots)
            const cleanNodes = nodes.filter(n => !n.id.startsWith('styling-'));

            // Generate new whiteboards
            const newNodes: Node[] = [];
            const whiteboardIds: string[] = [];

            for (let i = 0; i < stylingOutfitCount; i++) {
                const wbId = `styling-wb-${Date.now()}-${i}`;
                whiteboardIds.push(wbId);
                const col = Math.floor(i / maxPerColumn);
                const row = i % maxPerColumn;

                newNodes.push({
                    id: wbId,
                    type: 'whiteboard',
                    position: {
                        x: startX + col * (whiteboardWidth + whiteboardGapX),
                        y: minY + row * (whiteboardHeight + whiteboardGapY),
                    },
                    data: { label: `Look ${i + 1}` },
                    style: { width: whiteboardWidth, height: whiteboardHeight },
                    draggable: false, // Lock during generation
                });
            }

            // DEBUG: Create screenshot preview node to show VLM input
            const debugScreenshotNode: Node = {
                id: `debug-styling-screenshot-${Date.now()}`,
                type: 'resizableImage',
                position: {
                    x: Math.min(...nodes.map(n => n.position.x)) - 350,
                    y: minY,
                },
                data: { imageUrl: screenshot },
                style: { width: 300, height: 200 },
            };
            console.log('🔍 DEBUG: Styling VLM screenshot added to canvas');

            // Add whiteboards AND debug screenshot to canvas
            setNodes([...cleanNodes, ...newNodes, debugScreenshotNode]);

            // Zoom to show new workspace
            setTimeout(() => {
                fitView({ padding: 0.2, duration: 800 });
            }, 100);

            // Step 5.2: Call API
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
                        if (retries > 0) {
                            console.log(`Retrying API call... (${retries} left)`);
                            return callApi(retries - 1);
                        }
                        errorMsg = `Raw error: ${text.slice(0, 100)}`;
                    }
                    throw new Error(errorMsg);
                }

                return response.json();
            };

            const result = await callApi();

            if (!result.outfits || result.outfits.length === 0) {
                throw new Error('No outfits generated');
            }

            // Debug: Log what VLM returned
            console.log('VLM Result:', JSON.stringify(result, null, 2));
            console.log('Available stylingItems:', stylingItems.map(i => ({ index: i.index, nodeId: i.nodeId })));

            // Step 6: Fill whiteboards with animated fly effect
            // Note: Whiteboards are already created in Step 5.1, we just fill them now.

            // Image sizing
            const imageWidth = 80;
            const imageHeight = 80;
            const cols = 2; // 2 columns for 2-row layout
            const gap = 10;
            const offsetY = 25;

            // Collect animation targets
            interface AnimTarget {
                sourceNodeId: string;
                targetWbId: string;
                imageUrl: string;
                targetX: number;
                targetY: number;
                delay: number;
                outfitIdx: number;
            }
            const animTargets: AnimTarget[] = [];
            const outfitReasons: Map<string, string> = new Map();

            result.outfits.forEach((outfit: { selectedIndices: number[]; reason: string }, outfitIdx: number) => {
                const wbId = whiteboardIds[outfitIdx];
                if (!wbId) return;

                outfitReasons.set(wbId, outfit.reason || '');
                console.log(`Outfit ${outfitIdx + 1} indices:`, outfit.selectedIndices);

                outfit.selectedIndices.forEach((idx, imgIdx) => {
                    const item = stylingItems.find(i => i.index === idx);
                    if (!item) {
                        console.warn(`Index ${idx} not found in stylingItems!`);
                        return;
                    }

                    const imgCol = imgIdx % cols;
                    const imgRow = Math.floor(imgIdx / cols);

                    animTargets.push({
                        sourceNodeId: item.nodeId,
                        targetWbId: wbId,
                        imageUrl: item.imageUrl,
                        targetX: 8 + imgCol * (imageWidth + gap),
                        targetY: offsetY + imgRow * (imageHeight + gap),
                        delay: outfitIdx * 400 + imgIdx * 200,
                        outfitIdx,
                    });
                });
            });

            // Create flying elements and animate
            const flyDuration = 800;
            const container = reactFlowWrapper.current;

            // Start typewriter effect
            whiteboardIds.forEach((wbId, outfitIdx) => {
                const wbEl = container?.querySelector(`[data-id="${wbId}"]`);
                const reason = outfitReasons.get(wbId) || '';

                if (wbEl && reason) {
                    const typeEl = document.createElement('div');
                    typeEl.style.cssText = `
                        position: absolute; bottom: 8px; left: 10px; right: 10px;
                        font-family: Georgia, serif; font-size: 11px; font-style: italic;
                        color: rgba(0,0,0,0.5); line-height: 1.4; max-height: 60px; overflow: hidden;
                    `;
                    typeEl.className = 'typewriter-text';
                    wbEl.appendChild(typeEl);

                    const startDelay = outfitIdx * 400 + 300;
                    let charIdx = 0;
                    setTimeout(() => {
                        const typeInterval = setInterval(() => {
                            if (charIdx <= reason.length) {
                                typeEl.textContent = reason.slice(0, charIdx) + (charIdx < reason.length ? '|' : '');
                                charIdx++;
                            } else {
                                typeEl.textContent = reason;
                                clearInterval(typeInterval);
                            }
                        }, 30);
                    }, startDelay);
                }
            });

            animTargets.forEach((target, i) => {
                const sourceEl = container?.querySelector(`[data-id="${target.sourceNodeId}"]`);
                const wbEl = container?.querySelector(`[data-id="${target.targetWbId}"]`);

                if (sourceEl && wbEl) {
                    const sourceRect = sourceEl.getBoundingClientRect();
                    const wbRect = wbEl.getBoundingClientRect();

                    const flyEl = document.createElement('div');
                    flyEl.style.cssText = `
                        position: fixed; width: ${imageWidth}px; height: ${imageHeight}px;
                        background: url(${target.imageUrl}) center/contain no-repeat white;
                        border-radius: 8px; box-shadow: 0 10px 40px rgba(140, 48, 232, 0.5);
                        z-index: 9999; pointer-events: none; left: ${sourceRect.left}px; top: ${sourceRect.top}px;
                        opacity: 0; transform: scale(0.5);
                        transition: all ${flyDuration}ms cubic-bezier(0.34, 1.56, 0.64, 1);
                    `;
                    document.body.appendChild(flyEl);

                    setTimeout(() => {
                        flyEl.style.opacity = '1';
                        flyEl.style.transform = 'scale(1)';
                        flyEl.style.left = `${wbRect.left + target.targetX}px`;
                        flyEl.style.top = `${wbRect.top + target.targetY}px`;
                    }, target.delay);

                    setTimeout(() => {
                        const newNode: Node = {
                            id: `styling-img-${Date.now()}-${i}`,
                            type: 'resizableImage',
                            position: { x: target.targetX, y: target.targetY },
                            data: { imageUrl: target.imageUrl },
                            parentId: target.targetWbId,
                            extent: 'parent' as const,
                            style: { width: imageWidth, height: imageHeight },
                        };
                        setNodes((nds) => [...nds, newNode]);
                        flyEl.remove();
                    }, target.delay + flyDuration);
                }
            });

            const maxDelay = Math.max(...animTargets.map(t => t.delay)) + flyDuration + 200;
            setTimeout(() => {
                fitView({ padding: 0.15, duration: 400 });
                setStylingStep('idle');
                setStylingItems([]);
                setStylingPrompt('');
            }, maxDelay);

        } catch (error) {
            console.error('Styling generation error:', error);
            alert(`Generating outfits failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

            // Rollback: Remove the empty whiteboards we just created
            /* 
               We need to remove the specific whiteboards we added. 
               Since we don't have the explicit IDs captured in this scope easily without refactoring,
               we can filter out nodes that match the ID pattern we just used or rely on cleanNodes logic next time.
               But better to clean up now.
            */
            setNodes((nds) => nds.filter(n => !n.id.startsWith('styling-wb-')));

            setStylingStep('config');
        }
    }, [stylingItems, nodes, stylingOutfitCount, stylingPrompt, fitView, setNodes]);




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

    // Capture initial position on drag start
    const handleNodeDragStart = useCallback((_event: React.MouseEvent, node: Node) => {
        if (node.type === 'canvasItem') {
            dragStartPosRef.current[node.id] = { ...node.position };
        }
    }, []);

    // Handle node drag stop - detect if dropped on whiteboard
    const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
        // Only process canvasItem nodes (thumbnails)
        if (node.type !== 'canvasItem') return;

        // Find whiteboards
        const whiteboards = nodes.filter(n => n.type === 'whiteboard');

        let droppedOnWhiteboard = false;

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
                droppedOnWhiteboard = true;

                // Convert to resizable image inside whiteboard (COPY)
                const imageData = node.data as CanvasItemData;

                // 1. Create NEW node in whiteboard
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

                // 2. Reset the dragged node to its original position (Snap back)
                const startPos = dragStartPosRef.current[node.id];

                setNodes((nds) => {
                    // Update the dragged node's position back to start
                    const resetNodes = nds.map(n => {
                        if (n.id === node.id && startPos) {
                            return { ...n, position: { ...startPos } };
                        }
                        return n;
                    });

                    return [...resetNodes, newNode];
                });

                break;
            }
        }

        // Clean up ref if needed, or leave it for next drag
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
                    onNodeDragStart={handleNodeDragStart}
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

            {/* Screenshot Preview Modal */}


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

            {/* Styling Generation Indicator - Non-blocking, appears on canvas */}
            {stylingStep === 'generating' && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                    <style>
                        {`
                            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&display=swap');
                            
                            @keyframes stylingPulse {
                                0%, 100% { 
                                    opacity: 0.8; 
                                    letter-spacing: 0.3em;
                                    text-shadow: 0 0 20px rgba(140, 48, 232, 0.3);
                                }
                                50% { 
                                    opacity: 1; 
                                    letter-spacing: 0.5em;
                                    text-shadow: 0 0 40px rgba(140, 48, 232, 0.6), 0 0 80px rgba(140, 48, 232, 0.3);
                                }
                            }
                            
                            @keyframes dotPulse {
                                0%, 20% { opacity: 0; }
                                40% { opacity: 1; }
                                100% { opacity: 1; }
                            }
                            
                            @keyframes fadeSlideIn {
                                0% { 
                                    opacity: 0; 
                                    transform: translateY(20px);
                                }
                                100% { 
                                    opacity: 1; 
                                    transform: translateY(0);
                                }
                            }
                            
                            .styling-indicator {
                                font-family: 'Playfair Display', Georgia, serif;
                                animation: fadeSlideIn 0.6s ease-out forwards, stylingPulse 2.5s ease-in-out infinite;
                            }
                            
                            .styling-dot:nth-child(1) { animation: dotPulse 1.4s infinite 0s; }
                            .styling-dot:nth-child(2) { animation: dotPulse 1.4s infinite 0.2s; }
                            .styling-dot:nth-child(3) { animation: dotPulse 1.4s infinite 0.4s; }
                        `}
                    </style>
                    <div className="flex flex-col items-center gap-3">
                        <div
                            className="styling-indicator text-3xl md:text-4xl font-semibold tracking-[0.3em] bg-gradient-to-r from-purple-300 via-primary to-pink-300 bg-clip-text text-transparent select-none"
                        >
                            STYLING
                            <span className="inline-flex ml-1">
                                <span className="styling-dot">.</span>
                                <span className="styling-dot">.</span>
                                <span className="styling-dot">.</span>
                            </span>
                        </div>
                        <div className="text-white/40 text-xs font-light tracking-widest uppercase">
                            Creating your looks
                        </div>
                    </div>
                </div>
            )}
            {/* Shoot Prompt Input Modal */}
            {shootStep === 'inputPrompt' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card-dark border border-border-dark rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">📸</span>
                                <h3 className="text-lg font-bold text-white">Shoot Settings</h3>
                            </div>
                            <button
                                onClick={() => { setShootStep('selectModel'); setShootPrompt(''); }}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-text-muted" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-green-400">✓</span>
                                    <span className="text-white/80 text-sm">Model Selected</span>
                                </div>
                                {selectedShootModel && (
                                    <img src={selectedShootModel.image} alt="" className="w-12 h-16 object-cover rounded-lg" />
                                )}
                            </div>

                            <div>
                                <label className="block text-sm text-text-muted mb-2">Additional Requirements (optional)</label>
                                <textarea
                                    value={shootPrompt}
                                    onChange={(e) => setShootPrompt(e.target.value)}
                                    placeholder="e.g., outdoor setting, walking pose, warm lighting..."
                                    className="w-full bg-background-dark border border-border-dark rounded-lg px-4 py-3 text-white outline-none focus:border-primary resize-none h-24"
                                />
                            </div>

                            <button
                                onClick={executeShoot}
                                className="w-full py-3 bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                            >
                                <span>🚀</span>
                                Generate Look
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Model Selector Modal (Unified) */}
            <ModelSelectorModal
                isOpen={isModelSelectorOpen}
                onClose={() => { setIsModelSelectorOpen(false); setEditingModelNodeId(null); }}
                models={modelsData}
                selectedModelId={editingModelNodeId ? nodes.find(n => n.id === editingModelNodeId)?.data?.modelId as string : undefined}
                onSelect={handleSelectModel}
                title="Select Model"
            />

            {/* Shoot Model Picker Modal (Unified) */}
            <ModelSelectorModal
                isOpen={shootModelPickerOpen}
                onClose={() => { setShootModelPickerOpen(false); setEditingModelCardId(null); }}
                models={modelsData}
                selectedModelId={selectedShootModel?.id}
                onSelect={handleShootModelSelect}
                title="Choose Your Model"
            />

            {/* Image Lightbox Modal */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer"
                    onClick={() => setLightboxImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                        onClick={() => setLightboxImage(null)}
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                    <img
                        src={lightboxImage}
                        alt="Preview"
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
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
