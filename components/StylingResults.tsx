import React, { useState, useRef, useEffect, useMemo } from 'react';
import { RefreshCw, Heart, Wand2, User, Settings2, Check, X, Sparkles, Loader2, ZoomIn, Download, Home, Filter } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { MOCK_IMAGES } from '../constants';
import { WardrobeItem } from '../types';
import modelsDataRaw from '../data/models.json';

// Type definition for the new model data
interface Model {
  _id: string;
  model_id: string;
  image: string;
  model_ethnicity: string;
  model_gender: string;
  model_desc: string;
  // Add other fields as needed
}

const modelsData = modelsDataRaw as Model[];

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
  reason?: string;
}

interface StylingResultsProps {
  items: WardrobeItem[];
  onRegenerate: () => void;
  outfitCount: number;
  generatedOutfits?: GeneratedOutfit[];
  onGenerateLook?: (index: number, outfit: any) => Promise<string | null>;
  isGeneratingLook?: boolean;
  onBack?: () => void;
}

interface DropSlotProps {
  image?: string;
  onImageDrop: (imageUrl: string) => void;
  style?: React.CSSProperties;
  className?: string;
  label?: string;
  onImageClick?: (imageUrl: string) => void;
}

const DropSlot: React.FC<DropSlotProps> = ({ image, onImageDrop, style, className, label, onImageClick }) => {
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
      className={`${className} ${isDragOver ? 'border-primary shadow-[0_0_15px_-3px_rgba(140,48,232,0.5)]' : 'border-border-dark'} relative`}
    >
      {image && (
        <>
          <div
            className="w-full h-full bg-cover bg-center rounded group-hover/slot:opacity-100 transition-opacity cursor-pointer"
            style={{ backgroundImage: `url('${image}')`, ...style }}
            onClick={() => onImageClick && onImageClick(image)}
          ></div>

          {/* Zoom Hint */}
          <div className="absolute top-2 right-2 opacity-0 group-hover/slot:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-black/60 rounded-full p-1.5 text-white backdrop-blur-sm">
              <ZoomIn className="w-3 h-3" />
            </div>
          </div>
        </>
      )}
      {!image && (
        <div className="w-full h-full rounded opacity-30 bg-white/5 flex items-center justify-center pointer-events-none">
          <span className="text-white/20 text-xs">Empty</span>
        </div>
      )}
      {label && !image && (
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
  reason?: string;
}

export const StylingResults: React.FC<StylingResultsProps> = ({
  items,
  onRegenerate,
  outfitCount,
  generatedOutfits,
  onGenerateLook,
  isGeneratingLook,
  onBack
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | undefined>(undefined);

  // Model State
  const [currentModel, setCurrentModel] = useState<Model>(modelsData[0]);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

  // Filter State
  const [ethnicityFilter, setEthnicityFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');

  const hasAccessories = items.some(item => item.category === 'accessories');

  // Outfit Grid State
  const [outfits, setOutfits] = useState<OutfitState[]>([]);

  // Compute Filter Options
  const ethnicityOptions = useMemo(() => {
    const ethnicities = new Set(modelsData.map(m => m.model_ethnicity));
    return ['All', ...Array.from(ethnicities)].sort();
  }, []);

  const genderOptions = useMemo(() => {
    const genders = new Set(modelsData.map(m => m.model_gender));
    return ['All', ...Array.from(genders)].sort();
  }, []);

  // Filter Models
  const filteredModels = useMemo(() => {
    return modelsData.filter(model => {
      const matchEthnicity = ethnicityFilter === 'All' || model.model_ethnicity === ethnicityFilter;
      const matchGender = genderFilter === 'All' || model.model_gender === genderFilter;
      return matchEthnicity && matchGender;
    });
  }, [ethnicityFilter, genderFilter]);


  // Initialize outfits from API response or use fallback
  useEffect(() => {
    if (generatedOutfits && generatedOutfits.length > 0) {
      // Use API-generated outfits
      const mappedOutfits: OutfitState[] = generatedOutfits.map((outfit) => ({
        tops: outfit.top?.image_url || outfit.onepiece?.image_url,
        bottoms: outfit.bottom?.image_url,
        accessories: outfit.accessory?.image_url,
        generatedImage: undefined,
        isGenerating: false,
        reason: outfit.reason
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
      const topItem = findItemByUrl(currentOutfitState.tops);
      const bottomItem = findItemByUrl(currentOutfitState.bottoms);
      const accessoryItem = findItemByUrl(currentOutfitState.accessories);

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
        model_image_url?: string;
        model_description?: string;
      } = {
        top: mapToOutfitItem(topItem),
        bottom: mapToOutfitItem(bottomItem),
        accessory: mapToOutfitItem(accessoryItem),
        model_image_url: currentModel.image,
        model_description: currentModel.model_desc
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
    <div className="flex flex-col gap-6 fade-in h-full">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-3 bg-card-dark hover:bg-white/10 border border-border-dark rounded-xl transition-colors text-text-muted hover:text-white"
              title="Return to Home"
            >
              <Home className="w-5 h-5" />
            </button>
          )}
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Styling Results
            </h2>
            <p className="text-text-muted text-sm">Review AI-generated outfits below. Drag items from the zones above to swap components.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRegenerate}
            className="px-4 py-2 bg-card-dark hover:bg-white/10 border border-border-dark text-white rounded-lg font-bold flex items-center gap-2 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </button>
          <button className="px-4 py-2 bg-primary hover:bg-primary-hover text-background-dark rounded-lg font-bold flex items-center gap-2 transition-colors text-sm">
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
            style={{ backgroundImage: `url(${currentModel.image})` }} // Updated field
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

              {/* Row: Reason */}
              <div style={gridStyle} className="mb-4 items-start group/row">
                <div className="text-right text-text-muted text-xs font-bold uppercase tracking-widest pt-2 pointer-events-none select-none">AI Insight</div>
                {outfits.map((outfit, i) => (
                  <div key={`reason-${i}`} className="px-1">
                    {outfit.reason ? (
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 min-h-[60px] flex items-center">
                        <p className="text-primary text-sm leading-relaxed font-medium">
                          {outfit.reason}
                        </p>
                      </div>
                    ) : (
                      <div className="min-h-[60px]"></div>
                    )}
                  </div>
                ))}
              </div>

              {/* Row: Tops */}
              <div style={gridStyle} className="items-center group/row">
                <div className="text-right text-white font-bold text-sm pointer-events-none select-none">Tops</div>
                {outfits.map((outfit, i) => (
                  <DropSlot
                    key={`top-${i}`}
                    image={outfit.tops}
                    onImageDrop={(url) => updateOutfit(i, 'tops', url)}
                    label="Drop to swap"
                    className="relative bg-background-dark aspect-[4/3] flex items-center justify-center group/slot hover:ring-2 hover:ring-primary hover:ring-inset transition-all cursor-grab active:cursor-grabbing rounded-t-lg overflow-hidden"
                    onImageClick={setPreviewImage}
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
                    className="relative bg-background-dark aspect-[4/3] flex items-center justify-center group/slot hover:ring-2 hover:ring-primary hover:ring-inset transition-all cursor-grab active:cursor-grabbing rounded-b-lg overflow-hidden"
                    onImageClick={setPreviewImage}
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
                      className="relative bg-background-dark aspect-square flex items-center justify-center group/slot hover:ring-2 hover:ring-primary hover:ring-inset transition-all cursor-grab active:cursor-grabbing rounded-lg overflow-hidden"
                      onImageClick={setPreviewImage}
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

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/result:opacity-100 transition-opacity flex items-center justify-center gap-3">

                          {/* Zoom Button */}
                          <button
                            onClick={() => setPreviewImage(outfit.generatedImage)}
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 p-2.5 rounded-full transition-transform hover:scale-110"
                            title="Zoom In"
                          >
                            <ZoomIn className="w-5 h-5" />
                          </button>

                          {/* Regenerate Button */}
                          <button
                            onClick={() => handleGenerateLook(i)}
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 p-2.5 rounded-full transition-transform hover:scale-110"
                            title="Regenerate"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>

                          {/* Download Button (Top Right) */}
                          <a
                            href={outfit.generatedImage}
                            download={`outfit-look-${i + 1}.jpg`}
                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg backdrop-blur-sm transition-colors"
                            title="Download"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="w-4 h-4" />
                          </a>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-card-dark border border-border-dark rounded-2xl w-full max-w-[95vw] xl:max-w-[1600px] p-6 relative shadow-2xl animate-in zoom-in-95 duration-200 h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div className="flex items-center gap-3">
                <User className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-bold text-white">Select Model</h3>
                <span className="text-xs text-text-muted bg-white/5 px-2 py-1 rounded-full">{filteredModels.length} models</span>
              </div>
              <button
                onClick={() => setIsModelSelectorOpen(false)}
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
                  {ethnicityOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted uppercase tracking-wider font-bold">Gender</span>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="bg-card-dark border border-border-dark text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary"
                >
                  {genderOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {(ethnicityFilter !== 'All' || genderFilter !== 'All') && (
                <button
                  onClick={() => { setEthnicityFilter('All'); setGenderFilter('All'); }}
                  className="text-xs text-primary hover:underline ml-auto"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto min-h-0 -mr-2 pr-2">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4">
                {filteredModels.map((model) => (
                  <div
                    key={model._id}
                    className={`relative aspect-[9/16] rounded-xl overflow-hidden group border-2 transition-all cursor-pointer ${currentModel.model_id === model.model_id ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-primary/50'}`}
                    onClick={() => {
                      setCurrentModel(model);
                      setIsModelSelectorOpen(false);
                    }}
                  >
                    <img loading="lazy" src={model.image} alt={model.model_id} className="w-full h-full object-cover" />

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Zoom Button - Top Left */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(model.image);
                        }}
                        className="absolute top-2 left-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-colors"
                        title="点击放大"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>

                      {/* Model Info - Bottom */}
                      <div className="absolute bottom-0 left-0 right-0 p-2 flex flex-col">
                        <span className="text-white font-bold text-xs truncate">{model.model_id}</span>
                        <span className="text-white/60 text-[10px] truncate">{model.model_ethnicity}</span>
                      </div>
                    </div>

                    {/* Selected Check Mark */}
                    {currentModel.model_id === model.model_id && (
                      <div className="absolute top-2 right-2 bg-primary text-black rounded-full p-1">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setPreviewImage(undefined)}>
          {/* Close Button */}
          <button
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            onClick={() => setPreviewImage(undefined)}
          >
            <X className="w-6 h-6" />
          </button>

          {/* Download Button */}
          <a
            href={previewImage}
            download="generated-look.jpg"
            className="absolute top-6 right-20 p-2 bg-primary hover:bg-primary-hover rounded-full text-black transition-colors flex items-center gap-2 px-4 font-bold text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="w-4 h-4" />
            Download
          </a>

          <div className="relative max-w-[90vw] max-h-[90vh] rounded-lg overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="Preview" className="w-full h-full object-contain max-h-[90vh]" />
          </div>
        </div>
      )}
    </div>
  );
};