import React, { useEffect, useState } from 'react';
import { Sparkles, X, Check, Shirt, Ruler, ShoppingBag, Watch } from 'lucide-react';

interface LoadingOverlayProps {
  onCancel: () => void;
  onComplete: () => void;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ onCancel, onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 500); // Slight delay before switching
          return 100;
        }
        // Random increment for realistic feel
        return prev + Math.floor(Math.random() * 3) + 1;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col max-w-[800px] w-full px-6">
        
        {/* Central Processing Modal */}
        <div className="glass-panel rounded-xl p-8 shadow-2xl relative overflow-hidden">
          {/* Scanning Effect Animation */}
          <div className="absolute top-0 left-0 w-full opacity-50 pointer-events-none">
             <div className="scan-line animate-scan"></div>
          </div>

          <header className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-3 mb-6 rounded-full bg-primary/20 border border-primary/30">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h1 className="text-white tracking-tight text-[32px] font-bold leading-tight px-4 text-center mb-2">
              AI Stylist is Curating...
            </h1>
            <p className="text-text-muted text-base font-normal">Our vision model is analyzing your unique pieces for the perfect match.</p>
          </header>

          {/* Progress Bar Section */}
          <div className="flex flex-col gap-4 mb-12">
            <div className="flex gap-6 justify-between items-end">
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-widest text-primary font-bold">Current Operation</span>
                <p className="text-white text-lg font-medium leading-normal">
                  {progress < 30 ? 'Analyzing color palettes...' : progress < 70 ? 'Matching textures and silhouettes...' : 'Generating final high-fidelity previews...'}
                </p>
              </div>
              <p className="text-white text-2xl font-bold leading-none">{progress}%</p>
            </div>
            <div className="rounded-full bg-white/5 h-3 overflow-hidden border border-white/10">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary shadow-[0_0_10px_#8c30e8] transition-all duration-100 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-text-muted text-sm font-normal">Processing item {Math.min(Math.ceil((progress / 100) * 18), 18)} of 18</p>
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-primary animate-bounce"></div>
                <div className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
              </div>
            </div>
          </div>

          {/* Quadrant Status Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {/* Tops - Completed */}
            <div className={`flex flex-col gap-4 rounded-lg border p-4 relative overflow-hidden transition-all duration-500 ${progress > 25 ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 opacity-50'}`}>
               {progress > 25 && (
                  <div className="absolute top-0 right-0 p-2 opacity-50">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
               )}
              <div className="text-white">
                <Shirt className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-white text-sm font-bold leading-tight">Tops</h2>
                <p className={`${progress > 25 ? 'text-primary' : 'text-text-muted'} text-xs font-semibold uppercase tracking-tighter`}>
                   {progress > 25 ? 'Completed' : 'Queued'}
                </p>
              </div>
            </div>

            {/* Bottoms - Active */}
            <div className={`flex flex-col gap-4 rounded-lg border p-4 relative overflow-hidden transition-all duration-500 ${progress > 25 && progress < 60 ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/50' : progress >= 60 ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 opacity-50'}`}>
              {progress > 25 && progress < 60 && <div className="absolute inset-0 bg-primary/10 animate-pulse"></div>}
               {progress >= 60 && (
                  <div className="absolute top-0 right-0 p-2 opacity-50">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
               )}
              <div className="relative z-10 text-white">
                <Ruler className="w-6 h-6" />
              </div>
              <div className="relative z-10 flex flex-col gap-1">
                <h2 className="text-white text-sm font-bold leading-tight">Bottoms</h2>
                <p className={`${progress > 25 && progress < 60 ? 'text-white' : progress >= 60 ? 'text-primary' : 'text-text-muted'} text-xs font-normal`}>
                    {progress > 25 && progress < 60 ? 'Scanning...' : progress >= 60 ? 'Completed' : 'Queued'}
                </p>
              </div>
            </div>

            {/* One-Piece */}
            <div className={`flex flex-col gap-4 rounded-lg border p-4 relative overflow-hidden transition-all duration-500 ${progress > 60 && progress < 85 ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/50' : progress >= 85 ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 opacity-50'}`}>
              {progress > 60 && progress < 85 && <div className="absolute inset-0 bg-primary/10 animate-pulse"></div>}
               {progress >= 85 && (
                  <div className="absolute top-0 right-0 p-2 opacity-50">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
               )}
              <div className="text-white relative z-10">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1 relative z-10">
                <h2 className="text-white text-sm font-bold leading-tight">One-Piece</h2>
                <p className="text-text-muted text-xs font-normal">
                   {progress > 60 && progress < 85 ? 'Scanning...' : progress >= 85 ? 'Completed' : 'Queued'}
                </p>
              </div>
            </div>

            {/* Accessories */}
             <div className={`flex flex-col gap-4 rounded-lg border p-4 relative overflow-hidden transition-all duration-500 ${progress > 85 && progress < 99 ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/50' : progress >= 99 ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 opacity-50'}`}>
              <div className="text-white relative z-10">
                <Watch className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1 relative z-10">
                <h2 className="text-white text-sm font-bold leading-tight">Accessories</h2>
                <p className="text-text-muted text-xs font-normal">
                    {progress > 85 ? 'Scanning...' : 'Queued'}
                </p>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="flex justify-center border-t border-white/10 pt-8">
            <button 
                onClick={onCancel}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/20 hover:bg-white/5 transition-all text-text-muted hover:text-white text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Cancel Generation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};