import React, { useMemo, useState } from 'react';
import { User, Filter, X, Check, ZoomIn } from 'lucide-react';

export interface Model {
    _id: string;
    model_id: string;
    image: string;
    model_ethnicity: string;
    model_gender: string;
}

interface ModelSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    models: Model[];
    selectedModelId?: string;
    onSelect: (model: Model) => void;
    title?: string;
    onPreviewImage?: (image: string) => void;
}

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
    isOpen,
    onClose,
    models,
    selectedModelId,
    onSelect,
    title = "Select Model",
    onPreviewImage
}) => {
    const [ethnicityFilter, setEthnicityFilter] = useState('All');
    const [genderFilter, setGenderFilter] = useState('All');

    const ethnicityOptions = useMemo(() => {
        const ethnicities = new Set(models.map(m => m.model_ethnicity));
        return ['All', ...Array.from(ethnicities)].sort();
    }, [models]);

    const genderOptions = useMemo(() => {
        const genders = new Set(models.map(m => m.model_gender));
        return ['All', ...Array.from(genders)].sort();
    }, [models]);

    const filteredModels = useMemo(() => {
        return models.filter(model => {
            const matchEthnicity = ethnicityFilter === 'All' || model.model_ethnicity === ethnicityFilter;
            const matchGender = genderFilter === 'All' || model.model_gender === genderFilter;
            return matchEthnicity && matchGender;
        });
    }, [models, ethnicityFilter, genderFilter]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-card-dark border border-border-dark rounded-2xl w-full max-w-[95vw] xl:max-w-[1600px] p-6 relative shadow-2xl h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <User className="w-6 h-6 text-primary" />
                        <h3 className="text-xl font-bold text-white">{title}</h3>
                        <span className="text-xs text-text-muted bg-white/5 px-2 py-1 rounded-full">{filteredModels.length} models</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-text-muted" />
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white/5 rounded-xl border border-white/5 shrink-0">
                    <div className="flex items-center gap-2 text-text-muted text-sm border-r border-white/10 pr-4">
                        <Filter className="w-4 h-4" />
                        <span>Filters:</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted uppercase tracking-wider font-bold">Ethnicity</span>
                        <select
                            value={ethnicityFilter}
                            onChange={(e) => setEthnicityFilter(e.target.value)}
                            className="bg-card-dark border border-border-dark text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary"
                        >
                            {ethnicityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted uppercase tracking-wider font-bold">Gender</span>
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
                <div className="flex-1 overflow-y-auto min-h-0 -mr-2 pr-2 custom-scrollbar">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4 pb-6">
                        {filteredModels.map((model) => (
                            <div
                                key={model._id}
                                className={`relative aspect-[9/16] rounded-xl overflow-hidden group border-2 transition-all cursor-pointer ${selectedModelId === model.model_id ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-primary/50'}`}
                                onClick={() => onSelect(model)}
                            >
                                <img loading="lazy" src={model.image} alt={model.model_id} className="w-full h-full object-cover" />

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {/* Zoom Button - Top Left */}
                                    {onPreviewImage && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onPreviewImage(model.image);
                                            }}
                                            className="absolute top-2 left-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-colors"
                                            title="点击放大"
                                        >
                                            <ZoomIn className="w-4 h-4" />
                                        </button>
                                    )}

                                    {/* Model Info - Bottom */}
                                    <div className="absolute bottom-0 left-0 right-0 p-2 flex flex-col">
                                        <span className="text-white font-bold text-xs truncate">{model.model_id}</span>
                                        <span className="text-white/60 text-[10px] truncate">{model.model_ethnicity}</span>
                                    </div>
                                </div>

                                {/* Selected Check Mark */}
                                {selectedModelId === model.model_id && (
                                    <div className="absolute top-2 right-2 bg-primary text-black rounded-full p-1">
                                        <Check className="w-3 h-3" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
};
