
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, analyzeImageForSuggestions, generateWizardImage } from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import { UndoIcon, RedoIcon, EyeIcon, MagicWandIcon, PaletteIcon, SunIcon, UploadIcon, RefreshIcon } from './components/icons';
import StartScreen from './components/StartScreen';
import { WizardOverlay } from './components/wizard';

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
type StudioTab = 'places' | 'outfits' | 'vehicles' | 'styles';

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
  const [showWizard, setShowWizard] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const currentImage = history[historyIndex] ?? null;
  const originalImage = history[0] ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  // --- VISUAL STUDIO ASSETS - DIVERSIFIED CATALOG ---

  const studioAssets = {
    places: [
        // Natureza & Aventura
        { id: 'beach', emoji: '🏖️', label: 'Praia Tropical', prompt: 'Place subject on a pristine tropical beach, turquoise water, palm trees, warm golden hour light, vacation atmosphere.' },
        { id: 'mountain', emoji: '🏔️', label: 'Montanhas', prompt: 'Place subject on mountain peak at sunrise, dramatic clouds below, sense of achievement and adventure.' },
        { id: 'forest', emoji: '🌲', label: 'Floresta', prompt: 'Place subject in lush green forest, sunbeams through trees, natural peaceful atmosphere, morning mist.' },
        // Urbano Casual
        { id: 'cafe', emoji: '☕', label: 'Café Charmoso', prompt: 'Place subject at cozy outdoor cafe terrace, warm lighting, casual urban lifestyle atmosphere.' },
        { id: 'rooftop', emoji: '🌆', label: 'Terraço Urbano', prompt: 'Place subject on modern rooftop terrace at dusk, city skyline background, relaxed evening vibe.' },
        // Viagens & Cultura
        { id: 'paris', emoji: '🇫🇷', label: 'Paris', prompt: 'Transport subject to Parisian boulevard, Eiffel Tower in distance, classic European architecture, soft romantic light.' },
        { id: 'tokyo', emoji: '🇯🇵', label: 'Tóquio', prompt: 'Place subject in Tokyo at night, neon signs, modern Asian aesthetic, vibrant city energy.' },
        { id: 'santorini', emoji: '🇬🇷', label: 'Santorini', prompt: 'Place subject in Santorini, white architecture, blue domes, bright Mediterranean sunlight, vacation vibe.' },
        { id: 'ny', emoji: '🗽', label: 'Nova York', prompt: 'Place subject in New York City, iconic buildings background, dynamic urban atmosphere, modern lifestyle.' },
        // Luxo & Aspiracional
        { id: 'yacht', emoji: '🛥️', label: 'Iate', prompt: 'Place subject on a superyacht, turquoise water, golden hour sunset, luxury atmosphere.' },
        { id: 'jet', emoji: '✈️', label: 'Jato Particular', prompt: 'Place subject on the tarmac steps of a private jet, luxury luggage, confident pose.' },
        { id: 'desert', emoji: '🏜️', label: 'Deserto', prompt: 'Place subject in desert dunes at sunset, warm golden lighting, adventure travel vibe.' },
    ],
    outfits: [
        // Casual
        { id: 'casual', emoji: '👕', label: 'Casual Moderno', prompt: 'Change outfit to modern casual: fitted henley or polo shirt, dark jeans, clean sneakers, minimalist watch.' },
        { id: 'street', emoji: '🧢', label: 'Streetwear', prompt: 'Change outfit to streetwear style: graphic hoodie or oversized tee, joggers, fresh sneakers, urban aesthetic.' },
        { id: 'summer', emoji: '🌴', label: 'Verão Leve', prompt: 'Change outfit to summer casual: linen shirt, light shorts, loafers, sunglasses, relaxed beach-ready style.' },
        // Formal
        { id: 'suit', emoji: '🤵', label: 'Terno Clássico', prompt: 'Change outfit to tailored navy suit, crisp white shirt, subtle tie optional, polished dress shoes, professional elegance.' },
        { id: 'smart', emoji: '👔', label: 'Social Casual', prompt: 'Change outfit to smart casual: blazer, no tie, chino pants, leather shoes, refined yet relaxed style.' },
        { id: 'gala', emoji: '✨', label: 'Black Tie', prompt: 'Change outfit to elegant black tie tuxedo or evening gown, polished shoes, sophisticated formal occasion look.' },
        // Feminino
        { id: 'dress', emoji: '👗', label: 'Vestido Elegante', prompt: 'Change outfit to elegant cocktail dress, heels, statement jewelry, sophisticated style.' },
        { id: 'chic', emoji: '👚', label: 'Casual Chique', prompt: 'Change outfit to casual chic: flowy blouse, fitted jeans, ankle boots, minimal jewelry, effortless style.' },
        { id: 'boho', emoji: '🌸', label: 'Boho', prompt: 'Change outfit to bohemian style: flowy maxi dress, layered accessories, sandals, natural relaxed aesthetic.' },
        // Temáticos
        { id: 'winter', emoji: '🧥', label: 'Inverno', prompt: 'Change outfit to stylish winter wear: wool coat, scarf, boots, layered warm clothing, cozy seasonal style.' },
        { id: 'leather', emoji: '🏍️', label: 'Rock', prompt: 'Change outfit to edgy rock style: leather jacket, dark jeans, boots, rebellious confident aesthetic.' },
        { id: 'luxury', emoji: '👑', label: 'Alta Costura', prompt: 'Change outfit to luxury designer brands: high fashion pieces, refined accessories, runway-worthy style.' },
    ],
    vehicles: [
        { id: 'sports', emoji: '🏎️', label: 'Esportivo', prompt: 'Place subject next to sleek modern sports car, polished finish, urban or coastal background, aspirational lifestyle.' },
        { id: 'vintage', emoji: '🚗', label: 'Vintage', prompt: 'Place subject with classic vintage car, retro aesthetic, nostalgic vibe, timeless style.' },
        { id: 'moto', emoji: '🏍️', label: 'Moto', prompt: 'Place subject with motorcycle, adventurous spirit, freedom vibe, dynamic rebel aesthetic.' },
        { id: 'convertible', emoji: '🏁', label: 'Conversível', prompt: 'Place subject in convertible with top down, wind in hair, coastal road, carefree driving experience.' },
        { id: 'suv', emoji: '🚙', label: 'SUV Luxo', prompt: 'Place subject with modern luxury SUV, adventure ready, outdoor lifestyle, versatile vehicle aesthetic.' },
        { id: 'bike', emoji: '🚴', label: 'Bicicleta', prompt: 'Place subject with stylish bicycle, urban lifestyle, eco-friendly active vibe, modern city backdrop.' },
    ],
    styles: [
        { id: 'vintage', emoji: '📷', label: 'Vintage Film', prompt: 'Apply vintage film photography aesthetic: grain texture, warm faded colors, nostalgic 70s-80s film look, subtle vignette.' },
        { id: 'noir', emoji: '🎬', label: 'Film Noir', prompt: 'Transform to dramatic film noir style: high contrast black and white, cinematic shadows, mysterious moody lighting, 1940s aesthetic.' },
        { id: 'golden', emoji: '✨', label: 'Hora Dourada', prompt: 'Enhance with golden hour magic: warm golden sunlight, soft glow, dreamy atmospheric haze, romantic lighting.' },
        { id: 'cyberpunk', emoji: '🌃', label: 'Cyberpunk', prompt: 'Apply cyberpunk aesthetic: neon lights, rain reflections, futuristic urban atmosphere, electric blue and pink tones.' },
        { id: 'renaissance', emoji: '🎨', label: 'Renascença', prompt: 'Transform to Renaissance painting style: classical oil painting technique, dramatic chiaroscuro lighting, museum-worthy artistic aesthetic.' },
        { id: 'vogue', emoji: '📸', label: 'Editorial', prompt: 'Apply high-fashion editorial photography style: dramatic lighting, bold composition, Vogue magazine aesthetic, professional studio quality.' },
        { id: 'dreamy', emoji: '☁️', label: 'Onírico', prompt: 'Create dreamy ethereal atmosphere: soft focus, pastel colors, magical light rays, fairy-tale fantasy aesthetic.' },
        { id: 'dramatic', emoji: '⚡', label: 'Dramático', prompt: 'Apply dramatic cinematic style: high contrast, moody atmosphere, powerful lighting, emotional intensity, movie poster aesthetic.' },
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
    setShowWizard(true); // Show wizard after upload
  }, []);

  const handleWizardComplete = useCallback((editedImageUrl: string) => {
    setShowWizard(false);
    const newImageFile = dataURLtoFile(editedImageUrl, `wizard-${Date.now()}.png`);
    addImageToHistory(newImageFile);
    runAnalysis(history[0] || newImageFile); // Run analysis on original
  }, [addImageToHistory, runAnalysis, history]);

  const handleWizardCancel = useCallback(() => {
    setShowWizard(false);
    runAnalysis(history[0]); // Run analysis when wizard is cancelled
  }, [runAnalysis, history]);

  const handleWizardGenerate = useCallback(async (location: string, outfit: string): Promise<string> => {
    if (!currentImage) throw new Error('No image');
    return generateWizardImage(currentImage, location, outfit);
  }, [currentImage]);

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
    <div className="w-full md:w-[400px] flex flex-col border-t md:border-t-0 md:border-l border-neutral-800 bg-neutral-900 flex-shrink-0 z-20 shadow-2xl max-h-[60vh] md:max-h-none">
        {/* Sidebar Header */}
        <div className="p-4 md:p-6 border-b border-neutral-800 flex flex-col items-center">
             <div className="hidden md:block">
                <Header />
             </div>

             {/* Tabs */}
             <div className="flex w-full bg-neutral-800 rounded-xl p-1 md:mt-6">
                {(['retouch', 'crop', 'adjust', 'filters'] as Tab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 flex items-center justify-center py-2.5 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${
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
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
            
            {error && (
                 <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-lg text-xs flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="font-bold hover:text-white">✕</button>
                 </div>
            )}

            {activeTab === 'retouch' && (
                <div className="flex flex-col gap-6 animate-fade-in">
                    
                    {/* SMART AI ANALYSIS SECTION */}
                    <div className="relative">
                         <div className="flex items-center justify-between mb-1">
                             <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                                <MagicWandIcon className="w-3 h-3 text-pink-400"/> Sugestões Inteligentes
                             </h2>
                             {isAnalyzing && <span className="text-[10px] text-neutral-400 animate-pulse">Analisando...</span>}
                        </div>
                        <p className="text-neutral-500 text-[10px] md:text-xs mb-3">Nossa IA analisou sua foto e criou edições personalizadas</p>

                        {isAnalyzing ? (
                            <div className="grid grid-cols-2 gap-2">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className="h-10 bg-neutral-800 rounded-lg animate-pulse border border-neutral-700/50"></div>
                                ))}
                            </div>
                        ) : aiSuggestions.length > 0 ? (
                            <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                                {aiSuggestions.map((suggestion, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setPrompt(suggestion.prompt)}
                                        className="text-left px-2 md:px-3 py-2 bg-neutral-800/50 border border-pink-500/30 hover:bg-neutral-800 hover:border-pink-500 rounded-lg transition-all active:scale-95 group"
                                    >
                                        <span className="text-base md:text-lg mr-1 md:mr-2">{suggestion.emoji}</span>
                                        <span className="text-[10px] md:text-xs font-semibold text-neutral-200 group-hover:text-white">{suggestion.label}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-3 rounded-lg border border-dashed border-neutral-700 text-neutral-400 text-xs text-center flex flex-col items-center gap-2">
                                <MagicWandIcon className="w-5 h-5 opacity-50"/>
                                <p className="font-semibold">Análise automática em breve</p>
                                <p className="text-[10px] text-neutral-500">Ou escolha manualmente no catálogo abaixo</p>
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
                        <div className="flex gap-1.5 md:gap-2 mb-3 md:mb-4 overflow-x-auto pb-2 no-scrollbar">
                            <button onClick={() => setStudioTab('places')} className={`px-3 md:px-4 py-2 rounded-full text-[10px] md:text-xs font-bold border transition-all whitespace-nowrap ${studioTab === 'places' ? 'bg-white text-black border-white' : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-500'}`}>
                                🌍 Cenários
                            </button>
                            <button onClick={() => setStudioTab('outfits')} className={`px-3 md:px-4 py-2 rounded-full text-[10px] md:text-xs font-bold border transition-all whitespace-nowrap ${studioTab === 'outfits' ? 'bg-white text-black border-white' : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-500'}`}>
                                👕 Roupas
                            </button>
                            <button onClick={() => setStudioTab('styles')} className={`px-3 md:px-4 py-2 rounded-full text-[10px] md:text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-1 ${studioTab === 'styles' ? 'bg-white text-black border-white' : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-500'}`}>
                                🎨 Estilos
                                <span className="text-[8px] bg-gradient-to-r from-pink-500 to-purple-500 text-white px-1.5 py-0.5 rounded-full">NOVO</span>
                            </button>
                            <button onClick={() => setStudioTab('vehicles')} className={`px-3 md:px-4 py-2 rounded-full text-[10px] md:text-xs font-bold border transition-all whitespace-nowrap ${studioTab === 'vehicles' ? 'bg-white text-black border-white' : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-500'}`}>
                                🚗 Veículos
                            </button>
                        </div>

                        {/* Visual Grid */}
                        <div className="grid grid-cols-3 md:grid-cols-2 gap-2 md:gap-3">
                            {studioAssets[studioTab].map((asset) => (
                                <button
                                    key={asset.id}
                                    onClick={() => addToPrompt(asset.prompt)}
                                    className="group relative flex flex-col items-center justify-center bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 hover:border-white/40 rounded-xl p-2 md:p-4 transition-all active:scale-95 h-20 md:h-24"
                                >
                                    <div className="text-xl md:text-3xl mb-1 md:mb-2 group-hover:scale-110 transition-transform filter drop-shadow-lg">
                                        {asset.emoji}
                                    </div>
                                    <span className="text-[9px] md:text-xs font-bold text-neutral-300 group-hover:text-white text-center leading-tight">
                                        {asset.label}
                                    </span>
                                    {/* Selection Indicator if prompt contains part of text (simple check) */}
                                    {prompt.includes(asset.label.split(' ')[0]) && (
                                        <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 w-2 h-2 bg-green-500 rounded-full shadow-glow"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Prompt Input Area */}
                    <div className="mt-2 pt-3 md:pt-4 border-t border-neutral-800">
                        <label className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 block">
                           Seu Prompt (Editável)
                        </label>
                        <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="flex flex-col gap-2 md:gap-3">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={editHotspot ? "Comando pronto. Clique em Gerar." : "Toque na imagem ou clique num card acima..."}
                                disabled={isLoading}
                                rows={2}
                                className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-xl p-3 md:p-4 text-xs md:text-sm focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 outline-none resize-none transition-all disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !prompt.trim()}
                                className="w-full btn-instagram text-white font-bold rounded-xl py-2.5 md:py-3 text-xs md:text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
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
        <div className="p-3 md:p-4 border-t border-neutral-800 bg-neutral-900 flex flex-col gap-2 md:gap-3">
             <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1.5 md:gap-2">
                    <button onClick={handleUndo} disabled={!canUndo} className="p-2.5 md:p-3 rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 disabled:opacity-30 transition-colors" title="Desfazer">
                        <UndoIcon className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button onClick={handleRedo} disabled={!canRedo} className="p-2.5 md:p-3 rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 disabled:opacity-30 transition-colors" title="Refazer">
                        <RedoIcon className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                </div>

                {activeTab === 'retouch' && canUndo && (
                     <button
                        onMouseDown={() => setIsComparing(true)}
                        onMouseUp={() => setIsComparing(false)}
                        onTouchStart={() => setIsComparing(true)}
                        onTouchEnd={() => setIsComparing(false)}
                        className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700 text-[10px] md:text-xs font-bold uppercase tracking-wide transition-colors"
                     >
                        <EyeIcon className="w-3.5 h-3.5 md:w-4 md:h-4" /> Comparar
                     </button>
                )}
             </div>

             <div className="flex gap-2 mt-1 md:mt-2">
                <button onClick={handleUploadNew} className="flex-1 py-2.5 md:py-3 rounded-lg bg-neutral-800 text-neutral-300 text-xs md:text-sm font-bold border border-neutral-700 hover:bg-neutral-700 transition-colors">
                    Nova Foto
                </button>
                <button onClick={handleDownload} className="flex-[2] py-2.5 md:py-3 rounded-lg bg-white text-black text-xs md:text-sm font-bold hover:bg-gray-200 transition-colors shadow-lg">
                    Salvar Imagem
                </button>
             </div>
        </div>
    </div>
  );

  return (
      <>
        {showWizard && currentImage && (
          <WizardOverlay
            originalImage={currentImage}
            onComplete={handleWizardComplete}
            onCancel={handleWizardCancel}
            generateImage={handleWizardGenerate}
          />
        )}
        {currentImageUrl ? (
             <div className="flex flex-col md:flex-row h-screen bg-black overflow-hidden font-sans">

                {/* Mobile Header */}
                <div className="md:hidden p-3 border-b border-neutral-800 bg-neutral-900 flex items-center justify-center">
                    <Header />
                </div>

                {/* Left Column: Canvas */}
                <div className="flex-1 relative flex items-center justify-center bg-neutral-950 p-2 md:p-8 overflow-hidden min-h-[40vh] md:min-h-0">
                     {/* Background Grid Pattern for professionalism */}
                     <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                     {/* Loading Overlay (Centered on Canvas) */}
                     {isLoading && (
                        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center">
                            <Spinner />
                            <p className="text-white/80 mt-4 text-xs md:text-sm font-medium animate-pulse">Processando com IA...</p>
                        </div>
                     )}

                     <div className="relative max-w-full max-h-full shadow-2xl">
                        {activeTab === 'crop' ? (
                            <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={aspect} className="max-h-[35vh] md:max-h-[85vh]">
                                <img src={currentImageUrl} alt="Crop" className="max-h-[35vh] md:max-h-[85vh] w-auto object-contain" />
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
                                    className={`max-h-[35vh] md:max-h-[85vh] w-auto object-contain transition-all duration-200 ${editHotspot ? 'cursor-crosshair' : 'cursor-pointer'}`}
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
