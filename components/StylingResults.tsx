import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Heart, Wand2, User, Settings2, Check, X, Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { MOCK_IMAGES, MODELS } from '../constants';
import { WardrobeItem } from '../types';

interface OutfitItem {
  id: string;
  image_url: string;
  order_index: number;
}

interface GeneratedOutfit {
  top?: OutfitItem;
  bottom?: OutfitItem;
  onepiece?: OutfitItem;
  accessory?: OutfitItem;
}

interface StylingResultsProps {
  items: WardrobeItem[];
  onRegenerate: () => void;
  outfitCount: number;
  generatedOutfits?: GeneratedOutfit[];
  onGenerateLook?: (index: number, outfit: any) => Promise<string | null>;
  isGeneratingLook?: boolean;
}

interface DropSlotProps {
  image?: string;
  onImageDrop: (imageUrl: string) => void;
  style?: React.CSSProperties;
  className?: string;
  label?: string;
}

// Helper to convert URL to Base64
const urlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data:image/jpeg;base64, prefix
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting image to base64:", error);
    throw error;
  }
};

const DropSlot: React.FC<DropSlotProps> = ({ image, onImageDrop, style, className, label }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) {
        const item = JSON.parse(data) as WardrobeItem;
        onImageDrop(item.imageUrl);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`${className} ${isDragOver ? 'border-primary shadow-[0_0_15px_-3px_rgba(140,48,232,0.5)]' : 'border-border-dark'}`}
    >
      {image && (
        <div
          className="w-full h-full bg-cover bg-center rounded opacity-80 group-hover/slot:opacity-100 transition-opacity"
          style={{ backgroundImage: `url('${image}')`, ...style }}
        ></div>
      )}
      {!image && (
        <div className="w-full h-full rounded opacity-30 bg-white/5 flex items-center justify-center">
          <span className="text-white/20 text-xs">Empty</span>
        </div>
      )}
      {label && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity pointer-events-none">
          <span className="bg-black/70 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">{label}</span>
        </div>
      )}
    </div>
  );
}

interface OutfitState {
  tops?: string;
  bottoms?: string;
  accessories?: string;
  generatedImage?: string;
  isGenerating: boolean;
}

export const StylingResults: React.FC<StylingResultsProps> = ({
  items,
  onRegenerate,
  outfitCount,
  generatedOutfits,
  onGenerateLook
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Model State
  const [currentModel, setCurrentModel] = useState(MODELS[0]);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

  const hasAccessories = items.some(item => item.category === 'accessories');

  // Outfit Grid State
  const [outfits, setOutfits] = useState<OutfitState[]>([]);

  // Initialize outfits from API response or use fallback
  useEffect(() => {
    if (generatedOutfits && generatedOutfits.length > 0) {
      // Use API-generated outfits
      const mappedOutfits: OutfitState[] = generatedOutfits.map((outfit) => ({
        tops: outfit.top?.image_url || outfit.onepiece?.image_url,
        bottoms: outfit.bottom?.image_url,
        accessories: outfit.accessory?.image_url,
        generatedImage: undefined,
        isGenerating: false
      }));
      setOutfits(mappedOutfits);
    } else {
      // Fallback to mock data if no generated outfits
      setOutfits(Array.from({ length: outfitCount }).map((_, i) => ({
        tops: [MOCK_IMAGES.TROUSERS, MOCK_IMAGES.SKIRT, MOCK_IMAGES.BAG][i % 3],
        bottoms: [MOCK_IMAGES.SKIRT, MOCK_IMAGES.TROUSERS][i % 2],
        accessories: hasAccessories ? MOCK_IMAGES.BAG : undefined,
        generatedImage: undefined,
        isGenerating: false
      })));
    }
  }, [generatedOutfits, outfitCount, hasAccessories]);

  const updateOutfit = (index: number, category: keyof OutfitState, value: string) => {
    setOutfits(prev => prev.map((outfit, i) =>
      i === index ? { ...outfit, [category]: value } : outfit
    ));
  };

  const handleDeleteOutfit = (index: number) => {
    setOutfits(prev => prev.filter((_, i) => i !== index));
  };

  // Helper to find full item details by image URL
  const findItemByUrl = (url?: string): WardrobeItem | undefined => {
    if (!url) return undefined;
    return items.find(item => item.imageUrl === url);
  };

  const handleGenerateLook = async (index: number) => {
    if (!onGenerateLook) return;

    const currentOutfitState = outfits[index];

    // Update loading state
    setOutfits(prev => prev.map((o, i) => i === index ? { ...o, isGenerating: true } : o));

    try {
      // Reconstruct the Outfit object with full item details (needed for image_path)
      // Note: The type expectation in generateLook might need to be adjusted or we cast here
      // transforming WardrobeItem to OutfitItem structure if needed
      const topItem = findItemByUrl(currentOutfitState.tops);
      const bottomItem = findItemByUrl(currentOutfitState.bottoms);
      const accessoryItem = findItemByUrl(currentOutfitState.accessories);

      // Construct an object compatible with what useStyling expects (Outfit interface)
      // We need to map WardrobeItem to OutfitItem structure
      const mapToOutfitItem = (item?: WardrobeItem) => {
        if (!item) return undefined;
        return {
          id: item.id,
          image_url: item.imageUrl,
          image_path: item.image_path,
          order_index: item.order_index,
          category: item.category
        };
      };

      const outfitData: {
        top?: ReturnType<typeof mapToOutfitItem>;
        bottom?: ReturnType<typeof mapToOutfitItem>;
        accessory?: ReturnType<typeof mapToOutfitItem>;
        onepiece?: ReturnType<typeof mapToOutfitItem>;
      } = {
        top: mapToOutfitItem(topItem),
        bottom: mapToOutfitItem(bottomItem),
        accessory: mapToOutfitItem(accessoryItem)
      };

      // Correction: If the item in 'tops' slot is actually a 'onepiece', put it in onepiece field
      if (topItem && topItem.category === 'onepiece') {
        outfitData.onepiece = outfitData.top;
        outfitData.top = undefined;
      }

      const generatedImageUrl = await onGenerateLook(index, outfitData);

      if (generatedImageUrl) {
        setOutfits(prev => prev.map((o, i) => i === index ? { ...o, isGenerating: false, generatedImage: generatedImageUrl } : o));
      } else {
        throw new Error("No image generated");
      }

    } catch (error) {
      console.error("Generation failed:", error);
      // alert("Failed to generate image. Please check your connection and try again.");
      setOutfits(prev => prev.map((o, i) => i === index ? { ...o, isGenerating: false } : o));
    }
  };


  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // scroll speed multiplier
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  // Helper to generate dynamic grid columns based on actual outfit array length
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `100px repeat(${outfits.length}, minmax(200px, 1fr))`,
    gap: '2rem'
  };

  return (
    <div className="animate-in fade-in duration-700 slide-in-from-bottom-8 mt-6">

      {/* Header Actions - Full Width Row */}
      <div className="flex flex-wrap justify-between items-end mb-6 gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <Wand2 className="text-primary w-6 h-6" />
            Styling Results
          </h3>
          <p className="text-text-muted text-sm">Review AI-generated outfits below. Drag items from the zones above to swap components.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onRegenerate}
            className="px-4 py-2 bg-border-dark hover:bg-[#3d3448] text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </button>
          <button className="px-4 py-2 bg-primary hover:bg-primary-hover text-background-dark text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-primary/20">
            <Heart className="w-4 h-4" />
            Save All Looks
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">

        {/* Left Sidebar: Model Card */}
        <div className="w-full lg:w-[280px] shrink-0 sticky top-24 bg-card-dark rounded-xl border border-border-dark p-2 flex flex-col gap-2 relative group overflow-hidden h-[500px]">
          {/* Header */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
            <User className="w-3 h-3 text-primary" />
            <span className="text-white text-xs font-bold tracking-wide">Model Preview</span>
          </div>

          {/* Image */}
          <div
            className="flex-1 rounded-lg bg-cover bg-center bg-no-repeat relative border border-white/5 transition-all duration-500"
            style={{ backgroundImage: `url(${currentModel.imageUrl})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>

            <button
              onClick={() => setIsModelSelectorOpen(true)}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-lg text-white text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap group/btn"
            >
              <Settings2 className="w-3.5 h-3.5 group-hover/btn:rotate-90 transition-transform duration-300" />
              Customize Avatar
            </button>
          </div>
        </div>

        {/* Right Content - Grid Table Only */}
        <div className="flex-1 min-w-0">
          <div
            ref={scrollContainerRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className="bg-card-dark rounded-xl border border-border-dark p-4 md:p-8 overflow-x-auto relative mb-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] cursor-grab active:cursor-grabbing"
          >
            <div className="min-w-full">
              {/* Header Row */}
              <div style={gridStyle} className="mb-6 text-xs font-bold text-text-muted uppercase tracking-widest text-center items-center pointer-events-none select-none">
                <div className="text-right flex items-center justify-end">Category</div>
                {outfits.map((_, i) => (
                  <div key={`header-${i}`} className="flex items-center justify-between gap-2 px-2 group/header">
                    <span>Outfit #{String(i + 1).padStart(2, '0')}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent scroll drag if clicked
                        handleDeleteOutfit(i);
                      }}
                      className="p-1.5 rounded-md hover:bg-white/10 text-text-muted hover:text-red-400 opacity-0 group-hover/header:opacity-100 transition-all pointer-events-auto cursor-pointer"
                      title="Remove Outfit"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Row: Tops */}
              <div style={gridStyle} className="mb-6 items-center group/row">
                <div className="text-right text-white font-bold text-sm pointer-events-none select-none">Tops</div>
                {outfits.map((outfit, i) => (
                  <DropSlot
                    key={`top-${i}`}
                    image={outfit.tops}
                    onImageDrop={(url) => updateOutfit(i, 'tops', url)}
                    style={{ filter: i % 2 === 0 ? 'brightness(0.7) sepia(0.2)' : 'none' }}
                    label="Drop to swap"
                    className="relative bg-background-dark border rounded-lg p-2 aspect-[4/3] flex items-center justify-center group/slot hover:border-primary hover:shadow-[0_0_15px_-3px_rgba(140,48,232,0.3)] transition-all cursor-grab active:cursor-grabbing"
                  />
                ))}
              </div>

              {/* Row: Bottoms */}
              <div style={gridStyle} className="mb-6 items-center group/row">
                <div className="text-right text-white font-bold text-sm pointer-events-none select-none">Bottoms</div>
                {outfits.map((outfit, i) => (
                  <DropSlot
                    key={`bottom-${i}`}
                    image={outfit.bottoms}
                    onImageDrop={(url) => updateOutfit(i, 'bottoms', url)}
                    className="relative bg-background-dark border rounded-lg p-2 aspect-[4/3] flex items-center justify-center group/slot hover:border-primary hover:shadow-[0_0_15px_-3px_rgba(140,48,232,0.3)] transition-all cursor-grab active:cursor-grabbing"
                  />
                ))}
              </div>

              {/* Row: Accessories - Only show if accessories exist */}
              {hasAccessories && (
                <div style={gridStyle} className="mb-6 items-center group/row">
                  <div className="text-right text-white font-bold text-sm pointer-events-none select-none">Accessories</div>
                  {outfits.map((outfit, i) => (
                    <DropSlot
                      key={`acc-${i}`}
                      image={outfit.accessories}
                      onImageDrop={(url) => updateOutfit(i, 'accessories', url)}
                      style={{ filter: `hue-rotate(${i * 45}deg)` }}
                      className="relative bg-background-dark border rounded-lg p-2 aspect-[4/3] flex items-center justify-center group/slot hover:border-primary hover:shadow-[0_0_15px_-3px_rgba(140,48,232,0.3)] transition-all cursor-grab active:cursor-grabbing"
                    />
                  ))}
                </div>
              )}

              {/* Row: Generate Try-On */}
              <div style={gridStyle} className="items-center group/row">
                <div className="text-right text-white font-bold text-sm pointer-events-none select-none flex flex-col items-end gap-1">
                  <span>Try On</span>
                  <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">AI Studio</span>
                </div>
                {outfits.map((outfit, i) => (
                  <div key={`generate-${i}`} className="relative w-full aspect-[3/4] flex flex-col">
                    {outfit.generatedImage ? (
                      <div className="relative w-full h-full rounded-lg overflow-hidden border border-primary/30 group/result animate-in fade-in zoom-in-95 duration-500">
                        <img src={outfit.generatedImage} alt="Generated Look" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/result:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={() => handleGenerateLook(i)}
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 p-2 rounded-full transition-transform hover:scale-110"
                            title="Regenerate"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full border border-dashed border-[#473c53] rounded-lg bg-white/5 flex flex-col items-center justify-center gap-3 p-4 group/gen transition-colors hover:bg-white/[0.07] hover:border-primary/30">
                        {outfit.isGenerating ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                            <span className="text-xs text-text-muted animate-pulse">Designing...</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleGenerateLook(i)}
                            className="w-full h-full flex flex-col items-center justify-center gap-2"
                          >
                            <div className="p-3 rounded-full bg-primary/10 text-primary group-hover/gen:scale-110 transition-transform duration-300">
                              <Sparkles className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold text-white/70 group-hover/gen:text-white transition-colors">Generate Look</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Selector Modal */}
      {isModelSelectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card-dark border border-border-dark rounded-2xl w-full max-w-2xl p-6 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Select Model</h3>
              <button
                onClick={() => setIsModelSelectorOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    setCurrentModel(model);
                    setIsModelSelectorOpen(false);
                  }}
                  className={`relative aspect-[3/4] rounded-xl overflow-hidden group border-2 transition-all ${currentModel.id === model.id ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-primary/50'}`}
                >
                  <img src={model.imageUrl} alt={model.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <span className="text-white font-bold text-sm">{model.name}</span>
                  </div>
                  {currentModel.id === model.id && (
                    <div className="absolute top-2 right-2 bg-primary text-black rounded-full p-1">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};