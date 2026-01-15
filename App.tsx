import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { StyleCanvas } from './components/StyleCanvas';
import { LoadingOverlay } from './components/LoadingOverlay';
import { StylingResults } from './components/StylingResults';
import { ScannerOverlay } from './components/ScannerOverlay';
import { AppView, WardrobeItem, Category } from './types';
import { useWardrobe } from './hooks/useWardrobe';
import { useStyling } from './hooks/useStyling';

function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.CANVAS);
  const [outfitCount, setOutfitCount] = useState(3);

  // Supabase-backed wardrobe management
  const {
    items,
    isLoading: isLoadingWardrobe,
    isUploading,
    error: wardrobeError,
    uploadItems,
    deleteItem,
    moveItem,
    refreshItems
  } = useWardrobe();

  // AI styling generation
  const {
    outfits: generatedOutfits,
    isLoading: isGenerating,
    isGeneratingLook,
    error: stylingError,
    generateOutfits,
    generateLook,
    clearOutfits
  } = useStyling();

  const startScanning = () => {
    setCurrentView(AppView.SCANNING);
  };


  const confirmScan = async () => {
    // Capture screenshot of the StyleCanvas
    let screenshotBase64 = undefined;
    const element = document.getElementById('style-canvas-area');
    if (element) {
      try {
        const canvas = await html2canvas(element, {
          useCORS: true,
          scale: 1.5, // Trade-off between quality and size
          backgroundColor: '#1a1625' // Match background
        });
        screenshotBase64 = canvas.toDataURL('image/jpeg', 0.8);
      } catch (e) {
        console.error("Failed to capture screenshot", e);
      }
    }

    setCurrentView(AppView.LOADING);
    // Start the styling API call (don't await - LoadingOverlay watches isGenerating)
    generateOutfits(outfitCount, screenshotBase64);
  };

  const cancelProcessing = () => {
    setCurrentView(AppView.CANVAS);
    clearOutfits();
  };

  const completeProcessing = () => {
    setCurrentView(AppView.RESULTS);
  };

  // Handle item operations (now async with Supabase)
  const handleMoveItem = async (itemId: string, newCategory: Category) => {
    await moveItem(itemId, newCategory);
  };

  const handleDeleteItem = async (itemId: string) => {
    await deleteItem(itemId);
  };

  const handleUploadItems = async (files: FileList | null, category: Category) => {
    await uploadItems(files, category);
  };

  // Show error toast if any
  useEffect(() => {
    if (wardrobeError) {
      console.error('Wardrobe error:', wardrobeError);
    }
    if (stylingError) {
      console.error('Styling error:', stylingError);
    }
  }, [wardrobeError, stylingError]);

  const handleClearCategory = async (category: Category) => {
    // Optimistically UI will be slower if we wait for all
    // Just trigger all deletions concurrently
    const itemsToDelete = items.filter(i => i.category === category);
    if (itemsToDelete.length === 0) return;

    // We could add a clearItems function to useWardrobe for better performance
    // For now concurrent delete is acceptable for small wardrobes
    await Promise.all(itemsToDelete.map(i => deleteItem(i.id)));
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-white font-display overflow-x-hidden pb-10">

      {/* Background Decoration Elements */}
      <div className="fixed -bottom-24 -left-24 size-[500px] bg-primary/10 blur-[120px] rounded-full -z-10 pointer-events-none"></div>
      <div className="fixed top-1/4 -right-24 size-[400px] bg-primary/5 blur-[100px] rounded-full -z-10 pointer-events-none"></div>

      {currentView === AppView.LOADING && (
        <LoadingOverlay
          onCancel={cancelProcessing}
          onComplete={completeProcessing}
          isApiComplete={!isGenerating && generatedOutfits.length > 0}
        />
      )}

      {currentView === AppView.SCANNING && (
        <ScannerOverlay onConfirm={confirmScan} onCancel={cancelProcessing} />
      )}

      {/* Main Layout - Widened to max-w-[1920px] */}
      <div className={`transition-all duration-500 ${currentView === AppView.LOADING ? 'blur-sm opacity-40 pointer-events-none h-screen overflow-hidden' : ''}`}>

        <main className="max-w-[1920px] mx-auto px-6 md:px-10 py-8">
          {(currentView === AppView.CANVAS || currentView === AppView.SCANNING) && (
            <StyleCanvas
              items={items}
              onMoveItem={handleMoveItem}
              onDeleteItem={handleDeleteItem}
              onClearCategory={handleClearCategory}
              onUploadItems={handleUploadItems}
              onStartStyling={startScanning}
              outfitCount={outfitCount}
              setOutfitCount={setOutfitCount}
              isLoading={isLoadingWardrobe}
              isUploading={isUploading}
            />
          )}

          {currentView === AppView.RESULTS && (
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] items-start">
              {/* Sidebar - StyleCanvas */}
              <aside className="w-full lg:w-[320px] shrink-0 overflow-hidden border-r border-white/5 pr-4 flex flex-col h-full bg-background-light/30 backdrop-blur-sm rounded-xl border border-white/5 max-h-full">
                <StyleCanvas
                  items={items}
                  onMoveItem={handleMoveItem}
                  onDeleteItem={handleDeleteItem}
                  onClearCategory={handleClearCategory}
                  onUploadItems={handleUploadItems}
                  onStartStyling={startScanning}
                  outfitCount={outfitCount}
                  setOutfitCount={setOutfitCount}
                  isLoading={isLoadingWardrobe}
                  isSidebar={true}
                />
              </aside>

              {/* Main Content - Results */}
              <div className="flex-1 overflow-y-auto pl-2 h-full custom-scrollbar">
                <StylingResults
                  items={items}
                  onRegenerate={startScanning}
                  outfitCount={outfitCount}
                  generatedOutfits={generatedOutfits}
                  onGenerateLook={generateLook}
                  isGeneratingLook={isGeneratingLook}
                />
              </div>
            </div>
          )}
        </main>
      </div>

    </div>
  );
}

export default App;