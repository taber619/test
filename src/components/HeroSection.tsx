import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  UploadCloud, 
  Camera, 
  Link, 
  X, 
  AlertCircle, 
  Eye, 
  Settings, 
  Shield, 
  Trash2, 
  Image as ImageIcon, 
  RefreshCw, 
  Edit3, 
  Sparkles,
  Upload,
  FolderOpen,
  ShieldCheck,
  Zap,
  Clock,
  Play
} from "lucide-react";
import { processImage } from "../utils/imageProcessor";
import ImageEditorModal from "./ImageEditorModal";

interface SelectedFile {
  id: string;
  file: File;
  previewUrl: string;
}

interface HeroSectionProps {
  onUploadStart: (
    files: File[], 
    deleteAfter: string, 
    password?: string,
    watermarkOptions?: {
      addWatermark: boolean;
      watermarkText: string;
      watermarkOpacity: number;
      watermarkColor: string;
      watermarkSize: number;
      watermarkPosition: string;
    }
  ) => Promise<void>;
  onSwitchToUrlUpload: () => void;
  isUploading: boolean;
  uploadProgress: number;
  homepageTitle?: string;
  homepageSubtitle?: string;
}

export default function HeroSection({
  onUploadStart,
  onSwitchToUrlUpload,
  isUploading,
  uploadProgress,
  homepageTitle = "Resimlerinizi Saniyeler İçinde Paylaşın",
  homepageSubtitle = "Türkiye'nin en hızlı resim yükleme platformu.",
}: HeroSectionProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [deleteAfter, setDeleteAfter] = useState<string>("never");
  const [password, setPassword] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Image editing & processing options
  const [editingFile, setEditingFile] = useState<SelectedFile | null>(null);
  const [compressionMode, setCompressionMode] = useState<"original" | "webp-high" | "webp-medium" | "webp-low">("original");
  const [stripMetadata, setStripMetadata] = useState<boolean>(true);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);

  // Watermark options (Filigran)
  const [addWatermark, setAddWatermark] = useState<boolean>(false);
  const [watermarkText, setWatermarkText] = useState<string>("© HızlıResim");
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.5);
  const [watermarkColor, setWatermarkColor] = useState<string>("#ffffff");
  const [watermarkSize, setWatermarkSize] = useState<number>(0.04);
  const [watermarkPosition, setWatermarkPosition] = useState<"bottom-right" | "bottom-left" | "top-right" | "top-left" | "center">("bottom-right");

  // Camera integration state
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clipboard paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isUploading) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      const newFiles: SelectedFile[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1 || items[i].type.indexOf("video") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            if (selectedFiles.length + newFiles.length >= 10) {
              setErrorMsg("Aynı anda en fazla 10 dosya yükleyebilirsiniz.");
              continue;
            }
            const isVideo = file.type.startsWith("video/");
            const maxSize = isVideo ? 100 * 1024 * 1024 : 20 * 1024 * 1024;
            const maxSizeLabel = isVideo ? "100 MB" : "20 MB";
            if (file.size > maxSize) {
              setErrorMsg(`Dosya boyutu ${maxSizeLabel} sınırını aşamaz.`);
              continue;
            }
            newFiles.push({
              id: "paste-" + Date.now() + "-" + Math.random(),
              file,
              previewUrl: URL.createObjectURL(file),
            });
          }
        }
      }

      if (newFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...newFiles]);
        setErrorMsg(null);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [selectedFiles, isUploading]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
      if (e.currentTarget) {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({
          x: e.clientX - rect.left - rect.width / 2,
          y: e.clientY - rect.top - rect.height / 2,
        });
      }
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setErrorMsg(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = (files: File[]) => {
    const validFiles = files.filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (validFiles.length === 0) {
      setErrorMsg("Lütfen geçerli bir görsel (JPG, PNG, GIF, WEBP) veya video (MP4, WEBM, vb.) yükleyin.");
      return;
    }

    const currentCount = selectedFiles.length;
    const incoming: SelectedFile[] = [];

    for (const f of validFiles) {
      if (currentCount + incoming.length >= 10) {
        setErrorMsg("Aynı anda en fazla 10 dosya yükleyebilirsiniz.");
        break;
      }
      const isVideo = f.type.startsWith("video/");
      const maxSize = isVideo ? 100 * 1024 * 1024 : 20 * 1024 * 1024;
      const sizeLabel = isVideo ? "100 MB" : "20 MB";
      
      if (f.size > maxSize) {
        setErrorMsg(`${f.name} boyutu ${sizeLabel} sınırını aştığı için eklenmedi.`);
        continue;
      }
      incoming.push({
        id: "file-" + Date.now() + "-" + Math.random(),
        file: f,
        previewUrl: URL.createObjectURL(f),
      });
    }

    setSelectedFiles((prev) => [...prev, ...incoming]);
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => {
      const target = prev.find((x) => x.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((x) => x.id !== id);
    });
  };

  const clearAll = () => {
    selectedFiles.forEach((x) => URL.revokeObjectURL(x.previewUrl));
    setSelectedFiles([]);
    setPassword("");
    setErrorMsg(null);
  };

  const triggerUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsOptimizing(true);
    setErrorMsg(null);
    try {
      const processedFiles = await Promise.all(
        selectedFiles.map(async (item) => {
          // Skip WebP / canvas processing on raw GIF files or video files to preserve quality and video playback
          if (item.file.type === "image/gif" || item.file.type.startsWith("video/")) {
            return item.file;
          }
          try {
            return await processImage(item.file, {
              compressionMode,
              stripMetadata,
              addWatermark,
              watermarkText,
              watermarkOpacity,
              watermarkColor,
              watermarkSize,
              watermarkPosition,
            });
          } catch (err) {
            console.error("Görsel işleme başarısız, orijinal dosya kullanılıyor:", item.file.name, err);
            return item.file;
          }
        })
      );
      setIsOptimizing(false);
      await onUploadStart(
        processedFiles, 
        deleteAfter, 
        password || undefined,
        addWatermark ? {
          addWatermark,
          watermarkText,
          watermarkOpacity,
          watermarkColor,
          watermarkSize,
          watermarkPosition,
        } : undefined
      );
      clearAll();
    } catch (err) {
      setIsOptimizing(false);
      setErrorMsg("Görseller yüklemeye hazırlanırken bir hata oluştu.");
    }
  };

  // Camera capture controls
  const startCamera = async () => {
    setCameraActive(true);
    setFacingMode("user"); // Start with front camera by default
    setErrorMsg(null);
  };

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    
    const runCamera = async () => {
      if (!cameraActive) return;
      try {
        // Stop current active stream if any
        if (videoRef.current && videoRef.current.srcObject) {
          const oldStream = videoRef.current.srcObject as MediaStream;
          oldStream.getTracks().forEach((track) => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: facingMode } 
        });
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setErrorMsg("Kameraya erişim sağlanamadı veya seçtiğiniz kamera modu desteklenmiyor.");
        // Try falling back to any available video source if environment/user mode fails
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
          activeStream = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
          }
        } catch (fbErr) {
          setErrorMsg("Kameraya erişim sağlanamadı. Lütfen kamera izinlerini kontrol edin.");
          setCameraActive(false);
        }
      }
    };

    if (cameraActive) {
      runCamera();
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraActive, facingMode]);

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const capturedFile = new File([blob], `kamere_cekim_${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            if (selectedFiles.length >= 10) {
              setErrorMsg("Görsel yükleme limitine ulaştınız (Maks 10).");
              return;
            }
            setSelectedFiles((prev) => [
              ...prev,
              {
                id: "cam-" + Date.now(),
                file: capturedFile,
                previewUrl: URL.createObjectURL(capturedFile),
              },
            ]);
            stopCamera();
          }
        }, "image/jpeg", 0.9);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 animate-fade-in text-slate-800 dark:text-slate-100" id="hero-upload-area">
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
          {homepageTitle}
        </h1>
        <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 font-medium">
          {homepageSubtitle}
        </p>
      </div>

      {/* Warning/Error Banner */}
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs sm:text-sm font-semibold rounded-2xl border border-red-100 dark:border-red-900/20 flex items-start gap-3 shadow-sm animate-fade-in" id="hero-error-banner">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Drag-Drop Box */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative w-full bg-white dark:bg-slate-900/40 rounded-3xl border-2 transition-all duration-300 p-2 ${
          dragActive
            ? "border-blue-600 dark:border-blue-500 scale-[0.99] shadow-inner"
            : "border-slate-300 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500"
        } border-dashed shadow-sm`}
        id="drag-drop-zone"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="image/*,video/*"
          className="hidden"
          id="hidden-file-input"
        />

        {/* Interactive Drag and Drop Visual Feedback Overlay */}
        <AnimatePresence>
          {dragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-blue-600/10 dark:bg-blue-950/20 backdrop-blur-[6px] rounded-3xl z-30 flex flex-col items-center justify-center p-6 overflow-hidden pointer-events-none"
            >
              {/* Pulsing radar rings in background */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-96 h-96 border border-blue-500/20 rounded-full animate-ping opacity-60" style={{ animationDuration: '3s' }} />
                <div className="w-64 h-64 border-2 border-dashed border-blue-500/10 rounded-full animate-spin-slow" />
              </div>

              {/* Centered Floating Mock Photo Frame following the cursor */}
              <motion.div
                animate={{
                  x: mousePos.x * 0.35,
                  y: mousePos.y * 0.35,
                  rotateX: -mousePos.y * 0.04,
                  rotateY: mousePos.x * 0.04,
                }}
                transition={{ type: "spring", damping: 15, stiffness: 120 }}
                className="relative bg-white/95 dark:bg-slate-900/95 border border-slate-100 dark:border-slate-800/80 p-4 rounded-3xl shadow-2xl flex flex-col items-center gap-3 w-64 max-w-full transform-gpu"
                style={{ perspective: 1000 }}
              >
                {/* Photo mockup with a dynamic landscape illustration */}
                <div className="relative w-full aspect-square rounded-2xl bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-purple-500/20 border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col items-center justify-center">
                  
                  {/* Glowing core icon */}
                  <motion.div 
                    animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                    className="p-4 bg-blue-600/15 text-blue-600 dark:text-blue-400 rounded-2xl shadow-inner relative z-10"
                  >
                    <UploadCloud className="w-8 h-8" />
                  </motion.div>

                  {/* Little shiny star sparkles */}
                  <div className="absolute top-3 right-3 text-amber-500 animate-pulse">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  
                  {/* Supported formats layout */}
                  <div className="absolute inset-x-3 bottom-3 flex gap-1 justify-center z-10">
                    <span className="text-[9px] bg-blue-600/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">PNG</span>
                    <span className="text-[9px] bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">JPG</span>
                    <span className="text-[9px] bg-purple-600/10 dark:bg-purple-400/10 text-purple-600 dark:text-purple-400 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">WEBP</span>
                    <span className="text-[9px] bg-emerald-600/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">GIF</span>
                  </div>
                </div>

                <div className="text-center">
                  <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider block">Görsel Algılandı</span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1 block">Yüklemek İçin Bırakın</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {selectedFiles.length === 0 ? (
            /* Empty drop zone state - matches the Sleek Design */
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="bg-gradient-to-b from-blue-50/40 to-blue-50/10 dark:from-slate-900/40 dark:to-slate-950/20 rounded-[22px] py-16 px-6 sm:px-12 flex flex-col items-center text-center border border-white/60 dark:border-slate-800/40 relative overflow-hidden"
              id="drop-zone-empty"
            >
              {/* Dynamic Grid Background Pattern inside the card */}
              <div 
                className="absolute inset-0 opacity-[0.03] dark:opacity-[0.015] pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(#2563eb 1.5px, transparent 1.5px)",
                  backgroundSize: "24px 24px"
                }}
              />

              {/* Top Technology Badge */}
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 dark:border-blue-400/20 mb-6 animate-fade-in relative z-10">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-pulse" />
                <span className="text-[10px] font-black tracking-wider text-blue-600 dark:text-blue-400 uppercase">
                  Hızlı & Güvenli Paylaşım
                </span>
              </div>

              {/* Glowing animated Upload Cloud Icon wrapper */}
              <div className="relative group mb-6 relative z-10">
                {/* Pulsing ring */}
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full blur-md opacity-25 group-hover:opacity-40 transition-opacity duration-300 animate-pulse" />
                
                {/* Custom stacked visual container */}
                <div className="relative w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-blue-200 dark:shadow-none transform group-hover:scale-105 transition-all duration-300">
                  <UploadCloud className="h-11 w-11 transform group-hover:-translate-y-1 transition-transform duration-300" />
                  
                  {/* Secondary tiny upload indicator */}
                  <div className="absolute bottom-1 right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-white dark:border-slate-900">
                    <ShieldCheck className="w-3 h-3" />
                  </div>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2.5 tracking-tight relative z-10">
                Resimlerinizi Sürükleyip Bırakın 👋
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-lg leading-relaxed text-sm relative z-10">
                Dilerseniz görsel dosyalarınızı bu alana bırakabilir, dilerseniz de panodan kopyaladığınız resimleri doğrudan <span className="font-mono bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md text-xs text-slate-800 dark:text-slate-200 font-bold border border-slate-300/40 dark:border-slate-700/60 shadow-sm">Ctrl + V</span> ile yapıştırabilirsiniz.
              </p>

              {/* Core Feature Benefits Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mb-8 relative z-10">
                <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 p-3 rounded-2xl flex items-center gap-3 text-left shadow-sm">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-white block">WebP Sıkıştırma</span>
                    <span className="text-[10px] text-slate-400 block leading-tight">Otomatik boyut optimizasyonu</span>
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 p-3 rounded-2xl flex items-center gap-3 text-left shadow-sm">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-white block">EXIF Gizliliği</span>
                    <span className="text-[10px] text-slate-400 block leading-tight">Kamera ve konum verisini temizleme</span>
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 p-3 rounded-2xl flex items-center gap-3 text-left shadow-sm">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-white block">Otomatik Silinme</span>
                    <span className="text-[10px] text-slate-400 block leading-tight">İstediğiniz sürede kendi kendini silme</span>
                  </div>
                </div>
              </div>

              {/* Divider element */}
              <div className="flex items-center gap-4 w-full max-w-md mb-8 relative z-10">
                <div className="h-[1px] bg-slate-200 dark:bg-slate-800/80 flex-grow" />
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">veya</span>
                <div className="h-[1px] bg-slate-200 dark:bg-slate-800/80 flex-grow" />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full relative z-10">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-10 py-4 rounded-xl font-bold text-base transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-blue-500/25 dark:shadow-none flex items-center justify-center gap-2.5 cursor-pointer"
                  id="btn-select-file"
                >
                  <FolderOpen className="w-5 h-5" />
                  Dosya Seç
                </button>

                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full sm:w-auto bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 px-8 py-4 rounded-xl font-bold text-base hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-sm"
                  id="btn-take-cam"
                >
                  <Camera className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  Kamerayla Çek
                </button>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider relative z-10">
                <span className="bg-slate-100 dark:bg-slate-850 px-2 py-1 rounded-md">JPG, PNG, GIF, WEBP, MP4, WEBM</span>
                <div className="h-1.5 w-1.5 bg-slate-300 dark:bg-slate-700 rounded-full hidden sm:block"></div>
                <span className="bg-slate-100 dark:bg-slate-850 px-2 py-1 rounded-md">GÖRSEL: MAKS. 20 MB / VİDEO: MAKS. 100 MB</span>
                <div className="h-1.5 w-1.5 bg-slate-300 dark:bg-slate-700 rounded-full hidden sm:block"></div>
                <button
                  type="button"
                  onClick={onSwitchToUrlUpload}
                  className="text-blue-600 dark:text-blue-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer lowercase font-extrabold flex items-center gap-1"
                  id="btn-url-mode"
                >
                  <Link className="w-3.5 h-3.5" />
                  url'den yükle
                </button>
              </div>
            </motion.div>
          ) : (
            /* File queue review state - matches original structure embedded in sleek card */
            <motion.div
              key="has-files-state"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="bg-slate-50/40 dark:bg-slate-900/30 rounded-[22px] py-8 px-6 sm:px-8 text-left border border-white/60 dark:border-slate-800/40"
              id="drop-zone-has-files"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base flex items-center gap-1.5">
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                  Seçilen Görseller ({selectedFiles.length}/10)
                </h3>
                <button
                  onClick={clearAll}
                  className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Tümünü Kaldır
                </button>
              </div>

              {/* Thumbnails grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6" id="selected-thumbnails-grid">
                <AnimatePresence>
                  {selectedFiles.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.85, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: -15 }}
                      transition={{ type: "spring", damping: 20, stiffness: 150 }}
                      whileHover={{ scale: 1.02 }}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-2xl relative group flex flex-col justify-between hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 shadow-sm"
                    >
                      <div className="aspect-square rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950 relative flex items-center justify-center border border-slate-100 dark:border-slate-850">
                        {item.file.type.startsWith("video/") ? (
                          <div className="w-full h-full relative">
                            <video
                              src={item.previewUrl}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                            />
                            {/* Video Play Icon Overlay */}
                            <div className="absolute inset-0 bg-black/25 flex items-center justify-center pointer-events-none">
                              <div className="p-2 bg-white/90 dark:bg-slate-900/90 rounded-full shadow-lg text-blue-600">
                                <Play className="w-4 h-4 fill-current" />
                              </div>
                            </div>
                            <span className="absolute bottom-1.5 left-1.5 text-[8px] font-extrabold bg-blue-600 text-white px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                              VIDEO
                            </span>
                          </div>
                        ) : (
                          <img
                            src={item.previewUrl}
                            alt={item.file.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                        
                        {/* Floating Delete Button */}
                        <button
                          onClick={() => removeFile(item.id)}
                          className="absolute top-1.5 right-1.5 p-1 bg-black/60 text-white hover:bg-black/80 rounded-full transition-colors cursor-pointer z-10"
                          title={item.file.type.startsWith("video/") ? "Videoyu Kaldır" : "Görseli Kaldır"}
                        >
                          <X className="w-3 h-3" />
                        </button>

                        {/* Floating Edit Button (Pencil Icon) */}
                        {!item.file.type.startsWith("video/") && (
                          <button
                            onClick={() => setEditingFile(item)}
                            className="absolute bottom-1.5 right-1.5 p-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-full transition-colors cursor-pointer z-10 shadow-md shadow-blue-500/20 flex items-center justify-center"
                            title="Görseli Düzenle (Kırp, Filtrele, Döndür)"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="mt-1.5 px-1">
                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate" title={item.file.name}>
                          {item.file.name}
                        </p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                          {formatSize(item.file.size)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

            {/* Extra Settings & Configurations panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 shadow-sm">
              {/* Expire settings */}
              <div>
                <label className="text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wide block mb-2 pl-0.5">
                  Otomatik Silinme Süresi
                </label>
                <select
                  value={deleteAfter}
                  onChange={(e) => setDeleteAfter(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer hover:border-slate-300"
                >
                  <option value="never">Süresiz (Kalıcı)</option>
                  <option value="1h">1 Saat Sonra Sil</option>
                  <option value="1d">1 Gün Sonra Sil</option>
                  <option value="1w">1 Hafta Sonra Sil</option>
                  <option value="1m">1 Ay Sonra Sil</option>
                </select>
              </div>

              {/* Password setting */}
              <div>
                <label className="text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1 mb-2 pl-0.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-500" />
                  Şifre Koruması (Opsiyonel)
                </label>
                <input
                  type="password"
                  placeholder="Görseli kilitlemek için şifre girin..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300"
                />
              </div>

              {/* WebP and Automatic Compression Setting */}
              <div>
                <label className="text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1 mb-2 pl-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  WebP & Otomatik Boyut Sıkıştırma
                </label>
                <select
                  value={compressionMode}
                  onChange={(e) => setCompressionMode(e.target.value as any)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer hover:border-slate-300"
                >
                  <option value="original">Orijinal Kalite (Sıkıştırma Yok)</option>
                  <option value="webp-high">WebP (Yüksek Kalite - En Az Sıkıştırma)</option>
                  <option value="webp-medium">WebP (Dengeli Sıkıştırma - Önerilen)</option>
                  <option value="webp-low">WebP (Yüksek Sıkıştırma - Düşük Boyut)</option>
                </select>
              </div>

              {/* EXIF Privacy Shield setting */}
              <div className="flex flex-col justify-center">
                <label className="text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1 mb-2.5 pl-0.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  EXIF Gizlilik Kalkanı
                </label>
                <label className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 cursor-pointer hover:border-slate-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={stripMetadata}
                    onChange={(e) => setStripMetadata(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 bg-gray-100 rounded border-gray-300 focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 accent-emerald-500 cursor-pointer"
                  />
                  <div className="text-left">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">EXIF / Metadata Temizle</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block leading-tight">Konum, kamera ve çekim tarihini tamamen siler.</span>
                  </div>
                </label>
              </div>

              {/* Watermark Section (Filigran) */}
              <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-800/60 pt-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                      Görsel ve Video Üzerine Filigran (Watermark)
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">
                      Yükleyeceğiniz görsel veya videoların üzerine dilediğiniz gibi özel telif yazısı veya filigran ekleyin.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer self-start sm:self-center">
                    <input
                      type="checkbox"
                      checked={addWatermark}
                      onChange={(e) => setAddWatermark(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {addWatermark ? "Filigran Aktif" : "Filigran Kapalı"}
                    </span>
                  </label>
                </div>

                {addWatermark && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-xl mt-3 animate-fade-in">
                    {/* Watermark text */}
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
                        Filigran Metni
                      </label>
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="Örn: © HızlıResim"
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                      />
                    </div>

                    {/* Watermark position */}
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
                        Konum
                      </label>
                      <select
                        value={watermarkPosition}
                        onChange={(e) => setWatermarkPosition(e.target.value as any)}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-sm"
                      >
                        <option value="bottom-right">Sağ Alt Köşe</option>
                        <option value="bottom-left">Sol Alt Köşe</option>
                        <option value="top-right">Sağ Üst Köşe</option>
                        <option value="top-left">Sol Üst Köşe</option>
                        <option value="center">Ortalanmış</option>
                      </select>
                    </div>

                    {/* Watermark Color & size */}
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
                        Renk & Görünüm
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={watermarkColor}
                          onChange={(e) => setWatermarkColor(e.target.value)}
                          className="flex-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-2 font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-sm"
                        >
                          <option value="#ffffff">Beyaz Yazı</option>
                          <option value="#000000">Siyah Yazı</option>
                          <option value="#ef4444">Kırmızı Yazı</option>
                          <option value="#eab308">Sarı Yazı</option>
                          <option value="#3b82f6">Mavi Yazı</option>
                        </select>

                        <select
                          value={watermarkOpacity.toString()}
                          onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                          className="w-20 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-1.5 py-2 font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-sm"
                        >
                          <option value="0.2">20% Opak</option>
                          <option value="0.4">40% Opak</option>
                          <option value="0.6">60% Opak</option>
                          <option value="0.8">80% Opak</option>
                          <option value="1.0">100% Opak</option>
                        </select>
                      </div>
                    </div>

                    {/* Watermark size proportion */}
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
                        Boyut Oranı
                      </label>
                      <select
                        value={watermarkSize.toString()}
                        onChange={(e) => setWatermarkSize(parseFloat(e.target.value))}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-sm"
                      >
                        <option value="0.02">Çok Küçük (2%)</option>
                        <option value="0.04">Normal (4%)</option>
                        <option value="0.06">Orta (6%)</option>
                        <option value="0.08">Büyük (8%)</option>
                        <option value="0.10">Çok Büyük (10%)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

              {/* Execute trigger */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold text-xs rounded-xl transition-all cursor-pointer bg-white dark:bg-slate-900"
                >
                  Daha Fazla Ekle
                </button>

                <button
                  onClick={triggerUpload}
                  disabled={isUploading || isOptimizing}
                  className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-100 dark:shadow-none transition-all flex items-center gap-1.5 cursor-pointer"
                  id="btn-start-upload"
                >
                  Görselleri Yükle ({selectedFiles.length})
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Optimizing files overlay */}
      {isOptimizing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100 dark:border-slate-800">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <h4 className="font-extrabold text-slate-800 dark:text-white text-base">Görselleriniz Optimize Ediliyor</h4>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1.5 leading-relaxed">
              Boyutlar sıkıştırılıyor ve EXIF gizlilik verileri temizleniyor. Lütfen tarayıcıyı kapatmayınız...
            </p>
          </div>
        </div>
      )}

      {/* Uploading progress overlay */}
      {isUploading && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100 dark:border-slate-800">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <h4 className="font-extrabold text-slate-800 dark:text-white text-base">Görselleriniz Yükleniyor</h4>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Lütfen tarayıcıyı kapatmayınız.</p>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-6">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <span className="text-[10px] font-bold text-slate-500 mt-2 block">{uploadProgress}% Tamamlandı</span>
          </div>
        </div>
      )}

      {/* Camera modal Overlay */}
      {cameraActive && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="bg-slate-900 aspect-video relative">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
              
              {/* Floating Camera Flip Button */}
              <button
                type="button"
                onClick={() => setFacingMode(prev => prev === "user" ? "environment" : "user")}
                className="absolute top-4 right-4 p-3 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition-all cursor-pointer flex items-center justify-center border border-white/10"
                title="Kamerayı Değiştir (Ön / Arka)"
                id="btn-flip-camera"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              {/* Active Mode Indicator */}
              <span className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-sm border border-white/10">
                {facingMode === "user" ? "Ön Kamera (Selfie)" : "Arka Kamera (Çevre)"}
              </span>
            </div>
            <div className="p-5 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-850">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Hazır olduğunuzda çekime basın!</span>
              <div className="flex gap-2">
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  İptal
                </button>
                <button
                  onClick={capturePhoto}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  Fotoğraf Çek
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Editor Modal Portal */}
      {editingFile && (
        <ImageEditorModal
          item={editingFile}
          onClose={() => setEditingFile(null)}
          onSave={(editedFile, newPreviewUrl) => {
            setSelectedFiles((prev) =>
              prev.map((x) =>
                x.id === editingFile.id
                  ? { ...x, file: editedFile, previewUrl: newPreviewUrl }
                  : x
              )
            );
            setEditingFile(null);
          }}
        />
      )}
    </div>
  );
}
