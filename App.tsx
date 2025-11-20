
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, analyzeImageForSuggestions } from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import { UndoIcon, RedoIcon, EyeIcon, MagicWandIcon, PaletteIcon, SunIcon, UploadIcon, RefreshIcon } from './components/icons';
import StartScreen from './components/StartScreen';

// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

type Tab = 'retouch' | 'adjust' | 'filters' | 'crop';
type StudioTab = 'places' | 'outfits' | 'vehicles';

const App: React.FC = () => {
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<{ label: string, emoji: string, prompt: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
  const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('retouch');
  const [studioTab, setStudioTab] = useState<StudioTab>('places');
  
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const currentImage = history[historyIndex] ?? null;
  const originalImage = history[0] ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  // --- DISRUPTIVE VISUAL STUDIO ASSETS ---
  
  const studioAssets = {
    places: [
        { id: 'paris', emoji: '🇫🇷', label: 'Paris Café', prompt: 'Transport subject to a chic Parisian cafe outdoor seating, Eiffel Tower visible in distance, soft morning light.' },
        { id: 'ny', emoji: '🗽', label: 'NY Rooftop', prompt: 'Place subject on a luxury NYC penthouse rooftop at dusk, Empire State lights in background, cocktail ambiance.' },
        { id: 'yacht', emoji: '🛥️', label: 'Monaco Yacht', prompt: 'Place subject on a superyacht in Monaco, turquoise water, holding champagne, golden hour sunset.' },
        { id: 'santorini', emoji: '🇬🇷', label: 'Santorini', prompt: 'Place subject in Oia, Santorini, white architecture, blue domes, bright sunny day, vacation vibe.' },
        { id: 'tokyo', emoji: '🇯🇵', label: 'Tokyo Neon', prompt: 'Place subject in Shibuya Crossing at night, rain reflections, neon signs, cyberpunk aesthetic.' },
        { id: 'aspen', emoji: '❄️', label: 'Aspen Snow', prompt: 'Place subject in Aspen ski resort, snowy mountains background, winter luxury atmosphere.' },
        { id: 'desert', emoji: '🏜️', label: 'Dubai Desert', prompt: 'Place subject in Dubai desert dunes at sunset, warm golden lighting, luxury travel vibe.' },
        { id: 'jet', emoji: '🛩️', label: 'Private Jet', prompt: 'Place subject on the tarmac steps of a Gulfstream G650 private jet, luxury luggage, confident pose.' },
    ],
    outfits: [
        { id: 'suit', emoji: '🤵', label: 'Old Money', prompt: 'Change outfit to a tailored Italian navy blue suit, white crisp shirt, no tie, expensive watch, Old Money aesthetic.' },
        { id: 'street', emoji: '🧢', label: 'Streetwear', prompt: 'Change outfit to high-end streetwear: oversized Balenciaga hoodie, cargo pants, limited edition sneakers.' },
        { id: 'summer', emoji: '👕', label: 'Linen Summer', prompt: 'Change outfit to a white linen shirt unbuttoned, beige chino shorts, loafers, sunglasses, Riviera style.' },
        { id: 'gala', emoji: '✨', label: 'Red Carpet', prompt: 'Change outfit to a Black Tie tuxedo (or evening gown), flawless grooming, paparazzi flash lighting.' },
        { id: 'leather', emoji: '🧥', label: 'Leather', prompt: 'Change outfit to a black leather jacket, white t-shirt, dark denim, boots, edgy rockstar look.' },
        { id: 'polo', emoji: '🏇', label: 'Polo Club', prompt: 'Change outfit to a Ralph Lauren polo shirt, white pants, sweater over shoulders, preppy style.' },
    ],
    vehicles: [
        { id: 'ferrari', emoji: '🐎', label: 'Ferrari 458', prompt: 'Place subject leaning on a Red Ferrari 458 Italia. Sunset light, Italian coast background. Realistic car reflections.' },
        { id: 'porsche', emoji: '🏁', label: 'Vintage 911', prompt: 'Place subject driving a classic Silver Porsche 911 convertible. Coastal road, wind in hair, dynamic blur.' },
        { id: 'lambo', emoji: '🐂', label: 'Lambo Huracán', prompt: 'Place subject next to a lime green Lamborghini Huracán at night. City lights, wet pavement reflections.' },
        { id: 'gwagon', emoji: '🚙', label: 'G-Wagon', prompt: 'Place subject walking away from a Matte Black Mercedes G-Wagon. Rodeo Drive background, luxury shopping bags.' },
        { id: 'rolls', emoji: '👑', label: 'Rolls Royce', prompt: 'Place subject inside a Rolls Royce Phantom back seat. Starlight headliner, warm interior light, glass in hand.' },
        { id: 'bugatti', emoji: '🔵', label: 'Bugatti', prompt: 'Place subject standing next to a Bugatti Chiron at a casino entrance. Tuxedo/Gala attire, high contrast luxury.' },
    ]
  };

  // Effect to create and revoke object URLs safely
  useEffect(() => {
    if (currentImage) {
      const url = URL.createObjectURL(currentImage);
      setCurrentImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentImage]);
  
  useEffect(() => {
    if (originalImage) {
      const url = URL.createObjectURL(originalImage);
      setOriginalImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalImageUrl(null);
    }
  }, [originalImage]);


  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const addImageToHistory = useCallback((newImageFile: File) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCrop(undefined);
    setCompletedCrop(undefined);
    if (activeTab === 'crop') setActiveTab('retouch'); 
  }, [history, historyIndex, activeTab]);

  const runAnalysis = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    try {
      const suggestions = await analyzeImageForSuggestions(file);
      setAiSuggestions(suggestions);
    } catch (e) {
      console.error("Error analyzing image", e);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setHistory([file]);
    setHistoryIndex(0);
    setEditHotspot(null);
    setDisplayHotspot(null);
    setActiveTab('retouch');
    setCrop(undefined);
    setCompletedCrop(undefined);
    setAiSuggestions([]); // Clear previous
    runAnalysis(file); // Trigger smart analysis
  }, [runAnalysis]);

  const handleGenerate = useCallback(async () => {
    if (!currentImage) {
      setError('Nenhuma imagem carregada.');
      return;
    }
    
    if (!prompt.trim()) {
        setError('Por favor, selecione um estilo ou descreva o que deseja.');
        return;
    }

    // If no hotspot selected but in retouch mode, default to center
    let targetHotspot = editHotspot;
    if (!targetHotspot) {
        if (imgRef.current) {
             const { naturalWidth, naturalHeight } = imgRef.current;
             targetHotspot = { x: naturalWidth / 2, y: naturalHeight / 2 };
        } else {
             targetHotspot = { x: 500, y: 500 }; // Fallback
        }
    }

    setIsLoading(true);
    setError(null);
    
    try {
        const editedImageUrl = await generateEditedImage(currentImage, prompt, targetHotspot);
        const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setEditHotspot(null);
        setDisplayHotspot(null);
        // We keep the prompt to allow easy variations or tweaks
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Um erro desconhecido ocorreu.';
        setError(`Falha ao gerar imagem. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, prompt, editHotspot, addImageToHistory]);
  
  const handleApplyFilter = useCallback(async (filterPrompt: string) => {
    if (!currentImage) { setError('Nenhuma imagem carregada.'); return; }
    setIsLoading(true);
    setError(null);
    try {
        const filteredImageUrl = await generateFilteredImage(currentImage, filterPrompt);
        const newImageFile = dataURLtoFile(filteredImageUrl, `filtered-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        setError(`Falha ao aplicar filtro.`);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);
  
  const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
    if (!currentImage) { setError('Nenhuma imagem carregada.'); return; }
    setIsLoading(true);
    setError(null);
    try {
        const adjustedImageUrl = await generateAdjustedImage(currentImage, adjustmentPrompt);
        const newImageFile = dataURLtoFile(adjustedImageUrl, `adjusted-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        setError(`Falha ao ajustar imagem.`);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handleApplyCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) { setError('Selecione uma área para cortar.'); return; }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) { setError('Não foi possível cortar.'); return; }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = completedCrop.width * pixelRatio;
    canvas.height = completedCrop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    );
    
    const croppedImageUrl = canvas.toDataURL('image/png');
    const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
    addImageToHistory(newImageFile);
    setActiveTab('retouch');
  }, [completedCrop, addImageToHistory]);

  const handleUndo = useCallback(() => {
    if (canUndo) { setHistoryIndex(historyIndex - 1); setEditHotspot(null); setDisplayHotspot(null); }
  }, [canUndo, historyIndex]);
  
  const handleRedo = useCallback(() => {
    if (canRedo) { setHistoryIndex(historyIndex + 1); setEditHotspot(null); setDisplayHotspot(null); }
  }, [canRedo, historyIndex]);

  const handleUploadNew = useCallback(() => {
      setHistory([]);
      setHistoryIndex(-1);
      setError(null);
      setPrompt('');
      setEditHotspot(null);
      setDisplayHotspot(null);
      setAiSuggestions([]);
  }, []);

  const handleDownload = useCallback(() => {
      if (currentImage) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(currentImage);
          link.download = `pixshop-edit-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
      }
  }, [currentImage]);
  
  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
      handleImageUpload(files[0]);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (activeTab !== 'retouch') return;
    
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDisplayHotspot({ x: offsetX, y: offsetY });
    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
    setEditHotspot({ x: Math.round(offsetX * (naturalWidth / clientWidth)), y: Math.round(offsetY * (naturalHeight / clientHeight)) });
  };

  // Function to append prompt logic smartly
  const addToPrompt = (newText: string) => {
      // If prompt is empty, just set it
      if (!prompt) {
          setPrompt(newText);
          return;
      }
      // Disruptive Feature: MIXING
      // If prompt already has instructions, we append.
      // "Transport to Paris." + "Change outfit to Suit." -> "Transport to Paris AND Change outfit to Suit."
      setPrompt(prev => `${prev} ALSO ${newText}`);
  };

  const renderSidebar = () => (
    <div className="w-[400px] flex flex-col border-l border-neutral-800 bg-neutral-900 flex-shrink-0 z-20 shadow-2xl">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-neutral-800 flex flex-col items-center">
             <Header />
             
             {/* Tabs */}
             <div className="flex w-full bg-neutral-800 rounded-xl p-1 mt-6">
                {(['retouch', 'crop', 'adjust', 'filters'] as Tab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-bold transition-all ${
                            activeTab === tab 
                            ? 'bg-white text-black shadow-sm' 
                            : 'text-neutral-400 hover:text-white hover:bg-neutral-700'
                        }`}
                    >
                        {tab === 'retouch' && "ESTÚDIO"}
                        {tab === 'crop' && "CORTAR"}
                        {tab === 'adjust' && "LUZ"}
                        {tab === 'filters' && "FILTRO"}
                    </button>
                ))}
             </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            
            {error && (
                 <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-lg text-xs flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="font-bold hover:text-white">✕</button>
                 </div>
            )}

            {activeTab === 'retouch' && (
                <div className="flex flex-col gap-6 animate-fade-in">
                    
                    {/* SMART AI ANALYSIS SECTION - NEW */}
                    <div className="relative">
                         <div className="flex items-center justify-between mb-2">
                             <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                                <MagicWandIcon className="w-3 h-3 text-pink-400"/> IA Insights
                             </h2>
                             {isAnalyzing && <span className="text-[10px] text-neutral-400 animate-pulse">Analisando...</span>}
                        </div>
                        
                        {isAnalyzing ? (
                            <div className="grid grid-cols-2 gap-2">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className="h-10 bg-neutral-800 rounded-lg animate-pulse border border-neutral-700/50"></div>
                                ))}
                            </div>
                        ) : aiSuggestions.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {aiSuggestions.map((suggestion, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => setPrompt(suggestion.prompt)}
                                        className="text-left px-3 py-2 bg-neutral-800/50 border border-pink-500/30 hover:bg-neutral-800 hover:border-pink-500 rounded-lg transition-all active:scale-95 group"
                                    >
                                        <span className="text-lg mr-2">{suggestion.emoji}</span>
                                        <span className="text-xs font-semibold text-neutral-200 group-hover:text-white">{suggestion.label}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-3 rounded-lg border border-dashed border-neutral-700 text-neutral-500 text-xs text-center">
                                Nenhuma sugestão gerada.
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-neutral-800 w-full"></div>

                    {/* VISUAL STUDIO STUDIO PANEL */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                             <h2 className="text-white font-bold text-sm uppercase tracking-wide">Catálogo</h2>
                             <span className="text-[10px] bg-neutral-700 text-neutral-300 px-2 py-0.5 rounded-full font-bold">MANUAL</span>
                        </div>

                        {/* Studio Sub-Tabs */}
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                            <button onClick={() => setStudioTab('places')} className={`px-4 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${studioTab === 'places' ? 'bg-white text-black border-white' : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-500'}`}>
                                🌍 Cenários
                            </button>
                            <button onClick={() => setStudioTab('outfits')} className={`px-4 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${studioTab === 'outfits' ? 'bg-white text-black border-white' : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-500'}`}>
                                👕 Roupas
                            </button>
                            <button onClick={() => setStudioTab('vehicles')} className={`px-4 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${studioTab === 'vehicles' ? 'bg-white text-black border-white' : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-500'}`}>
                                🏎️ Veículos
                            </button>
                        </div>

                        {/* Visual Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {studioAssets[studioTab].map((asset) => (
                                <button 
                                    key={asset.id}
                                    onClick={() => addToPrompt(asset.prompt)}
                                    className="group relative flex flex-col items-center justify-center bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 hover:border-white/40 rounded-xl p-4 transition-all active:scale-95 h-24"
                                >
                                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform filter drop-shadow-lg">
                                        {asset.emoji}
                                    </div>
                                    <span className="text-xs font-bold text-neutral-300 group-hover:text-white text-center">
                                        {asset.label}
                                    </span>
                                    {/* Selection Indicator if prompt contains part of text (simple check) */}
                                    {prompt.includes(asset.label.split(' ')[0]) && (
                                        <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full shadow-glow"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Prompt Input Area */}
                    <div className="mt-2 pt-4 border-t border-neutral-800">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 block">
                           Seu Prompt (Editável)
                        </label>
                        <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="flex flex-col gap-3">
                            <textarea 
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={editHotspot ? "Comando pronto. Clique em Gerar." : "Toque na imagem ou clique num card acima..."}
                                disabled={isLoading}
                                rows={3}
                                className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-xl p-4 text-sm focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 outline-none resize-none transition-all disabled:opacity-50"
                            />
                            <button 
                                type="submit" 
                                disabled={isLoading || !prompt.trim()}
                                className="w-full btn-instagram text-white font-bold rounded-xl py-3 text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                            >
                                {isLoading ? <span className="animate-pulse">Transformando...</span> : <> <MagicWandIcon className="w-4 h-4"/> Gerar Transformação </>}
                            </button>
                        </form>
                    </div>

                </div>
            )}

            {activeTab === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} />}
            {activeTab === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} isLoading={isLoading} />}
            {activeTab === 'crop' && (
                <CropPanel 
                    onApplyCrop={handleApplyCrop} 
                    onSetAspect={setAspect} 
                    isLoading={isLoading} 
                    isCropping={!!completedCrop?.width && completedCrop.width > 0} 
                />
            )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900 flex flex-col gap-3">
             <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2">
                    <button onClick={handleUndo} disabled={!canUndo} className="p-3 rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 disabled:opacity-30 transition-colors" title="Desfazer">
                        <UndoIcon className="w-5 h-5" />
                    </button>
                    <button onClick={handleRedo} disabled={!canRedo} className="p-3 rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 disabled:opacity-30 transition-colors" title="Refazer">
                        <RedoIcon className="w-5 h-5" />
                    </button>
                </div>
                
                {activeTab === 'retouch' && canUndo && (
                     <button 
                        onMouseDown={() => setIsComparing(true)}
                        onMouseUp={() => setIsComparing(false)}
                        onTouchStart={() => setIsComparing(true)}
                        onTouchEnd={() => setIsComparing(false)}
                        className="flex items-center gap-2 px-4 py-3 rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700 text-xs font-bold uppercase tracking-wide transition-colors"
                     >
                        <EyeIcon className="w-4 h-4" /> Comparar
                     </button>
                )}
             </div>

             <div className="flex gap-2 mt-2">
                <button onClick={handleUploadNew} className="flex-1 py-3 rounded-lg bg-neutral-800 text-neutral-300 text-sm font-bold border border-neutral-700 hover:bg-neutral-700 transition-colors">
                    Nova Foto
                </button>
                <button onClick={handleDownload} className="flex-[2] py-3 rounded-lg bg-white text-black text-sm font-bold hover:bg-gray-200 transition-colors shadow-lg">
                    Salvar Imagem
                </button>
             </div>
        </div>
    </div>
  );

  return (
      <>
        {currentImageUrl ? (
             <div className="flex h-screen bg-black overflow-hidden font-sans">
                
                {/* Left Column: Canvas */}
                <div className="flex-1 relative flex items-center justify-center bg-neutral-950 p-8 overflow-hidden">
                     {/* Background Grid Pattern for professionalism */}
                     <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                     
                     {/* Loading Overlay (Centered on Canvas) */}
                     {isLoading && (
                        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center">
                            <Spinner />
                            <p className="text-white/80 mt-4 text-sm font-medium animate-pulse">Processando com IA...</p>
                        </div>
                     )}

                     <div className="relative max-w-full max-h-full shadow-2xl">
                        {activeTab === 'crop' ? (
                            <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={aspect} className="max-h-[85vh]">
                                <img src={currentImageUrl} alt="Crop" className="max-h-[85vh] w-auto object-contain" />
                            </ReactCrop>
                        ) : (
                            <>
                                {/* Original Layer for Compare */}
                                {originalImageUrl && (
                                     <img 
                                        src={originalImageUrl} 
                                        className={`absolute inset-0 w-full h-full object-contain z-20 transition-opacity duration-200 ${isComparing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
                                        alt="Original"
                                    />
                                )}
                                {/* Current Layer */}
                                <img
                                    ref={imgRef}
                                    src={currentImageUrl}
                                    alt="Current"
                                    onClick={handleImageClick}
                                    className={`max-h-[85vh] w-auto object-contain transition-all duration-200 ${editHotspot ? 'cursor-crosshair' : 'cursor-pointer'}`}
                                    style={{ boxShadow: '0 0 50px rgba(0,0,0,0.5)' }}
                                />
                                
                                {/* Hotspot Marker */}
                                {displayHotspot && activeTab === 'retouch' && !isLoading && (
                                     <div 
                                        className="absolute rounded-full w-4 h-4 border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none bg-pink-500/50 backdrop-blur-sm animate-pulse"
                                        style={{ left: `${displayHotspot.x}px`, top: `${displayHotspot.y}px` }}
                                    />
                                )}
                            </>
                        )}
                     </div>
                </div>

                {/* Right Column: Sidebar */}
                {renderSidebar()}

             </div>
        ) : (
            <div className="min-h-screen bg-black flex flex-col">
                 <Header />
                 <div className="flex-1 flex items-center justify-center p-4">
                    <StartScreen onFileSelect={handleFileSelect} />
                 </div>
            </div>
        )}
      </>
  );
};

export default App;
