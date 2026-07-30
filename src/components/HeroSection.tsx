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
  Play,
  Video,
  Archive,
  FileText,
  File,
  Lock,
  ChevronDown,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { processImage } from "../utils/imageProcessor";
import ImageEditorModal from "./ImageEditorModal";
import AdBannerSection from "./AdBannerSection";
import AdContactModal from "./AdContactModal";

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
  onSwitchToAuth?: () => void;
  isUploading: boolean;
  uploadProgress: number;
  homepageTitle?: string;
  homepageSubtitle?: string;
  currentUser?: any | null;
  siteConfig?: any | null;
  onOpenVipModal?: () => void;
}

export default function HeroSection({
  onUploadStart,
  onSwitchToUrlUpload,
  onSwitchToAuth,
  isUploading,
  uploadProgress,
  homepageTitle = "Resimlerinizi Saniyeler İçinde Paylaşın",
  homepageSubtitle = "Türkiye'nin en hızlı resim yükleme platformu.",
  currentUser,
  siteConfig,
  onOpenVipModal,
}: HeroSectionProps) {
  const isVip = currentUser && (currentUser.isVip || currentUser.role === "admin");
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [deleteAfter, setDeleteAfter] = useState<string>(isVip ? "never" : "1m");
  const [password, setPassword] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAdModalOpen, setIsAdModalOpen] = useState<boolean>(false);

  // Dedicated File Upload form state (matching user reference)
  const [description, setDescription] = useState<string>("");
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [showEmailOrLock, setShowEmailOrLock] = useState<boolean>(false);
  const [recipientEmail, setRecipientEmail] = useState<string>("");

  // Guest upload count state
  const [guestCount, setGuestCount] = useState<number>(0);
  const [guestMaxCount, setGuestMaxCount] = useState<number>(5);
  const [guestMaxMb, setGuestMaxMb] = useState<number>(20);

  const fetchGuestStatus = async () => {
    try {
      let token = localStorage.getItem("inanresim_guest_token");
      const res = await fetch(`/api/guest-status${token ? `?token=${encodeURIComponent(token)}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        if (data.guestToken) {
          localStorage.setItem("inanresim_guest_token", data.guestToken);
        }
        setGuestCount(data.guestUploadCount || 0);
        setGuestMaxCount(data.guestMaxUploadCount ?? 5);
        setGuestMaxMb(data.guestMaxMb ?? 20);
      }
    } catch (e) {
      console.error("Fetch guest status error:", e);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      fetchGuestStatus();
    }
  }, [currentUser, isUploading]);

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
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const hasVideo = selectedFiles.some((x) => x.file.type.startsWith("video/"));
  const hasOnlyVideo = selectedFiles.length > 0 && selectedFiles.every((x) => x.file.type.startsWith("video/"));
  const hasNonMedia = selectedFiles.some((x) => !x.file.type.startsWith("image/") && !x.file.type.startsWith("video/"));

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files), "image");
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files), "video");
    }
  };

  const handleArchiveFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files), "file");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = (files: File[], category?: "image" | "video" | "file") => {
    const isImg = (f: File) => f.type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|bmp|svg|ico)$/i.test(f.name);
    const isVid = (f: File) => f.type.startsWith("video/") || /\.(mp4|webm|mov|avi|mkv|m4v|flv|wmv)$/i.test(f.name);

    let validFiles = files;

    if (category === "image") {
      validFiles = files.filter(isImg);
      if (validFiles.length === 0) {
        setErrorMsg("Lütfen sadece fotoğraf/görsel (JPG, PNG, GIF, WEBP vb.) dosyaları seçiniz.");
        return;
      }
    } else if (category === "video") {
      validFiles = files.filter(isVid);
      if (validFiles.length === 0) {
        setErrorMsg("Lütfen sadece video (MP4, WEBM, MOV vb.) dosyaları seçiniz.");
        return;
      }
    } else if (category === "file") {
      validFiles = files.filter((f) => !isImg(f) && !isVid(f));
      if (validFiles.length === 0) {
        setErrorMsg("Dosya yükle bölümünde fotoğraf ve video yüklenemez! Fotoğraflar ve videolar için lütfen 'Resim Yükle' veya 'Video Yükle' butonlarını kullanınız.");
        return;
      }
    }

    if (validFiles.length === 0) {
      setErrorMsg("Lütfen geçerli bir dosya yükleyin.");
      return;
    }

    if (!currentUser) {
      if (guestCount >= guestMaxCount) {
        setErrorMsg(`Üye olmadan en fazla ${guestMaxCount} adet yükleme yapabilirsiniz. Misafir limitiniz doldu! Sınırsız yükleme yapmak için ücretsiz üye olun.`);
        return;
      }
    }

    const currentCount = selectedFiles.length;
    const incoming: SelectedFile[] = [];

    const maxFilesAllowed = (currentUser && isVip) ? 25 : 10;

    for (const f of validFiles) {
      if (currentCount + incoming.length >= maxFilesAllowed) {
        setErrorMsg(`Aynı anda en fazla ${maxFilesAllowed} dosya yükleyebilirsiniz.${!isVip ? " PRO VIP üyeliğe geçerek tek seferde 25 dosya yükleyebilirsiniz!" : ""}`);
        break;
      }

      const limitMb = !currentUser 
        ? guestMaxMb 
        : (isVip ? (siteConfig?.vipMaxMb ?? 5000) : ((siteConfig?.registeredMaxMb ?? 1000) || 1000));
      const maxSizeBytes = limitMb * 1024 * 1024;
      
      if (maxSizeBytes > 0 && f.size > maxSizeBytes) {
        if (!currentUser) {
          setErrorMsg(`${f.name} boyutu (${(f.size / (1024 * 1024)).toFixed(1)} MB), misafir limiti olan ${limitMb} MB'ı aşıyor. 1 GB'a kadar yüklemek için ücretsiz üye olun veya 5 GB'a kadar yüklemek için PRO VIP olun!`);
        } else if (!isVip) {
          setErrorMsg(`${f.name} boyutu (${(f.size / (1024 * 1024)).toFixed(1)} MB), standart üye limitini (1 GB / 1000 MB) aşıyor. Tek seferde 5 GB'a (5000 MB) kadar dosya ve video yüklemek için lütfen PRO VIP üyeliğe geçin!`);
          if (onOpenVipModal) onOpenVipModal();
        } else {
          setErrorMsg(`${f.name} boyutu (${(f.size / (1024 * 1024)).toFixed(1)} MB), VIP dosya boyut limitini (${limitMb >= 1000 ? `${(limitMb/1000).toFixed(0)} GB` : `${limitMb} MB`}) aşıyor.`);
        }
        continue;
      }
      incoming.push({
        id: "file-" + Date.now() + "-" + Math.random(),
        file: f,
        previewUrl: f.type.startsWith("image/") || f.type.startsWith("video/") ? URL.createObjectURL(f) : "",
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
    setDescription("");
    setIsPublic(true);
    setShowEmailOrLock(false);
    setRecipientEmail("");
    setErrorMsg(null);
  };

  const triggerUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsOptimizing(true);
    setErrorMsg(null);
    try {
      const processedFiles = await Promise.all(
        selectedFiles.map(async (item) => {
          // Skip canvas processing on non-image files (GIF, video, ZIP, RAR, PDF, 7Z, etc.)
          if (item.file.type === "image/gif" || item.file.type.startsWith("video/") || !item.file.type.startsWith("image/")) {
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

      {/* User / Guest Quota Badge */}
      {!currentUser ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-2xl animate-fade-in" id="guest-quota-badge">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
            <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
              Misafir Limiti: <strong className="font-extrabold">{guestMaxMb} MB</strong> | Kalan Yükleme: <strong className="font-extrabold">{Math.max(0, guestMaxCount - guestCount)} / {guestMaxCount}</strong>
            </span>
          </div>
          {onSwitchToAuth && (
            <button
              type="button"
              onClick={onSwitchToAuth}
              className="text-[11px] font-extrabold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
            >
              <Zap className="w-3.5 h-3.5" />
              Sınırsız Yükleme İçin Üye Ol
            </button>
          )}
        </div>
      ) : (
        <div className={`mb-4 flex flex-wrap items-center justify-between gap-2 px-4 py-2 ${isVip ? "bg-amber-500/10 border border-amber-500/30 text-amber-200" : "bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40"} rounded-2xl animate-fade-in`} id="registered-quota-badge">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isVip ? "bg-amber-400" : "bg-emerald-500"} animate-pulse shrink-0`}></span>
            <span className={`text-xs font-extrabold ${isVip ? "text-amber-800 dark:text-amber-300" : "text-emerald-900 dark:text-emerald-300"}`}>
              {isVip ? (
                <>👑 PRO VIP Üye ({currentUser.username}): Yükleme Limiti 5 GB (5000 MB) • Süresiz Saklama Aktif</>
              ) : (
                <>Kayıtlı Üye ({currentUser.username}): Yükleme Limiti 1 GB (1000 MB)</>
              )}
            </span>
          </div>
          {!isVip ? (
            <button
              type="button"
              onClick={onOpenVipModal}
              className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-700/60 flex items-center gap-1 transition-all cursor-pointer"
            >
              👑 5 GB & Süresiz Saklama İçin VIP Ol
            </button>
          ) : (
            <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 rounded-full border border-amber-300/60">
              👑 PRO VIP
            </span>
          )}
        </div>
      )}

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
          ref={imageInputRef}
          onChange={handleImageChange}
          multiple
          accept="image/*"
          className="hidden"
          id="hidden-image-input"
        />
        <input
          type="file"
          ref={videoInputRef}
          onChange={handleVideoChange}
          multiple
          accept="video/*"
          className="hidden"
          id="hidden-video-input"
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleArchiveFileChange}
          multiple
          accept=".zip,.rar,.7z,.pdf,.docx,.doc,.txt,.xlsx,.pptx,.tar,.gz,.iso"
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
                <div className="bg-white/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-3 rounded-2xl flex items-center gap-3 text-left shadow-xs">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-white block">WebP Sıkıştırma</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block leading-tight">Otomatik boyut optimizasyonu</span>
                  </div>
                </div>

                <div className="bg-white/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-3 rounded-2xl flex items-center gap-3 text-left shadow-xs">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-white block">EXIF Gizliliği</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block leading-tight">Kamera ve konum verisini temizleme</span>
                  </div>
                </div>

                <div className="bg-white/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-3 rounded-2xl flex items-center gap-3 text-left shadow-xs">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-white block">Otomatik Silinme</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block leading-tight">İstediğiniz sürede kendi kendini silme</span>
                  </div>
                </div>
              </div>

              {/* Divider element */}
              <div className="flex items-center gap-4 w-full max-w-md mb-8 relative z-10">
                <div className="h-[1px] bg-slate-300 dark:bg-slate-800/80 flex-grow" />
                <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">veya</span>
                <div className="h-[1px] bg-slate-300 dark:bg-slate-800/80 flex-grow" />
              </div>

              {/* Explicit Upload Category Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl relative z-10" id="hero-action-buttons-group">
                {/* Resim Yükle Button */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-3.5 rounded-xl font-bold text-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-md shadow-blue-500/20 flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
                  id="btn-upload-image"
                >
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>Resim Yükle</span>
                  </div>
                  <span className="text-[10px] text-blue-100 font-normal">JPG, PNG, WEBP, GIF</span>
                </button>

                {/* Video Yükle Button */}
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-3.5 rounded-xl font-bold text-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-md shadow-indigo-500/20 flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
                  id="btn-upload-video"
                >
                  <div className="flex items-center gap-2">
                    <Video className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>Video Yükle</span>
                  </div>
                  <span className="text-[10px] text-indigo-100 font-normal">MP4, WEBM, MOV</span>
                </button>

                {/* Dosya Yükle Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 hover:from-slate-900 hover:to-black text-white px-4 py-3.5 rounded-xl font-bold text-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-md shadow-slate-900/20 flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
                  id="btn-upload-file"
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>Dosya Yükle</span>
                  </div>
                  <span className="text-[10px] text-slate-300 font-normal">ZIP, RAR, 7Z, PDF, DOCX</span>
                </button>

                {/* Kamerayla Çek Button */}
                <button
                  type="button"
                  onClick={startCamera}
                  className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 px-4 py-3.5 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 flex flex-col items-center justify-center gap-1.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-xs group"
                  id="btn-take-cam"
                >
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:scale-110 transition-transform" />
                    <span>Kamerayla Çek</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Canlı Fotoğraf</span>
                </button>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-[11px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider relative z-10">
                <span className="bg-slate-200/70 dark:bg-slate-800/80 px-2.5 py-1 rounded-md text-slate-700 dark:text-slate-300">DESTEKLENEN: GÖRSEL, VİDEO & TÜM MEDYA DOSYALARI</span>
                <div className="h-1.5 w-1.5 bg-slate-400 dark:bg-slate-700 rounded-full hidden sm:block"></div>
                <span className="bg-slate-200/70 dark:bg-slate-800/80 px-2.5 py-1 rounded-md text-slate-700 dark:text-slate-300">
                  {!currentUser ? (
                    `MİSAFİR: MAX ${guestMaxMb} MB`
                  ) : isVip ? (
                    `👑 PRO VIP LİMİTİ: 5 GB (5000 MB)`
                  ) : (
                    `ÜYE LİMİTİ: 1 GB (1000 MB)`
                  )}
                </span>
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
          ) : hasNonMedia ? (
            /* Dedicated Raw File Upload Screen (Exact match to user screenshot reference) */
            <motion.div
              key="raw-file-upload-state"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl max-w-2xl mx-auto text-left text-slate-800 dark:text-slate-100"
              id="raw-file-upload-panel"
            >
              {/* File list header & items */}
              <div className="space-y-3.5 mb-6 border-b border-slate-200 dark:border-slate-800 pb-5">
                {selectedFiles.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-extrabold text-slate-900 dark:text-white text-base truncate">
                        {item.file.name}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 italic text-sm font-semibold shrink-0">
                        ({item.file.size >= 1024 * 1024 * 1024 
                          ? `${(item.file.size / (1024 * 1024)).toFixed(1)} Mb` 
                          : formatSize(item.file.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(item.id)}
                      className="text-red-500 hover:text-red-700 transition-colors p-1 shrink-0 cursor-pointer"
                      title="Dosyayı Sili"
                    >
                      <X className="w-5 h-5 stroke-[2.5]" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Açıklama */}
              <div className="mb-5">
                <label className="block text-sm font-extrabold text-slate-800 dark:text-slate-200 mb-2">
                  Açıklama:
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-xs resize-y"
                  placeholder="Dosya hakkında isteğe bağlı bir açıklama ekleyin..."
                />
              </div>

              {/* Herkese açık checkbox */}
              <div className="mb-6">
                <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                    Herkese açık
                  </span>
                </label>
              </div>

              {/* E-posta İle Gönder Veya Dosyaları Şifrele Toggle & Form */}
              <div className="mb-8">
                <button
                  type="button"
                  onClick={() => setShowEmailOrLock(!showEmailOrLock)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-extrabold hover:underline flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Lock className="w-4 h-4 text-blue-500" />
                  <span>E-posta İle Gönder Veya Dosyaları Şifrele</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showEmailOrLock ? "rotate-180" : ""}`} />
                </button>

                {showEmailOrLock && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 text-left"
                  >
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                        Şifre Koruması (İndirme Şifresi):
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Dosyayı kilitlemek için şifre girin..."
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                        E-posta İle Gönder (Alıcı Adresi):
                      </label>
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="ornek@eposta.com"
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Bottom Buttons */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-7 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-sm rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Dosya Ekle
                </button>

                <button
                  type="button"
                  onClick={triggerUpload}
                  disabled={isUploading}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  Yüklemeye Başla
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
                  Seçilen Dosyalar ({selectedFiles.length}/{(currentUser && isVip) ? 25 : 10})
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
                        ) : item.file.type.startsWith("image/") ? (
                          <img
                            src={item.previewUrl}
                            alt={item.file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-2 relative">
                            <Archive className="w-8 h-8 text-amber-400 mb-1" />
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {item.file.name.split('.').pop()?.toUpperCase() || "DOSYA"}
                            </span>
                          </div>
                        )}
                        
                        {/* Floating Delete Button */}
                        <button
                          onClick={() => removeFile(item.id)}
                          className="absolute top-1.5 right-1.5 p-1 bg-black/60 text-white hover:bg-black/80 rounded-full transition-colors cursor-pointer z-10"
                          title="Dosyayı Kaldır"
                        >
                          <X className="w-3 h-3" />
                        </button>

                        {/* Floating Edit Button (Pencil Icon) */}
                        {item.file.type.startsWith("image/") && (
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
                <label className="text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wide flex items-center justify-between mb-2 pl-0.5">
                  <span>Otomatik Silinme Süresi</span>
                  {!isVip && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-black flex items-center gap-1">
                      👑 Süresiz: VIP Özel
                    </span>
                  )}
                </label>
                <select
                  value={deleteAfter}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "never" && !isVip) {
                      setErrorMsg("👑 Süresiz (kalıcı) saklama yalnızca PRO VIP üyelere özeldir! Standart üyeler için maksimum saklama süresi 1 aydır.");
                      setDeleteAfter("1m");
                      if (onOpenVipModal) onOpenVipModal();
                    } else {
                      setDeleteAfter(val);
                    }
                  }}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer hover:border-slate-300"
                >
                  <option value="never">
                    {isVip ? "Süresiz (Kalıcı Saklama — PRO VIP)" : "🔒 Süresiz (Kalıcı Saklama) — 👑 Yalnızca PRO VIP Üyelere Özel"}
                  </option>
                  <option value="1m">1 Ay Sonra Sil (Maksimum Standart Süre)</option>
                  <option value="1w">1 Hafta Sonra Sil</option>
                  <option value="1d">1 Gün Sonra Sil</option>
                  <option value="1h">1 Saat Sonra Sil</option>
                </select>
                {!isVip && (
                  <button
                    type="button"
                    onClick={onOpenVipModal}
                    className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold mt-1.5 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    👑 Süresiz kalıcı saklama için PRO VIP üye olun
                  </button>
                )}
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
                  value={hasOnlyVideo ? "original" : compressionMode}
                  onChange={(e) => setCompressionMode(e.target.value as any)}
                  disabled={hasOnlyVideo}
                  className={`w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300 ${hasOnlyVideo ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <option value="original">Orijinal Kalite (Sıkıştırma Yok)</option>
                  <option value="webp-high" disabled={hasOnlyVideo}>WebP (Yüksek Kalite - En Az Sıkıştırma)</option>
                  <option value="webp-medium" disabled={hasOnlyVideo}>WebP (Dengeli Sıkıştırma - Önerilen)</option>
                  <option value="webp-low" disabled={hasOnlyVideo}>WebP (Yüksek Sıkıştırma - Düşük Boyut)</option>
                </select>

                {hasVideo && (
                  <div className="mt-2.5 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-xl text-amber-800 dark:text-amber-300 text-[11px] font-semibold flex items-start gap-2 shadow-xs">
                    <Video className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <span className="leading-tight">
                      WebP yalnızca <strong>resim formatları</strong> (JPG, PNG vb.) içindir. Seçtiğiniz video dosyaları WebP sıkıştırmasına tabi tutulmadan orijinal formatı ve kalitesinde yüklenecektir.
                    </span>
                  </div>
                )}
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

        {/* Homepage Sponsored Product / CS Skin Cards Showcase (Reference Image Style) */}
        <AdBannerSection
          position="home-cards"
          adsList={siteConfig?.adsList}
          adsEnabled={siteConfig?.adsEnabled !== false}
          onOpenContactModal={() => setIsAdModalOpen(true)}
        />

        {/* Homepage Bottom Sponsored Banner */}
        <AdBannerSection
          position="home-bottom"
          adsList={siteConfig?.adsList}
          adsEnabled={siteConfig?.adsEnabled !== false}
          onOpenContactModal={() => setIsAdModalOpen(true)}
        />
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

      {/* Uploading progress overlay with progressive status notification area */}
      {isUploading && (() => {
        const getUploadStageInfo = (progress: number) => {
          if (progress <= 15) {
            return {
              title: "Yükleme başlatılıyor...",
              detail: "Dosyalar hazırlanıyor ve güvenli bulut sunucu bağlantısı kuruluyor.",
              step1Status: "current",
              step2Status: "upcoming",
              step3Status: "upcoming",
            };
          } else if (progress <= 85) {
            return {
              title: "Dosyalar işleniyor...",
              detail: "Veriler yüksek hızlı SSL şifreli bulut sunucularına aktarılıyor.",
              step1Status: "completed",
              step2Status: "current",
              step3Status: "upcoming",
            };
          } else if (progress < 100) {
            return {
              title: "Sunucu yanıtı bekleniyor...",
              detail: "Veriler doğrulanıyor ve paylaşım bağlantıları oluşturuluyor.",
              step1Status: "completed",
              step2Status: "completed",
              step3Status: "current",
            };
          } else {
            return {
              title: "İşlem tamamlandı!",
              detail: "Dosyalarınız hazır, sonuç sayfasına yönlendiriliyorsunuz.",
              step1Status: "completed",
              step2Status: "completed",
              step3Status: "completed",
            };
          }
        };

        const stage = getUploadStageInfo(uploadProgress);

        return (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" id="upload-status-notification-modal">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center border border-slate-200 dark:border-slate-800 relative overflow-hidden">
              {/* Ambient Background Glow */}
              <div className="absolute -top-16 -right-16 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

              {/* Spinner & Stage Icon */}
              <div className="relative mb-4 flex items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm mx-auto">
                  {uploadProgress < 100 ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-bounce" />
                  )}
                </div>
              </div>

              {/* Dynamic Stage Title */}
              <h4 className="font-black text-slate-800 dark:text-white text-lg sm:text-xl tracking-tight">
                {stage.title}
              </h4>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed max-w-xs mx-auto">
                {stage.detail}
              </p>

              {/* Progressive Stage Visualizer / Notification Area */}
              <div className="my-5 p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                <div className="grid grid-cols-3 gap-2">
                  {/* Step 1 */}
                  <div className={`p-2 rounded-xl text-center border transition-all ${
                    stage.step1Status === "completed"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400"
                      : stage.step1Status === "current"
                      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 font-extrabold ring-2 ring-blue-500/20"
                      : "bg-slate-100/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400"
                  }`}>
                    <div className="text-[10px] uppercase font-black tracking-wider flex items-center justify-center gap-1">
                      {stage.step1Status === "completed" ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <span>1.</span>
                      )}
                      <span>Başlatma</span>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className={`p-2 rounded-xl text-center border transition-all ${
                    stage.step2Status === "completed"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400"
                      : stage.step2Status === "current"
                      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 font-extrabold ring-2 ring-blue-500/20"
                      : "bg-slate-100/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400"
                  }`}>
                    <div className="text-[10px] uppercase font-black tracking-wider flex items-center justify-center gap-1">
                      {stage.step2Status === "completed" ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <span>2.</span>
                      )}
                      <span>İşleme</span>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className={`p-2 rounded-xl text-center border transition-all ${
                    stage.step3Status === "completed"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400"
                      : stage.step3Status === "current"
                      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 font-extrabold ring-2 ring-blue-500/20"
                      : "bg-slate-100/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400"
                  }`}>
                    <div className="text-[10px] uppercase font-black tracking-wider flex items-center justify-center gap-1">
                      {stage.step3Status === "completed" ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <span>3.</span>
                      )}
                      <span>Yanıt</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar & Percentage */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-slate-600 dark:text-slate-300">Yükleme İlerlemesi</span>
                  <span className="text-blue-600 dark:text-blue-400 font-black">{uploadProgress}%</span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-800">
                  <div
                    className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 h-full rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>

              {/* Security Note */}
              <div className="mt-5 flex items-center justify-center gap-1.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>SSL 256-bit Güvenli Aktarım • Lütfen pencereyi kapatmayın</span>
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* Ad Contact Modal Portal */}
      <AdContactModal
        isOpen={isAdModalOpen}
        onClose={() => setIsAdModalOpen(false)}
        siteConfig={siteConfig}
      />
    </div>
  );
}
