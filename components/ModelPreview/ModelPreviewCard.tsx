import React from 'react';

// ========== Shared Model Preview Card Component ==========
// Matches the design in StylingResults.tsx for consistency
export interface ModelPreviewCardProps {
    imageUrl: string;
    isSelected?: boolean;
    showBadge?: boolean;
    showCustomizeButton?: boolean;
    onCustomize?: () => void;
    onClick?: () => void;
    size?: 'small' | 'medium' | 'large';
}

export const ModelPreviewCard: React.FC<ModelPreviewCardProps> = ({
    imageUrl,
    isSelected = false,
    showBadge = true,
    showCustomizeButton = true,
    onCustomize,
    onClick,
    size = 'medium'
}) => {
    const sizeClasses = {
        small: 'w-[140px]',
        medium: 'w-[200px]',
        large: 'w-[280px]'
    };

    return (
        <div
            className={`relative ${sizeClasses[size]} rounded-xl overflow-hidden transition-all cursor-pointer hover:scale-[1.02] border ${isSelected
                ? 'border-amber-400/80 ring-2 ring-amber-400/30'
                : 'border-white/10 hover:border-white/20'
                }`}
            style={{ aspectRatio: '9/16' }}
            onClick={onClick}
        >
            {/* Background Image - Absolute fill */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat relative"
                style={{ backgroundImage: `url(${imageUrl})` }}
            >
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Floating "Model Preview" badge */}
                {showBadge && (
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
                        <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-white text-[10px] font-bold tracking-wide">Model Preview</span>
                    </div>
                )}

                {/* Customize Avatar Button */}
                {showCustomizeButton && onCustomize && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onCustomize(); }}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-lg text-white text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Customize Avatar</span>
                    </button>
                )}
            </div>
        </div>
    );
};
