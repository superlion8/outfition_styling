import React from 'react';
import { Home, Palette, Settings, Sparkles } from 'lucide-react';

type NavItem = 'home' | 'canvas' | 'settings';

interface GlobalSidebarProps {
    activeItem: NavItem;
    onNavigate: (item: NavItem) => void;
}

export const GlobalSidebar: React.FC<GlobalSidebarProps> = ({ activeItem, onNavigate }) => {
    const navItems: { id: NavItem; icon: React.ElementType; label: string }[] = [
        { id: 'home', icon: Home, label: 'Home' },
        { id: 'canvas', icon: Palette, label: 'Canvas' },
        { id: 'settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <aside className="fixed left-0 top-0 h-screen w-16 bg-card-dark border-r border-border-dark flex flex-col items-center py-4 z-40">
            {/* Logo */}
            <div className="mb-8 p-2">
                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 flex flex-col gap-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeItem === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`
                w-12 h-12 rounded-xl flex items-center justify-center transition-all
                group relative
                ${isActive
                                    ? 'bg-primary text-background-dark shadow-[0_0_20px_rgba(249,220,141,0.3)]'
                                    : 'text-text-muted hover:bg-white/5 hover:text-white'
                                }
              `}
                            title={item.label}
                        >
                            <Icon className="w-5 h-5" />

                            {/* Tooltip */}
                            <span className="absolute left-full ml-3 px-2 py-1 bg-card-dark border border-border-dark rounded-lg text-xs text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </nav>

            {/* Bottom decorative element */}
            <div className="mt-auto pt-4 border-t border-border-dark w-10">
                <div className="w-2 h-2 bg-green-500 rounded-full mx-auto" title="Connected" />
            </div>
        </aside>
    );
};
