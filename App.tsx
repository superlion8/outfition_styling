import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { StyleCanvas } from './components/StyleCanvas';
import { LoadingOverlay } from './components/LoadingOverlay';
import { StylingResults } from './components/StylingResults';
import { ScannerOverlay } from './components/ScannerOverlay';
import { GlobalSidebar } from './components/GlobalSidebar';
import { CanvasView } from './components/CanvasView';
import { AppView, Category } from './types';
import { useWardrobe } from './hooks/useWardrobe';
import { useStyling } from './hooks/useStyling';

type NavItem = 'home' | 'canvas' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.CANVAS);
  const [outfitCount, setOutfitCount] = useState(3);
  const [activeNav, setActiveNav] = useState<NavItem>('home');

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

  const confirmScan = async (userPrompt?: string) => {
    let screenshotBase64 = undefined;
    const element = document.getElementById('style-canvas-area');
    if (element) {
      try {
        const canvas = await html2canvas(element, {
          useCORS: true,
          scale: 1.5,
          backgroundColor: '#1a1625'
        });
        screenshotBase64 = canvas.toDataURL('image/jpeg', 0.8);
      } catch (e) {
        console.error("Failed to capture screenshot", e);
      }
    }

    setCurrentView(AppView.LOADING);
    generateOutfits(outfitCount, screenshotBase64, userPrompt);
  };

  const cancelProcessing = () => {
    setCurrentView(AppView.CANVAS);
    clearOutfits();
  };

  const completeProcessing = () => {
    setCurrentView(AppView.RESULTS);
  };

  const handleMoveItem = async (itemId: string, newCategory: Category) => {
    await moveItem(itemId, newCategory);
  };

  const handleDeleteItem = async (itemId: string) => {
    await deleteItem(itemId);
  };

  const handleUploadItems = async (files: FileList | null, category: Category) => {
    await uploadItems(files, category);
  };

  useEffect(() => {
    if (wardrobeError) console.error('Wardrobe error:', wardrobeError);
    if (stylingError) console.error('Styling error:', stylingError);
  }, [wardrobeError, stylingError]);

  const handleClearCategory = async (category: Category) => {
    const itemsToDelete = items.filter(i => i.category === category);
    if (itemsToDelete.length === 0) return;
    await Promise.all(itemsToDelete.map(i => deleteItem(i.id)));
  };

  const handleNavigate = (item: NavItem) => {
    setActiveNav(item);
    if (item === 'home') {
      setCurrentView(AppView.CANVAS);
    }
  };

  // Canvas View (Standalone Full-Screen)
  if (activeNav === 'canvas') {
    return (
      <CanvasView
        wardrobeItems={items}
        onBack={() => setActiveNav('home')}
      />
    );
  }

  // Settings View (Placeholder)
  if (activeNav === 'settings') {
    return (
      <div className="min-h-screen bg-background-dark text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Settings</h1>
          <p className="text-text-muted mb-6">Coming soon...</p>
          <button
            onClick={() => setActiveNav('home')}
            className="px-6 py-3 bg-primary text-background-dark rounded-lg font-bold"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Home View (Styling Workflow)
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-white font-display overflow-x-hidden">
      {/* Global Navigation Sidebar */}
      <GlobalSidebar activeItem={activeNav} onNavigate={handleNavigate} />

      {/* Background Decoration */}
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

      {/* Main Content - Offset for sidebar */}
      <div className={`ml-16 transition-all duration-500 ${currentView === AppView.LOADING ? 'blur-sm opacity-40 pointer-events-none h-screen overflow-hidden' : ''}`}>
        <main className="max-w-[1920px] mx-auto px-6 md:px-10 py-8 pb-16">
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
              <aside className="w-full lg:w-[320px] shrink-0 overflow-hidden border-r border-white/5 pr-4 flex flex-col h-full rounded-xl border border-white/5 max-h-full">
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

              <div className="flex-1 overflow-y-auto pl-2 h-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <StylingResults
                  items={items}
                  onRegenerate={startScanning}
                  outfitCount={outfitCount}
                  generatedOutfits={generatedOutfits}
                  onGenerateLook={generateLook}
                  isGeneratingLook={isGeneratingLook}
                  onBack={cancelProcessing}
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