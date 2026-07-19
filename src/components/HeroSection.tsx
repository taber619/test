import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, Camera, Link, X, AlertCircle, Eye, Settings, Shield, Trash2, Image as ImageIcon } from "lucide-react";

interface SelectedFile {
  id: string;
  file: File;
  previewUrl: string;
}

interface HeroSectionProps {
  onUploadStart: (files: File[], deleteAfter: string, password?: string) => Promise<void>;
  onSwitchToUrlUpload: () => void;
  isUploading: boolean;
  uploadProgress: number;
}

export default function HeroSection({
  onUploadStart,
  onSwitchToUrlUpload,
  isUploading,
  uploadProgress,
}: HeroSectionProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [deleteAfter, setDeleteAfter] = useState<string>("never");
  const [password, setPassword] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Camera integration state
  const [cameraActive, setCameraActive] = useState(false);
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
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            if (selectedFiles.length + newFiles.length >= 10) {
              setErrorMsg("Aynı anda en fazla 10 görsel yükleyebilirsiniz.");
              continue;
            }
            if (file.size > 20 * 1024 * 1024) {
              setErrorMsg("Görsel boyutu 20 MB sınırını aşamaz.");
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
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setErrorMsg("Lütfen geçerli bir görsel formatı (JPG, PNG, GIF, WEBP) yükleyin.");
      return;
    }

    const currentCount = selectedFiles.length;
    const incoming: SelectedFile[] = [];

    for (const f of imageFiles) {
      if (currentCount + incoming.length >= 10) {
        setErrorMsg("Aynı anda en fazla 10 görsel yükleyebilirsiniz.");
        break;
      }
      if (f.size > 20 * 1024 * 1024) {
        setErrorMsg(`${f.name} boyutu 20 MB sınırını aştığı için eklenmedi.`);
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
    const files = selectedFiles.map((x) => x.file);
    await onUploadStart(files, deleteAfter, password || undefined);
    clearAll();
  };

  // Camera capture controls
  const startCamera = async () => {
    setCameraActive(true);
    setErrorMsg(null);
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setErrorMsg("Kameraya erişim sağlanamadı. İzinleri kontrol edin.");
        setCameraActive(false);
      }
    }, 200);
  };

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
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 animate-fade-in" id="hero-upload-area">
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">
          Resimlerinizi Saniyeler İçinde Paylaşın
        </h1>
        <p className="text-base sm:text-lg text-slate-500 font-medium">
          Türkiye'nin en hızlı resim yükleme platformu.
        </p>
      </div>

      {/* Warning/Error Banner */}
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs sm:text-sm font-semibold rounded-2xl border border-red-100 flex items-start gap-3 shadow-sm animate-fade-in" id="hero-error-banner">
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
        className={`relative w-full bg-white rounded-3xl border-2 border-dashed p-2 transition-all ${
          dragActive
            ? "border-blue-600 scale-[0.99] shadow-inner"
            : "border-slate-300 hover:border-blue-400"
        } shadow-sm`}
        id="drag-drop-zone"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="image/*"
          className="hidden"
          id="hidden-file-input"
        />

        {selectedFiles.length === 0 ? (
          /* Empty drop zone state - matches the Sleek Design */
          <div className="bg-blue-50/50 rounded-[22px] py-14 px-6 sm:px-8 flex flex-col items-center text-center border border-white" id="drop-zone-empty">
            <div className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-blue-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">Resimlerinizi Sürükleyip Bırakın 👋</h2>
            <p className="text-slate-500 mb-8 max-w-lg leading-relaxed text-sm">
              Veya dosya seçmek için tıklayın. Panodan yapıştırmak için <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded text-sm text-slate-800 font-semibold">Ctrl+V</span> kullanın.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-10 py-4 rounded-xl font-bold text-base hover:bg-blue-700 transition-colors shadow-md shadow-blue-100 cursor-pointer"
                id="btn-select-file"
              >
                Dosya Seç
              </button>

              <button
                onClick={startCamera}
                className="bg-white text-slate-700 border border-slate-200 px-6 py-4 rounded-xl font-bold text-base hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                id="btn-take-cam"
              >
                <Camera className="w-5 h-5 text-slate-500" />
                Kamerayla Çek
              </button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400 font-medium uppercase tracking-widest">
              <span>JPG, PNG, GIF, WEBP</span>
              <div className="h-1 w-1 bg-slate-300 rounded-full hidden sm:block"></div>
              <span>MAKS. 20 MB / 10 RESİM</span>
              <div className="h-1 w-1 bg-slate-300 rounded-full hidden sm:block"></div>
              <button
                onClick={onSwitchToUrlUpload}
                className="text-blue-600 hover:underline cursor-pointer lowercase"
                id="btn-url-mode"
              >
                URL'den Yükle
              </button>
            </div>
          </div>
        ) : (
          /* File queue review state - matches original structure embedded in sleek card */
          <div className="bg-slate-50/40 rounded-[22px] py-8 px-6 sm:px-8 text-left border border-white" id="drop-zone-has-files">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5">
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
              {selectedFiles.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 p-2 rounded-2xl relative group flex flex-col justify-between hover:border-blue-400 transition-colors shadow-sm"
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-white relative flex items-center justify-center border border-slate-100">
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeFile(item.id)}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/50 text-white hover:bg-black/75 rounded-full transition-colors cursor-pointer"
                      title="Görseli Kaldır"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="mt-1.5 px-1">
                    <p className="text-[10px] font-bold text-slate-700 truncate" title={item.file.name}>
                      {item.file.name}
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium">
                      {formatSize(item.file.size)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Extra Settings & Configurations panel */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 shadow-sm">
              {/* Expire settings */}
              <div>
                <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wide block mb-2 pl-0.5">
                  Otomatik Silinme Süresi
                </label>
                <select
                  value={deleteAfter}
                  onChange={(e) => setDeleteAfter(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer hover:border-slate-300"
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
                <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wide flex items-center gap-1 mb-2 pl-0.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-500" />
                  Şifre Koruması (Opsiyonel)
                </label>
                <input
                  type="password"
                  placeholder="Görseli kilitlemek için şifre girin..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300"
                />
              </div>
            </div>

            {/* Execute trigger */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all cursor-pointer bg-white"
              >
                Daha Fazla Ekle
              </button>

              <button
                onClick={triggerUpload}
                disabled={isUploading}
                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-100 transition-all flex items-center gap-1.5 cursor-pointer"
                id="btn-start-upload"
              >
                Görselleri Yükle ({selectedFiles.length})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Uploading progress overlay */}
      {isUploading && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <h4 className="font-extrabold text-slate-800 text-base">Görselleriniz Yükleniyor</h4>
            <p className="text-slate-400 text-xs mt-1">Lütfen tarayıcıyı kapatmayınız.</p>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-6">
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
          <div className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl border border-slate-200">
            <div className="bg-slate-900 aspect-video relative">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
            </div>
            <div className="p-5 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold text-slate-500">Hazır olduğunuzda çekime basın!</span>
              <div className="flex gap-2">
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
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
    </div>
  );
}
