import React, { useMemo, useState } from 'react';
import { User, Filter, X, Check } from 'lucide-react';
import { ModelPreviewCard } from './ModelPreviewCard';

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
}

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
    isOpen,
    onClose,
    models,
    selectedModelId,
    onSelect,
    title = "Select Model"
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
            <div className="bg-card-dark border border-border-dark rounded-2xl w-full max-w-[95vw] xl:max-w-[1400px] p-6 shadow-2xl h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-primary-500" />
                        <h3 className="text-xl font-bold text-white">{title}</h3>
                        <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full">{filteredModels.length} models</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-white/40" />
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white/5 rounded-xl border border-white/5 shrink-0">
                    <div className="flex items-center gap-2 text-white/40 text-sm border-r border-white/10 pr-4">
                        <Filter className="w-4 h-4" />
                        <span>Filters:</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-white/40 uppercase tracking-wider font-bold">Ethnicity</span>
                            <select
                                value={ethnicityFilter}
                                onChange={(e) => setEthnicityFilter(e.target.value)}
                                className="bg-card-dark border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary-500 transition-colors"
                            >
                                {ethnicityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-white/40 uppercase tracking-wider font-bold">Gender</span>
                            <select
                                value={genderFilter}
                                onChange={(e) => setGenderFilter(e.target.value)}
                                className="bg-card-dark border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary-500 transition-colors"
                            >
                                {genderOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-4 pb-6">
                        {filteredModels.map((model) => (
                            <ModelPreviewCard
                                key={model._id}
                                imageUrl={model.image}
                                isSelected={selectedModelId === model.model_id}
                                showBadge={false}
                                showCustomizeButton={false}
                                onClick={() => onSelect(model)}
                                size="small"
                            />
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
