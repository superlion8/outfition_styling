import React from 'react';

// ========== Shared Model Preview Card Component ==========
export interface ModelPreviewCardProps {
    imageUrl: string;
    isSelected?: boolean;
    showBadge?: boolean;
    showCustomizeButton?: boolean;
    onCustomize?: () => void;
    onClick?: () => void;
    size?: 'small' | 'medium' | 'large';
    height?: number; // Explicit height in px, width calculated from 9:16 ratio
    variant?: 'default' | 'full';
}

export const ModelPreviewCard: React.FC<ModelPreviewCardProps> = ({
    imageUrl,
    isSelected = false,
    showBadge = true,
    showCustomizeButton = true,
    onCustomize,
    onClick,
    size = 'medium',
    height,
    variant = 'default'
}) => {
    const sizeClasses = {
        small: 'w-[70px]',
        medium: 'w-[100px]',
        large: 'w-[140px]',
        full: '' // 由 height 属性控制
    };

    // If height is provided, calculate width from 9:16 aspect ratio
    const style: React.CSSProperties = height
        ? { height, width: height * 9 / 16 }
        : { aspectRatio: '9/16' };

    // full 尺寸使用不同的样式（参考设计稿）
    const isFullSize = variant === 'full' || !!height;
    const borderClass = isFullSize
        ? 'border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
        : isSelected
            ? 'border-amber-400/80 ring-2 ring-amber-400/30'
            : 'border-white/10 hover:border-white/20';

    return (
        <div
            className={`relative ${height ? '' : sizeClasses[size]} rounded-2xl overflow-hidden transition-all cursor-pointer border flex flex-col bg-card-dark ${borderClass}`}
            style={style}
            onClick={onClick}
        >
            {/* Model Image */}
            <div className="flex-1 relative">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt="Model"
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
                        <span className="text-white/20 text-xs text-center px-4">No Image Available</span>
                    </div>
                )}

                {/* Floating "Model Preview" badge */}
                {showBadge && (
                    <div className={`absolute top-3 left-3 z-10 flex items-center bg-black/50 backdrop-blur-sm rounded-full border border-white/10 ${isFullSize ? 'px-3 py-1.5 gap-2' : 'px-2.5 py-1 gap-1.5'}`}>
                        <svg className={`${isFullSize ? 'w-4 h-4' : 'w-3 h-3'} text-amber-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className={`text-white font-bold tracking-wide ${isFullSize ? 'text-sm' : 'text-[10px]'}`}>Model Preview</span>
                    </div>
                )}
            </div>

            {/* Customize Avatar Button - 底部栏样式 */}
            {showCustomizeButton && onCustomize && (
                <button
                    onClick={(e) => { e.stopPropagation(); onCustomize(); }}
                    className={`w-full bg-black/50 backdrop-blur-md text-white font-bold transition-all flex items-center justify-center gap-2 hover:bg-black/70 ${isFullSize ? 'py-4' : 'py-2'}`}
                >
                    <svg className={`${isFullSize ? 'w-5 h-5' : 'w-3.5 h-3.5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className={isFullSize ? 'text-base' : 'text-xs'}>Customize Avatar</span>
                </button>
            )}
        </div>
    );
};
