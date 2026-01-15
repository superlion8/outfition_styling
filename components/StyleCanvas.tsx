import React, { useState, useRef } from 'react';
import { Plus, Shirt, CheckCircle2, ShoppingBag, FolderOpen, Wand2, X } from 'lucide-react';
import { Category, WardrobeItem } from '../types';

interface StyleCanvasProps {
  items: WardrobeItem[];
  onMoveItem: (itemId: string, newCategory: Category) => void;
  onDeleteItem: (itemId: string) => void;
  onUploadItems: (files: FileList | null, category: Category) => void;
  onStartStyling: () => void;
  outfitCount: number;
  setOutfitCount: (count: number) => void;
  isLoading?: boolean;
  isUploading?: boolean;
}

interface ZoneCardProps {
  title: string;
  category: Category;
  items: WardrobeItem[];
  icon: React.ReactNode;
  itemCount: number;
  onMoveItem: (itemId: string, newCategory: Category) => void;
  onDeleteItem: (itemId: string) => void;
  onUploadItems: (files: FileList | null, category: Category) => void;
}

const ZoneCard: React.FC<ZoneCardProps> = ({
  title,
  category,
  items,
  icon,
  itemCount,
  onMoveItem,
  onDeleteItem,
  onUploadItems
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasItems = items.length > 0;

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
        // Move item to this zone's category
        if (item.category !== category) {
          onMoveItem(item.id, category);
        }
      } else if (e.dataTransfer.files.length > 0) {
        // Handle direct file drop
        onUploadItems(e.dataTransfer.files, category);
      }
    } catch (err) {
      console.error('Failed to parse dropped item', err);
    }
  };

  const handleItemDragStart = (e: React.DragEvent, item: WardrobeItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-card-dark rounded-xl border p-6 flex flex-col gap-4 relative group h-full transition-colors duration-200 min-h-[400px] ${isDragOver ? 'border-primary bg-primary/5 shadow-[0_0_15px_-3px_rgba(140,48,232,0.3)]' : 'border-border-dark'
        }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept="image/*"
        onChange={(e) => onUploadItems(e.target.files, category)}
      />

      <div className="flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded border ${hasItems ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-background-dark border-border-dark text-text-muted'}`}>
          {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
        </span>
      </div>

      {!hasItems ? (
        <div
          onClick={triggerUpload}
          className="flex-1 flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-[#473c53] hover:border-primary/50 transition-colors cursor-pointer min-h-[320px] group/empty"
        >
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <Plus className="w-10 h-10 text-[#473c53] group-hover/empty:text-primary/70 transition-colors" />
            <p className="text-text-muted text-sm font-medium">Add items</p>
          </div>
          <button className="px-4 py-2 bg-border-dark hover:bg-[#3d3448] text-white text-xs font-bold rounded-lg transition-colors pointer-events-none">
            Batch Upload
          </button>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-3 content-start">
          {items.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleItemDragStart(e, item)}
              className="relative aspect-square rounded-lg bg-cover bg-center border border-border-dark overflow-hidden group/item cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
              style={{ backgroundImage: `url('${item.imageUrl}')` }}
            >
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-start justify-end p-2 pointer-events-none">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteItem(item.id);
                  }}
                  className="size-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors pointer-events-auto cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          <div
            onClick={triggerUpload}
            className="flex items-center justify-center rounded-lg border-2 border-dashed border-[#473c53] hover:border-primary/50 cursor-pointer aspect-square transition-colors hover:bg-white/5"
          >
            <Plus className="text-[#473c53]" />
          </div>
        </div>
      )}
    </div>
  );
};

export const StyleCanvas: React.FC<StyleCanvasProps> = ({
  items,
  onMoveItem,
  onDeleteItem,
  onUploadItems,
  onStartStyling,
  outfitCount,
  setOutfitCount,
  isLoading = false,
  isUploading = false
}) => {
  const getItemsByCategory = (cat: Category) => items.filter(i => i.category === cat);
  const [inputValue, setInputValue] = useState(String(outfitCount));

  // Sync input value when outfitCount changes from outside (e.g., +/- buttons)
  React.useEffect(() => {
    setInputValue(String(outfitCount));
  }, [outfitCount]);

  const increment = () => setOutfitCount(Math.min(outfitCount + 1, 100));
  const decrement = () => setOutfitCount(Math.max(outfitCount - 1, 1));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value); // Allow any input while typing
  };

  const handleInputBlur = () => {
    const value = parseInt(inputValue, 10);
    if (!isNaN(value) && value >= 1 && value <= 100) {
      setOutfitCount(value);
    } else {
      // Reset to current valid value if invalid
      setInputValue(String(outfitCount));
    }
  };

  return (
    <div className="animate-in fade-in duration-700 relative">
      {/* Uploading Overlay */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card-dark border border-border-dark rounded-xl p-8 flex flex-col items-center gap-4 shadow-2xl">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white font-semibold text-lg">上传中...</p>
            <p className="text-text-muted text-sm">请稍候，正在上传您的衣物图片</p>
          </div>
        </div>
      )}

      {/* Page Heading */}
      <div className="flex flex-wrap justify-between items-end gap-3 pb-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Style Canvas</h1>
          <p className="text-text-muted text-lg font-normal">Arrange your collection into zones to generate AI-coordinated luxury outfits.</p>
        </div>

        {/* Floating Style Control */}
        <div className="flex items-center gap-4 bg-card-dark p-4 rounded-xl border border-border-dark shadow-2xl">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Number of Outfits</label>
            <div className="flex items-center bg-background-dark border border-border-dark rounded-lg p-1">
              <button
                onClick={decrement}
                className="size-8 flex items-center justify-center text-white hover:text-primary transition-colors"
              >
                <span className="text-lg">-</span>
              </button>
              <input
                type="number"
                min="1"
                max="100"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                className="w-12 text-center text-white font-bold text-sm bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={increment}
                className="size-8 flex items-center justify-center text-white hover:text-primary transition-colors"
              >
                <span className="text-lg">+</span>
              </button>
            </div>
          </div>
          <button
            onClick={onStartStyling}
            className="h-12 px-6 md:px-8 bg-primary hover:bg-primary-hover text-background-dark rounded-lg font-bold flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Wand2 className="w-5 h-5" />
            Start Styling
          </button>
        </div>
      </div>

      {/* Styling Canvas Quadrants - Reverted to 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[600px] mb-12">
        <ZoneCard
          title="Tops"
          category="tops"
          items={getItemsByCategory('tops')}
          icon={<Shirt className="text-primary" />}
          itemCount={getItemsByCategory('tops').length}
          onMoveItem={onMoveItem}
          onDeleteItem={onDeleteItem}
          onUploadItems={onUploadItems}
        />
        <ZoneCard
          title="Bottoms"
          category="bottoms"
          items={getItemsByCategory('bottoms')}
          icon={<FolderOpen className="text-primary" />}
          itemCount={getItemsByCategory('bottoms').length}
          onMoveItem={onMoveItem}
          onDeleteItem={onDeleteItem}
          onUploadItems={onUploadItems}
        />
        <ZoneCard
          title="One-Piece"
          category="onepiece"
          items={getItemsByCategory('onepiece')}
          icon={<CheckCircle2 className="text-primary" />}
          itemCount={getItemsByCategory('onepiece').length}
          onMoveItem={onMoveItem}
          onDeleteItem={onDeleteItem}
          onUploadItems={onUploadItems}
        />
        <ZoneCard
          title="Accessories"
          category="accessories"
          items={getItemsByCategory('accessories')}
          icon={<ShoppingBag className="text-primary" />}
          itemCount={getItemsByCategory('accessories').length}
          onMoveItem={onMoveItem}
          onDeleteItem={onDeleteItem}
          onUploadItems={onUploadItems}
        />
      </div>
    </div>
  );
};