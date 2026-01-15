import React, { useState, useEffect } from 'react';
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

  const confirmScan = () => {
    setCurrentView(AppView.LOADING);
    // Start the styling API call (don't await - LoadingOverlay watches isGenerating)
    generateOutfits(outfitCount);
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
      // You could add a toast notification here
    }
    if (stylingError) {
      console.error('Styling error:', stylingError);
      // You could add a toast notification here
    }
  }, [wardrobeError, stylingError]);

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

      {/* Main Layout */}
      <div className={`transition-all duration-500 ${currentView === AppView.LOADING ? 'blur-sm opacity-40 pointer-events-none h-screen overflow-hidden' : ''}`}>

        <main className="max-w-[1440px] mx-auto px-6 md:px-10 py-8">
          {(currentView === AppView.CANVAS || currentView === AppView.SCANNING) && (
            <StyleCanvas
              items={items}
              onMoveItem={handleMoveItem}
              onDeleteItem={handleDeleteItem}
              onUploadItems={handleUploadItems}
              onStartStyling={startScanning}
              outfitCount={outfitCount}
              setOutfitCount={setOutfitCount}
              isLoading={isLoadingWardrobe}
              isUploading={isUploading}
            />
          )}

          {currentView === AppView.RESULTS && (
            <React.Fragment>
              {/* Re-render StyleCanvas in a 'minimized' or normal state above results */}
              <StyleCanvas
                items={items}
                onMoveItem={handleMoveItem}
                onDeleteItem={handleDeleteItem}
                onUploadItems={handleUploadItems}
                onStartStyling={startScanning}
                outfitCount={outfitCount}
                setOutfitCount={setOutfitCount}
                isLoading={isLoadingWardrobe}
              />
              <StylingResults
                items={items}
                onRegenerate={startScanning}
                outfitCount={outfitCount}
                generatedOutfits={generatedOutfits}
                onGenerateLook={generateLook}
                isGeneratingLook={isGeneratingLook}
              />
            </React.Fragment>
          )}
        </main>
      </div>

    </div>
  );
}

export default App;