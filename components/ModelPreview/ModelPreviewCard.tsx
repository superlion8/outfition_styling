import React from 'react';

// ========== Shared Model Preview Card Component ==========
// 基于 5271e53 版本的样式
export interface ModelPreviewCardProps {
    imageUrl: string;
    isSelected?: boolean;
    showBadge?: boolean;
    showCustomizeButton?: boolean;
    onCustomize?: () => void;
    onClick?: () => void;
    size?: 'small' | 'medium' | 'large';
    height?: number; // Explicit height in px, width calculated from 9:16 ratio
}

export const ModelPreviewCard: React.FC<ModelPreviewCardProps> = ({
    imageUrl,
    isSelected = false,
    showBadge = true,
    showCustomizeButton = true,
    onCustomize,
    onClick,
    size = 'medium',
    height
}) => {
    const sizeStyles: Record<string, { width: number; height: number }> = {
        small: { width: 70, height: 124 },
        medium: { width: 100, height: 178 },
        large: { width: 180, height: 320 }
    };

    // If height is provided, calculate width from 9:16 aspect ratio
    const style: React.CSSProperties = height
        ? { height, width: height * 9 / 16 }
        : sizeStyles[size];

    // 5271e53 版本的结构：无内边距，图片直接填满
    return (
        <div
            className={`relative bg-card-dark rounded-xl overflow-hidden border-2 transition-all duration-200 shadow-2xl cursor-pointer ${
                isSelected ? 'border-primary ring-4 ring-primary/30' : 'border-border-dark'
            }`}
            style={style}
            onClick={onClick}
        >
            {/* Header Badge - 左上角 */}
            {showBadge && (
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10">
                    <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-white text-[10px] font-bold">Model Preview</span>
                </div>
            )}

            {/* Model Image - 直接填满容器 */}
            <div
                className="w-full h-full bg-cover bg-center bg-no-repeat"
                style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
            >
                {!imageUrl && (
                    <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
                        <span className="text-white/20 text-xs text-center px-4">No Image Available</span>
                    </div>
                )}
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {/* Customize Button - 悬浮在底部中间 */}
                {showCustomizeButton && onCustomize && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onCustomize(); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 rounded-lg text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer"
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
