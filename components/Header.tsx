import React from 'react';
import { MOCK_IMAGES } from '../constants';
import { LayoutGrid } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-border-dark px-6 md:px-10 py-4 bg-background-light dark:bg-background-dark sticky top-0 z-50">
      <div className="flex items-center gap-4 text-white">
        <div className="size-8 text-primary">
            <LayoutGrid className="w-full h-full" />
        </div>
        <h2 className="text-white text-xl font-bold leading-tight tracking-[-0.015em]">FashionAI Canvas</h2>
      </div>
      <div className="flex flex-1 justify-end gap-8 items-center">
        <nav className="hidden md:flex items-center gap-9">
          <a className="text-white/70 hover:text-white text-sm font-medium transition-colors" href="#">My Wardrobe</a>
          <a className="text-white/70 hover:text-white text-sm font-medium transition-colors" href="#">Generated Looks</a>
          <a className="text-white/70 hover:text-white text-sm font-medium transition-colors" href="#">Tutorials</a>
        </nav>
        <div className="hidden md:block h-6 w-px bg-border-dark"></div>
        <button className="hidden md:flex min-w-[84px] cursor-pointer items-center justify-center rounded-lg h-10 px-5 bg-primary hover:bg-primary-hover text-background-dark text-sm font-bold transition-all">
          <span>Sign Out</span>
        </button>
        <div 
          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border border-border-dark" 
          style={{backgroundImage: `url("${MOCK_IMAGES.AVATAR}")`}}
        />
      </div>
    </header>
  );
};