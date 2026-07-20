import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Check, 
  RotateCw, 
  FlipHorizontal, 
  FlipVertical, 
  Sliders, 
  Crop, 
  Palette, 
  Undo2, 
  Sun, 
  Contrast, 
  Droplet, 
  ZoomIn, 
  Move 
} from "lucide-react";

interface SelectedFile {
  id: string;
  file: File;
  previewUrl: string;
}

interface ImageEditorModalProps {
  item: SelectedFile;
  onClose: () => void;
  onSave: (editedFile: File, newPreviewUrl: string) => void;
}

type TabType = "crop" | "adjust" | "filter";

export default function ImageEditorModal({ item, onClose, onSave }: ImageEditorModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("crop");
  
  // Transform & Alignment states
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Fine-tuning adjustment states
  const [brightness, setBrightness] = useState<number>(100); // 50 to 150
  const [contrast, setContrast] = useState<number>(100);     // 50 to 150
  const [saturation, setSaturation] = useState<number>(100);   // 0 to 200

  // Filter Preset state
  const [filter, setFilter] = useState<string>("normal"); // normal, grayscale, sepia, vintage, invert

  // Zoom & Pan states for cropping
  const [cropAspect, setCropAspect] = useState<string>("free"); // free, 1:1, 16:9, 4:3
  const [zoom, setZoom] = useState<number>(1.0); // 1.0 to 3.0
  const [panX, setPanX] = useState<number>(0);  // -100 to 100
  const [panY, setPanY] = useState<number>(0);  // -100 to 100

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Initialize and load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = item.previewUrl;
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
  }, [item.previewUrl]);

  // Redraw the canvas on state changes
  useEffect(() => {
    if (!imageLoaded || !imageRef.current || !canvasRef.current) return;

    const img = imageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Define standard logical width/height based on aspect ratio chosen for cropping
    let targetWidth = img.naturalWidth || img.width;
    let targetHeight = img.naturalHeight || img.height;

    // Adjust target dimensions if aspect ratio is locked
    if (cropAspect === "1:1") {
      const minDim = Math.min(targetWidth, targetHeight);
      targetWidth = minDim;
      targetHeight = minDim;
    } else if (cropAspect === "16:9") {
      const calculatedHeight = Math.round((targetWidth * 9) / 16);
      if (calculatedHeight <= targetHeight) {
        targetHeight = calculatedHeight;
      } else {
        targetWidth = Math.round((targetHeight * 16) / 9);
      }
    } else if (cropAspect === "4:3") {
      const calculatedHeight = Math.round((targetWidth * 3) / 4);
      if (calculatedHeight <= targetHeight) {
        targetHeight = calculatedHeight;
      } else {
        targetWidth = Math.round((targetHeight * 4) / 3);
      }
    }

    // Limit maximum canvas resolution for real-time performance and safe storage limits
    const maxDimension = 1600;
    let renderWidth = targetWidth;
    let renderHeight = targetHeight;
    if (renderWidth > maxDimension || renderHeight > maxDimension) {
      if (renderWidth > renderHeight) {
        renderHeight = Math.round((renderHeight * maxDimension) / renderWidth);
        renderWidth = maxDimension;
      } else {
        renderWidth = Math.round((renderWidth * maxDimension) / renderHeight);
        renderHeight = maxDimension;
      }
    }

    canvas.width = renderWidth;
    canvas.height = renderHeight;

    // Clear canvas
    ctx.clearRect(0, 0, renderWidth, renderHeight);

    // Apply color and aesthetic filters
    let filterString = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    if (filter === "grayscale") {
      filterString += " grayscale(100%)";
    } else if (filter === "sepia") {
      filterString += " sepia(100%)";
    } else if (filter === "invert") {
      filterString += " invert(100%)";
    } else if (filter === "vintage") {
      filterString += " sepia(40%) contrast(110%) saturate(130%) hue-rotate(-15deg)";
    }
    ctx.filter = filterString;

    // Translate to center of canvas for flips and rotations
    ctx.save();
    ctx.translate(renderWidth / 2, renderHeight / 2);

    // Apply flip transforms
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    // Apply rotation transforms
    ctx.rotate((rotation * Math.PI) / 180);

    // Determine how image is drawn inside the crop box
    // Default size is to fit the image centered
    const baseScaleX = renderWidth / img.naturalWidth;
    const baseScaleY = renderHeight / img.naturalHeight;
    // We cover the frame
    const baseScale = Math.max(baseScaleX, baseScaleY);

    const finalWidth = img.naturalWidth * baseScale * zoom;
    const finalHeight = img.naturalHeight * baseScale * zoom;

    // Apply user panning offsets (scaled by zoom factor)
    const offsetX = (panX / 100) * (finalWidth - renderWidth);
    const offsetY = (panY / 100) * (finalHeight - renderHeight);

    ctx.drawImage(
      img,
      -finalWidth / 2 - offsetX,
      -finalHeight / 2 - offsetY,
      finalWidth,
      finalHeight
    );

    ctx.restore();
  }, [
    imageLoaded,
    rotation,
    flipH,
    flipV,
    brightness,
    contrast,
    saturation,
    filter,
    cropAspect,
    zoom,
    panX,
    panY
  ]);

  const handleReset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setFilter("normal");
    setCropAspect("free");
    setZoom(1.0);
    setPanX(0);
    setPanY(0);
  };

  const handleSave = () => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        // Create new File with the original filename (or slightly adjusted if we want WebP)
        const format = item.file.type || "image/jpeg";
        const editedFile = new File([blob], item.file.name, {
          type: format,
          lastModified: Date.now(),
        });
        const newPreviewUrl = URL.createObjectURL(editedFile);
        onSave(editedFile, newPreviewUrl);
      }
    }, item.file.type || "image/jpeg", 0.95);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-2 sm:p-4 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden max-w-4xl w-full h-[95vh] sm:h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              Görsel Düzenleyici
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Dosya: <span className="font-mono text-slate-500 dark:text-slate-300">{item.file.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-grow flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* Canvas Workspace (Left) */}
          <div className="flex-grow bg-slate-100 dark:bg-slate-950/60 p-4 flex items-center justify-center relative overflow-hidden min-h-0">
            {/* Checkerboard Pattern for transparent images */}
            <div 
              className="absolute inset-0 opacity-[0.03] dark:opacity-[0.015]"
              style={{
                backgroundImage: "radial-gradient(#000 20%, transparent 20%), radial-gradient(#000 20%, transparent 20%)",
                backgroundPosition: "0 0, 10px 10px",
                backgroundSize: "20px 20px"
              }}
            />

            {!imageLoaded && (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent"></div>
                <span className="text-xs font-bold text-slate-400">Görsel yükleniyor...</span>
              </div>
            )}

            <div className="max-w-full max-h-full flex items-center justify-center p-2 relative">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[40vh] md:max-h-[60vh] object-contain rounded-xl shadow-lg border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          {/* Sidebar Controls (Right) */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 flex flex-col h-[45vh] md:h-full bg-slate-50/50 dark:bg-slate-900/40 shrink-0">
            
            {/* Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("crop")}
                className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "crop"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900/60"
                    : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
              >
                <Crop className="w-4 h-4" />
                Kırp & Yakınlaştır
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("adjust")}
                className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "adjust"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900/60"
                    : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
              >
                <Sliders className="w-4 h-4" />
                Renk Ayarları
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("filter")}
                className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "filter"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900/60"
                    : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
              >
                <Palette className="w-4 h-4" />
                Döndür & Filtre
              </button>
            </div>

            {/* Controls panel scrolling body */}
            <div className="flex-grow p-5 overflow-y-auto space-y-5 text-left min-h-0">
              
              {/* Tab 1: Crop & Zoom */}
              {activeTab === "crop" && (
                <div className="space-y-4 animate-fade-in">
                  {/* Aspect Ratio selectors */}
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                      Kırpma Oranı
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "free", label: "Serbest" },
                        { id: "1:1", label: "Kare (1:1)" },
                        { id: "16:9", label: "Sinematik (16:9)" },
                        { id: "4:3", label: "Klasik (4:3)" },
                      ].map((aspect) => (
                        <button
                          key={aspect.id}
                          type="button"
                          onClick={() => {
                            setCropAspect(aspect.id);
                            // Reset pan when changing aspect ratios to avoid outer limits
                            setPanX(0);
                            setPanY(0);
                          }}
                          className={`py-2 px-3 border text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                            cropAspect === aspect.id
                              ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                          }`}
                        >
                          {aspect.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Zoom slider */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <ZoomIn className="w-3.5 h-3.5 text-blue-500" />
                        Yakınlaştır / Ölçek
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">{zoom.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="3.0"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* Pan X Slider (Only enabled when Zoom > 1.0) */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <Move className="w-3.5 h-3.5 text-indigo-500" />
                        Yatay Konum (X)
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">{panX}%</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      step="1"
                      disabled={zoom <= 1.0}
                      value={panX}
                      onChange={(e) => setPanX(parseInt(e.target.value))}
                      className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-600 ${
                        zoom <= 1.0 ? "bg-slate-100 dark:bg-slate-850 opacity-40 cursor-not-allowed" : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    />
                  </div>

                  {/* Pan Y Slider */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <Move className="w-3.5 h-3.5 text-indigo-500 rotate-90" />
                        Dikey Konum (Y)
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">{panY}%</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      step="1"
                      disabled={zoom <= 1.0}
                      value={panY}
                      onChange={(e) => setPanY(parseInt(e.target.value))}
                      className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-600 ${
                        zoom <= 1.0 ? "bg-slate-100 dark:bg-slate-850 opacity-40 cursor-not-allowed" : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    />
                  </div>

                  {zoom > 1.0 && (
                    <p className="text-[10px] font-semibold text-blue-500 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/10 p-2.5 rounded-xl border border-blue-100/40 dark:border-blue-900/20">
                      💡 Görseli yakınlaştırdınız! Konum kaydırıcılarını kullanarak kırpılacak alanı tam olarak çerçeve içine hizalayabilirsiniz.
                    </p>
                  )}
                </div>
              )}

              {/* Tab 2: Fine-Tuning Adjustments */}
              {activeTab === "adjust" && (
                <div className="space-y-5 animate-fade-in">
                  
                  {/* Brightness */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        Parlaklık (Brightness)
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={brightness}
                      onChange={(e) => setBrightness(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <Contrast className="w-3.5 h-3.5 text-blue-500" />
                        Kontrast (Contrast)
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">{contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={contrast}
                      onChange={(e) => setContrast(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* Saturation */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <Droplet className="w-3.5 h-3.5 text-rose-500" />
                        Doygunluk (Saturation)
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">{saturation}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={saturation}
                      onChange={(e) => setSaturation(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: Rotation, Flip & Preset Filters */}
              {activeTab === "filter" && (
                <div className="space-y-5 animate-fade-in">
                  
                  {/* Rotation & Flips */}
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2.5">
                      Döndür & Aynala
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRotation((prev) => (prev + 90) % 360)}
                        className="flex-1 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <RotateCw className="w-4 h-4 text-slate-500" />
                        90° Döndür
                      </button>

                      <button
                        type="button"
                        onClick={() => setFlipH((prev) => !prev)}
                        className={`p-2.5 border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                          flipH 
                            ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400" 
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                        }`}
                        title="Yatay Çevir"
                      >
                        <FlipHorizontal className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setFlipV((prev) => !prev)}
                        className={`p-2.5 border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                          flipV 
                            ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400" 
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                        }`}
                        title="Dikey Çevir"
                      >
                        <FlipVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Aesthetic Filters */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2.5">
                      Hazır Görsel Filtreleri
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "normal", label: "Normal" },
                        { id: "grayscale", label: "Siyah-Beyaz" },
                        { id: "sepia", label: "Eski Sepya" },
                        { id: "vintage", label: "Nostaljik" },
                        { id: "invert", label: "Renkleri Ters" },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setFilter(preset.id)}
                          className={`py-2 px-2.5 border text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                            filter === preset.id
                              ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Reset All Changes toolbar */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/20 shrink-0">
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-slate-50 dark:bg-slate-900"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Tüm Ayarları Sıfırla
              </button>
            </div>

          </div>
        </div>

        {/* Footer controls */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Vazgeç
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            className="px-7 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-blue-100 dark:shadow-none flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Düzenlemeyi Kaydet
          </button>
        </div>

      </div>
    </div>
  );
}
