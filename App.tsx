
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ClothingItem, LocationData, RecommendationResponse, AppStatus } from './types';
import { getOutfitRecommendation } from './aiService';
// Added missing Sparkles icon to the lucide-react import list
import { Camera, CloudSun, MapPin, Upload, Trash2, RefreshCcw, AlertTriangle, Plus, X, Layers, Baby, Sparkles, Download } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function App() {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [clothes, setClothes] = useState<ClothingItem[]>([]);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [isKidMode, setIsKidMode] = useState<boolean>(false);
  const [activeOptionIndex, setActiveOptionIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const fetchLocation = useCallback(() => {
    setStatus(AppStatus.GETTING_LOCATION);
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setStatus(AppStatus.ERROR);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setError(null);
        setStatus(AppStatus.IDLE);
      },
      (err) => {
        setError(`Geolocation access denied: ${err.message}. Please allow location access.`);
        setStatus(AppStatus.ERROR);
      },
      { timeout: 15000 }
    );
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  const compressImage = (file: File, maxSize: number = 800, quality: number = 0.7): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            } else {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas context failed')); return; }
          ctx.drawImage(img, 0, 0, width, height);

          const base64 = canvas.toDataURL('image/jpeg', quality);
          resolve({ base64, mimeType: 'image/jpeg' });
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const processFiles = async (files: FileList | null) => {
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        const { base64, mimeType } = await compressImage(file);
        const newItem: ClothingItem = {
          id: Math.random().toString(36).substr(2, 9),
          base64,
          mimeType
        };
        setClothes(prev => [...prev, newItem]);
      } catch (err) {
        console.error('Failed to process image:', err);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const removeItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setClothes(prev => prev.filter(item => item.id !== id));
  };

  const generateRecommendation = async () => {
    if (!location) {
      setError("Location is needed to check the weather.");
      return;
    }
    if (clothes.length === 0) {
      setError("Please add at least one item from your wardrobe.");
      return;
    }

    setStatus(AppStatus.ANALYZING);
    setError(null);
    try {
      const result = await getOutfitRecommendation(location, clothes, isKidMode);
      setRecommendation(result);
      setActiveOptionIndex(0);
    } catch (err: any) {
      setError(err.message || "Failed to analyze data. Please try again.");
    } finally {
      setStatus(AppStatus.IDLE);
    }
  };

  const resetAll = () => {
    setRecommendation(null);
    setClothes([]);
    setError(null);
  };

  const activeOption = recommendation?.options[activeOptionIndex];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 select-none">
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
              <CloudSun size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">WeatherWear</h1>

            </div>
          </div>
          <div className="flex items-center gap-2">
            {location && (
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
                <MapPin size={12} className="text-indigo-500" />
                <span>Active</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-4">
            <AlertTriangle className="shrink-0 mt-0.5" size={18} />
            <div className="text-sm flex-1">
              <p className="font-semibold text-red-800">Warning</p>
              <p className="opacity-90">{error}</p>
            </div>
            {!location && (
              <button
                onClick={fetchLocation}
                className="shrink-0 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-medium rounded-lg transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {status === AppStatus.GETTING_LOCATION && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm font-medium">Detecting location...</p>
          </div>
        )}

        {!recommendation && status !== AppStatus.GETTING_LOCATION && (
          <section className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Wardrobe</h2>
                <p className="text-sm text-slate-400">Take photos of your clothes</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => cameraInputRef.current?.click()} className="bg-slate-900 text-white p-3 rounded-xl shadow-lg transition-transform active:scale-95">
                  <Camera size={20} />
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="bg-white border border-slate-200 text-slate-900 p-3 rounded-xl shadow-sm transition-transform active:scale-95">
                  <Upload size={20} />
                </button>
              </div>
              <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
            </div>

            <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
               <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isKidMode ? 'bg-pink-100 text-pink-600' : 'bg-slate-100 text-slate-400'}`}>
                   <Baby size={20} />
                 </div>
                 <div>
                   <p className="text-sm font-bold">Kid Mode</p>
                   <p className="text-[11px] text-slate-400">Prioritize layering</p>
                 </div>
               </div>
               <button onClick={() => setIsKidMode(!isKidMode)} className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${isKidMode ? 'bg-pink-500' : 'bg-slate-300'}`}>
                 <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${isKidMode ? 'translate-x-6' : 'translate-x-0'}`} />
               </button>
            </div>

            {clothes.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-4 bg-white/50">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                  <Camera size={32} />
                </div>
                <p className="text-sm text-slate-400 max-w-[200px]">Add items so AI can create an outfit</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {clothes.map((item) => (
                  <div key={item.id} onClick={() => setPreviewImage(item.base64)} className="group relative aspect-[3/4] bg-white rounded-2xl overflow-hidden border shadow-sm cursor-pointer transition-transform active:scale-95">
                    <img src={item.base64} alt="Item" className="w-full h-full object-cover" />
                    <button onClick={(e) => removeItem(item.id, e)} className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-md text-white rounded-lg">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button onClick={() => cameraInputRef.current?.click()} className="aspect-[3/4] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-50">
                  <Plus size={24} />
                  <span className="text-[10px] font-bold uppercase">Add</span>
                </button>
              </div>
            )}
          </section>
        )}

        {recommendation && activeOption && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <div ref={resultRef} className="bg-white border rounded-3xl overflow-hidden shadow-xl">
              <div className={`p-6 text-white space-y-4 transition-colors ${recommendation.isKidModeActive ? 'bg-pink-600' : 'bg-indigo-950'}`}>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                    <Sparkles size={14} className="opacity-70" />
                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-80">Our Recommendation</p>
                   </div>
                   <div className="flex items-center gap-1">
                     <button onClick={async () => {
                       if (!resultRef.current) return;
                       const canvas = await html2canvas(resultRef.current, { useCORS: true, scale: 2, backgroundColor: '#f8fafc' });
                       const link = document.createElement('a');
                       link.download = `weatherwear-outfit-${Date.now()}.png`;
                       link.href = canvas.toDataURL('image/png');
                       link.click();
                     }} className="p-2 hover:bg-white/10 rounded-full" title="Save as image"><Download size={16} /></button>
                     <button onClick={resetAll} className="p-2 hover:bg-white/10 rounded-full"><RefreshCcw size={16} /></button>
                   </div>
                </div>
                <h2 className="text-xl font-bold leading-tight">{recommendation.weatherSummary}</h2>
                <div className="flex bg-white/10 p-1 rounded-xl">
                   {recommendation.options.map((_, idx) => (
                     <button key={idx} onClick={() => setActiveOptionIndex(idx)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeOptionIndex === idx ? 'bg-white text-slate-900 shadow-sm' : 'text-white'}`}>
                       Option {idx + 1}
                     </button>
                   ))}
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div key={activeOptionIndex} className="animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-2 mb-4">
                     <Layers size={18} className={recommendation.isKidModeActive ? 'text-pink-500' : 'text-indigo-500'} />
                     <h3 className="text-lg font-bold text-slate-800">{activeOption.optionTitle}</h3>
                  </div>
                  <div className="space-y-3">
                    {activeOption.selectedItems.map((recItem, idx) => {
                      const originalImage = clothes.find(c => c.id === recItem.id);
                      return (
                        <div key={idx} onClick={() => originalImage && setPreviewImage(originalImage.base64)} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-4 cursor-pointer hover:bg-slate-100 transition-colors">
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border shrink-0 shadow-sm">
                            {originalImage ? <img src={originalImage.base64} alt={recItem.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Camera size={14} /></div>}
                          </div>
                          <span className="font-bold text-slate-800 text-sm">{recItem.name}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-6 mt-6 border-t border-slate-100 space-y-4">
                    <p className="text-slate-600 text-sm leading-relaxed">{activeOption.reasoning}</p>
                    <div className="grid gap-2">
                      {activeOption.styleTips.map((tip, idx) => (
                        <div key={idx} className="p-3 rounded-xl text-xs italic bg-indigo-50/50 text-indigo-700 border border-indigo-100">"{tip}"</div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <div className="fixed bottom-6 left-0 right-0 px-4 z-40 max-w-4xl mx-auto">
        {!recommendation && clothes.length > 0 && (
          <button disabled={status === AppStatus.ANALYZING} onClick={generateRecommendation} className={`w-full py-4 rounded-2xl font-bold text-white shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 ${isKidMode ? 'bg-pink-600' : 'bg-indigo-600'} disabled:bg-slate-300 disabled:shadow-none`}>
            {status === AppStatus.ANALYZING ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>AI is analyzing weather & wardrobe...</span>
              </>
            ) : (
              <>
                <Sparkles size={20} />
                <span>Get Outfit</span>
              </>
            )}
          </button>
        )}
      </div>

      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-6 right-6 p-3 bg-white/10 text-white rounded-full"><X size={24} /></button>
          <img src={previewImage} alt="Full view" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
}
