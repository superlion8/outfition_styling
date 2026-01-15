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
import { Plus, Move, Hand, ZoomIn, ZoomOut, Maximize2, Trash2, Download, Sparkles } from 'lucide-react';
import { WardrobeItem } from '../types';

// Custom Node for Clothing Items
interface ClothingNodeData {
    imageUrl: string;
    label: string;
    category: string;
    id: string;
    [key: string]: unknown; // Index signature for @xyflow/react compatibility
}

const ClothingNode: React.FC<NodeProps<Node<ClothingNodeData>>> = ({ data, selected }) => {
    return (
        <div
            className={`
        relative bg-card-dark rounded-xl overflow-hidden border-2 transition-all duration-200 shadow-lg
        ${selected ? 'border-primary ring-4 ring-primary/20 scale-105' : 'border-border-dark hover:border-primary/50'}
      `}
            style={{ width: 120, height: 160 }}
        >
            <img
                src={data.imageUrl}
                alt={data.label}
                className="w-full h-full object-cover"
                draggable={false}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <span className="text-white text-xs font-medium truncate block">{data.label}</span>
            </div>
            {/* Resize Handle Visual */}
            <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-white/40 rounded-br opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
};

const nodeTypes = {
    clothing: ClothingNode,
};

interface InfiniteCanvasProps {
    items: WardrobeItem[];
    onExportForAI?: (imageDataUrl: string) => void;
}

const InfiniteCanvasInner: React.FC<InfiniteCanvasProps> = ({ items, onExportForAI }) => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { fitView, zoomIn, zoomOut, getNodes, deleteElements } = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNodes, setSelectedNodes] = useState<string[]>([]);

    // Add item to canvas
    const handleAddItem = useCallback((item: WardrobeItem) => {
        const newNode: Node<ClothingNodeData> = {
            id: `${item.id}-${Date.now()}`,
            type: 'clothing',
            position: {
                x: Math.random() * 400 + 100,
                y: Math.random() * 300 + 100,
            },
            data: {
                imageUrl: item.imageUrl,
                label: item.name || `${item.category} #${item.order_index}`,
                category: item.category,
                id: item.id,
            },
        };
        setNodes((nds) => [...nds, newNode]);
    }, [setNodes]);

    // Delete selected nodes
    const handleDeleteSelected = useCallback(() => {
        const nodesToDelete = nodes.filter(n => selectedNodes.includes(n.id));
        deleteElements({ nodes: nodesToDelete });
        setSelectedNodes([]);
    }, [nodes, selectedNodes, deleteElements]);

    // Clear canvas
    const handleClearCanvas = useCallback(() => {
        setNodes([]);
        setEdges([]);
        setSelectedNodes([]);
    }, [setNodes, setEdges]);

    // Track selection
    const onSelectionChange = useCallback(({ nodes: selectedNds }: { nodes: Node[] }) => {
        setSelectedNodes(selectedNds.map(n => n.id));
    }, []);

    // Export canvas as image (for AI)
    const handleExportForAI = useCallback(async () => {
        // This would capture the canvas - for now we use html2canvas
        if (reactFlowWrapper.current && onExportForAI) {
            try {
                const html2canvas = (await import('html2canvas')).default;
                const canvas = await html2canvas(reactFlowWrapper.current, {
                    backgroundColor: '#1a1625',
                    scale: 2,
                });
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                onExportForAI(dataUrl);
            } catch (e) {
                console.error('Failed to export canvas:', e);
            }
        }
    }, [onExportForAI]);

    // Group items by category
    const categorizedItems = useMemo(() => {
        const grouped: Record<string, WardrobeItem[]> = {};
        items.forEach(item => {
            if (!grouped[item.category]) grouped[item.category] = [];
            grouped[item.category].push(item);
        });
        return grouped;
    }, [items]);

    return (
        <div className="flex h-full gap-4">
            {/* Sidebar: Item Palette */}
            <div className="w-64 shrink-0 bg-card-dark rounded-xl border border-border-dark p-4 flex flex-col gap-4 overflow-hidden">
                <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold text-sm">Wardrobe</h3>
                    <span className="text-xs text-text-muted">{items.length} items</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    {Object.entries(categorizedItems).map(([category, categoryItems]) => (
                        <div key={category}>
                            <h4 className="text-xs text-text-muted uppercase tracking-wider mb-2 font-bold">{category}</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {categoryItems.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleAddItem(item)}
                                        className="relative aspect-square rounded-lg bg-cover bg-center border border-border-dark overflow-hidden group hover:border-primary/50 transition-all"
                                        style={{ backgroundImage: `url('${item.imageUrl}')` }}
                                        title="Click to add to canvas"
                                    >
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Plus className="w-5 h-5 text-white" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}

                    {items.length === 0 && (
                        <div className="text-center py-8 text-text-muted text-sm">
                            No items in wardrobe.<br />Upload some clothes first!
                        </div>
                    )}
                </div>
            </div>

            {/* Main Canvas */}
            <div ref={reactFlowWrapper} className="flex-1 bg-background-dark rounded-xl border border-border-dark overflow-hidden relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onSelectionChange={onSelectionChange}
                    nodeTypes={nodeTypes}
                    fitView
                    panOnScroll
                    selectionOnDrag
                    panOnDrag={[1, 2]} // Middle/right click to pan
                    selectNodesOnDrag={false}
                    className="bg-transparent"
                    proOptions={{ hideAttribution: true }}
                    minZoom={0.1}
                    maxZoom={4}
                >
                    <Background color="#3d3448" gap={24} size={1} />
                    <Controls
                        showInteractive={false}
                        className="!bg-card-dark !border-border-dark !rounded-lg overflow-hidden [&>button]:!bg-card-dark [&>button]:!border-border-dark [&>button]:!text-white [&>button:hover]:!bg-white/10"
                    />
                    <MiniMap
                        nodeColor="#8c30e8"
                        maskColor="rgba(0,0,0,0.7)"
                        className="!bg-card-dark !border-border-dark !rounded-lg"
                    />

                    {/* Top Toolbar */}
                    <Panel position="top-center" className="flex items-center gap-2">
                        <div className="bg-card-dark/90 backdrop-blur-md border border-border-dark rounded-xl p-2 flex items-center gap-1">
                            <button
                                onClick={() => fitView({ duration: 300 })}
                                className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors"
                                title="Fit View"
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                            <div className="w-px h-6 bg-border-dark" />
                            <button
                                onClick={() => zoomIn({ duration: 200 })}
                                className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors"
                                title="Zoom In"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => zoomOut({ duration: 200 })}
                                className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors"
                                title="Zoom Out"
                            >
                                <ZoomOut className="w-4 h-4" />
                            </button>
                            <div className="w-px h-6 bg-border-dark" />
                            <button
                                onClick={handleDeleteSelected}
                                disabled={selectedNodes.length === 0}
                                className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Delete Selected"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleClearCanvas}
                                disabled={nodes.length === 0}
                                className="p-2 hover:bg-white/10 rounded-lg text-red-400 hover:text-red-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Clear Canvas"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </Panel>

                    {/* AI Export Button */}
                    {onExportForAI && nodes.length > 0 && (
                        <Panel position="bottom-center">
                            <button
                                onClick={handleExportForAI}
                                className="bg-primary hover:bg-primary-hover text-background-dark font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all transform hover:scale-105 shadow-lg"
                            >
                                <Sparkles className="w-5 h-5" />
                                Generate AI Styling
                            </button>
                        </Panel>
                    )}

                    {/* Empty State */}
                    {nodes.length === 0 && (
                        <Panel position="top-left" className="!left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2">
                            <div className="text-center text-text-muted">
                                <Hand className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <p className="text-lg font-medium text-white/60">Canvas is empty</p>
                                <p className="text-sm mt-1">Click items from the sidebar to add them</p>
                            </div>
                        </Panel>
                    )}
                </ReactFlow>
            </div>
        </div>
    );
};

// Wrapper with Provider
export const InfiniteCanvas: React.FC<InfiniteCanvasProps> = (props) => {
    return (
        <ReactFlowProvider>
            <InfiniteCanvasInner {...props} />
        </ReactFlowProvider>
    );
};
