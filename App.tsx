import React, { useState } from 'react';
import { StyleCanvas } from './components/StyleCanvas';
import { LoadingOverlay } from './components/LoadingOverlay';
import { StylingResults } from './components/StylingResults';
import { ScannerOverlay } from './components/ScannerOverlay';
import { AppView, WardrobeItem, Category } from './types';
import { INITIAL_ITEMS } from './constants';

function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.CANVAS);
  const [items, setItems] = useState<WardrobeItem[]>(INITIAL_ITEMS);
  const [outfitCount, setOutfitCount] = useState(3);

  const startScanning = () => {
    setCurrentView(AppView.SCANNING);
  };

  const confirmScan = () => {
    setCurrentView(AppView.LOADING);
  };

  const cancelProcessing = () => {
    setCurrentView(AppView.CANVAS);
  };

  const completeProcessing = () => {
    setCurrentView(AppView.RESULTS);
  };

  const handleMoveItem = (itemId: string, newCategory: Category) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, category: newCategory } : item
    ));
  };

  const handleDeleteItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleUploadItems = (files: FileList | null, category: Category) => {
    if (!files) return;

    const newItems: WardrobeItem[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      category,
      imageUrl: URL.createObjectURL(file),
      name: file.name.split('.')[0]
    }));

    setItems(prev => [...prev, ...newItems]);
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-white font-display overflow-x-hidden pb-10">
      
      {/* Background Decoration Elements */}
      <div className="fixed -bottom-24 -left-24 size-[500px] bg-primary/10 blur-[120px] rounded-full -z-10 pointer-events-none"></div>
      <div className="fixed top-1/4 -right-24 size-[400px] bg-primary/5 blur-[100px] rounded-full -z-10 pointer-events-none"></div>

      {currentView === AppView.LOADING && (
         <LoadingOverlay onCancel={cancelProcessing} onComplete={completeProcessing} />
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
                />
                <StylingResults 
                  items={items}
                  onRegenerate={startScanning} 
                  outfitCount={outfitCount}
                />
             </React.Fragment>
          )}
        </main>
      </div>

    </div>
  );
}

export default App;