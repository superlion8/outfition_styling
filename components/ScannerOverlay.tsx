import React, { useState, useEffect, useRef } from 'react';
import { Scan, Check, X, Move } from 'lucide-react';

interface ScannerOverlayProps {
  onConfirm: (prompt?: string) => Promise<void> | void;
  onCancel: () => void;
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({ onConfirm, onCancel }) => {
  // Prompt input state
  const [step, setStep] = useState<'scan' | 'prompt'>('scan');
  const [userPrompt, setUserPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Initial box state (centered, rough size)
  const [box, setBox] = useState({ x: 10, y: 10, w: 80, h: 80 }); // Percentages
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialBox, setInitialBox] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [dragMode, setDragMode] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | null>(null);

  const handleMouseDown = (e: React.MouseEvent, mode: 'move' | 'nw' | 'ne' | 'sw' | 'se') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialBox(box);
    setDragMode(mode);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current || !dragMode) return;

      const container = containerRef.current.getBoundingClientRect();
      const deltaX = ((e.clientX - dragStart.x) / container.width) * 100;
      const deltaY = ((e.clientY - dragStart.y) / container.height) * 100;

      let newBox = { ...initialBox };

      if (dragMode === 'move') {
        newBox.x = Math.max(0, Math.min(100 - newBox.w, initialBox.x + deltaX));
        newBox.y = Math.max(0, Math.min(100 - newBox.h, initialBox.y + deltaY));
      } else {
        // Resizing logic
        if (dragMode.includes('n')) {
          const newY = Math.max(0, Math.min(initialBox.y + initialBox.h - 10, initialBox.y + deltaY));
          newBox.h = initialBox.y + initialBox.h - newY;
          newBox.y = newY;
        }
        if (dragMode.includes('s')) {
          newBox.h = Math.max(10, Math.min(100 - initialBox.y, initialBox.h + deltaY));
        }
        if (dragMode.includes('w')) {
          const newX = Math.max(0, Math.min(initialBox.x + initialBox.w - 10, initialBox.x + deltaX));
          newBox.w = initialBox.x + initialBox.w - newX;
          newBox.x = newX;
        }
        if (dragMode.includes('e')) {
          newBox.w = Math.max(10, Math.min(100 - initialBox.x, initialBox.w + deltaX));
        }
      }

      setBox(newBox);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragMode(null);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, initialBox, dragMode]);

  const handleConfirmArea = () => {
    setStep('prompt');
  };

  const handleFinalConfirm = async () => {
    setIsProcessing(true);
    await onConfirm(userPrompt);
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 flex flex-col cursor-crosshair">
      {/* Darkened Background using box-shadow on the crop box */}

      <div
        className="absolute transition-all duration-75 ease-out"
        style={{
          left: `${box.x}%`,
          top: `${box.y}%`,
          width: `${box.w}%`,
          height: `${box.h}%`,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)'
        }}
        onMouseDown={step === 'scan' ? (e) => handleMouseDown(e, 'move') : undefined}
      >
        {/* Border & Effects */}
        <div className={`absolute inset-0 border-2 border-primary shadow-[0_0_20px_rgba(140,48,232,0.5)] ${step === 'scan' ? 'animate-pulse' : ''}`}></div>

        {step === 'scan' && (
          <>
            {/* Grid Lines */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
              <div className="border-r border-b border-primary/50"></div>
              <div className="border-r border-b border-primary/50"></div>
              <div className="border-b border-primary/50"></div>
              <div className="border-r border-b border-primary/50"></div>
              <div className="border-r border-b border-primary/50"></div>
              <div className="border-b border-primary/50"></div>
              <div className="border-r border-primary/50"></div>
              <div className="border-r border-primary/50"></div>
            </div>

            {/* Move Handle (Center) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-move">
              <div className="bg-black/50 p-2 rounded-full backdrop-blur-sm border border-white/20">
                <Move className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Resize Handles */}
            <div
              className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-primary cursor-nw-resize hover:scale-110 transition-transform"
              onMouseDown={(e) => handleMouseDown(e, 'nw')}
            ></div>
            <div
              className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-primary cursor-ne-resize hover:scale-110 transition-transform"
              onMouseDown={(e) => handleMouseDown(e, 'ne')}
            ></div>
            <div
              className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-primary cursor-sw-resize hover:scale-110 transition-transform"
              onMouseDown={(e) => handleMouseDown(e, 'sw')}
            ></div>
            <div
              className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-primary cursor-se-resize hover:scale-110 transition-transform"
              onMouseDown={(e) => handleMouseDown(e, 'se')}
            ></div>
          </>
        )}
      </div>

      {/* UI Controls */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-white/10 px-6 py-3 rounded-full flex items-center gap-4 shadow-2xl z-50 pointer-events-auto">
        <Scan className="w-5 h-5 text-primary" />
        <span className="text-white font-medium text-sm">{step === 'scan' ? 'Adjust Scan Area' : 'Add Style Details'}</span>
      </div>

      {step === 'scan' ? (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4 z-50 pointer-events-auto">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-xl text-white font-bold flex items-center gap-2 transition-all hover:scale-105"
          >
            <X className="w-5 h-5" />
            Cancel
          </button>
          <button
            onClick={handleConfirmArea}
            className="px-8 py-3 bg-primary hover:bg-primary-hover text-background-dark rounded-xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(249,220,141,0.3)] transition-all hover:scale-105"
          >
            <Check className="w-5 h-5" />
            Confirm Area
          </button>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center z-[60] pointer-events-auto">
          <div className="bg-card-dark border border-border-dark p-8 rounded-2xl w-[90%] max-w-md shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-bold text-white">Styling Preferences</h3>
              <p className="text-text-muted text-sm">Tell AI what look you're going for today (optional).</p>
            </div>

            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="E.g., I need a casual outfit for a brunch date, prefer bright colors..."
              className="w-full h-32 bg-background-dark/50 border border-border-dark rounded-lg p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-primary resize-none"
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={() => setStep('scan')}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-text-muted font-bold transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleFinalConfirm}
                disabled={isProcessing}
                className="flex-[2] py-3 bg-primary hover:bg-primary-hover text-background-dark rounded-lg font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(249,220,141,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-background-dark border-t-transparent rounded-full animate-spin" />
                    Capturing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Generate Outfits
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};