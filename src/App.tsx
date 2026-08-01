import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import StatsCounter from "./components/StatsCounter";
import HeroSection from "./components/HeroSection";
import UploadSuccess from "./components/UploadSuccess";
import GalleryView from "./components/GalleryView";
import AuthView from "./components/AuthView";
import ImageDetailView from "./components/ImageDetailView";
import UrlUploadView from "./components/UrlUploadView";
import AdminView from "./components/AdminView";
import MiniChat from "./components/MiniChat";
import AdContactModal from "./components/AdContactModal";
import AdBannerSection from "./components/AdBannerSection";
import VipModal from "./components/VipModal";
import AnnouncementBanner from "./components/AnnouncementBanner";
import FaqSection from "./components/FaqSection";
import { ActiveTab, ClientImage, ClientUser, SiteConfig } from "./types";
import { Zap, ShieldCheck, Code, Target, ArrowRight, UserPlus, Image as ImageIcon, Volume2 } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [currentUser, setCurrentUser] = useState<ClientUser | null>(null);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [cachedMaintenance] = useState(() => localStorage.getItem("inanresim_maintenance_mode") === "true");
  const [theme] = useState<"dark">("dark");

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Live reload version checking states
  const initialAppVersionRef = React.useRef<string | null>(null);
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const [updateCountdown, setUpdateCountdown] = useState(5);

  const fetchSiteConfig = async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setSiteConfig(data);
        if (data.maintenanceModeEnabled !== undefined) {
          localStorage.setItem("inanresim_maintenance_mode", String(data.maintenanceModeEnabled));
        }

        // Check if there is a new server-side boot ID or update
        if (data.appVersion) {
          if (!initialAppVersionRef.current) {
            initialAppVersionRef.current = data.appVersion;
          } else if (initialAppVersionRef.current !== data.appVersion) {
            setShowUpdateToast(true);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load site config:", e);
    } finally {
      setIsConfigLoaded(true);
    }
  };

  // Automatic reload countdown trigger
  useEffect(() => {
    if (!showUpdateToast) return;
    if (updateCountdown <= 0) {
      window.location.reload();
      return;
    }
    const timer = setTimeout(() => {
      setUpdateCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [showUpdateToast, updateCountdown]);

  useEffect(() => {
    fetchSiteConfig();
    
    // Set up rapid background polling to instantly reflect any admin modifications
    const interval = setInterval(() => {
      fetchSiteConfig();
    }, 3000);

    return () => clearInterval(interval);
  }, [activeTab]);

  // Announcement Slider & View States
  const [currentAnnIdx, setCurrentAnnIdx] = useState(0);
  const [isAnnDismissed, setIsAnnDismissed] = useState(false);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);

  useEffect(() => {
    if (!siteConfig || !siteConfig.announcementEnabled) return;
    const list = (siteConfig.announcements || [siteConfig.announcementText]).filter(Boolean);
    if (list.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentAnnIdx((prev) => (prev + 1) % list.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [siteConfig]);
  
  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedImages, setUploadedImages] = useState<ClientImage[]>([]);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);

  // Realtime User Session Syncing (VIP Updates, Banned status)
  const syncUserSession = async (userToSync?: ClientUser | null) => {
    const stored = localStorage.getItem("hizli_resim_user");
    let activeId = userToSync?.id || currentUser?.id;
    if (!activeId && stored) {
      try {
        const parsed = JSON.parse(stored);
        activeId = parsed.id;
      } catch (e) {}
    }
    if (!activeId) return;

    try {
      const res = await fetch(`/api/auth/me?userId=${activeId}`);
      if (res.ok) {
        const me = await res.json();
        setCurrentUser(me);
        localStorage.setItem("hizli_resim_user", JSON.stringify(me));
      }
    } catch (e) {
      console.error("User session sync error:", e);
    }
  };

  // Parse custom parameters on mount (to support shareable preview links: /?view=image-detail&id=xyz)
  useEffect(() => {
    // Load local auth session if any
    const stored = localStorage.getItem("hizli_resim_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCurrentUser(parsed);
        syncUserSession(parsed);
      } catch (e) {}
    }

    const handleSessionUpdate = () => {
      const updatedStored = localStorage.getItem("hizli_resim_user");
      if (updatedStored) {
        try {
          const parsed = JSON.parse(updatedStored);
          setCurrentUser(parsed);
          syncUserSession(parsed);
        } catch (e) {}
      }
    };

    window.addEventListener("user_session_updated", handleSessionUpdate);
    
    // Periodically sync logged-in user profile (every 5 seconds)
    const userSyncInterval = setInterval(() => {
      const currentStored = localStorage.getItem("hizli_resim_user");
      if (currentStored) {
        try {
          const parsed = JSON.parse(currentStored);
          syncUserSession(parsed);
        } catch (e) {}
      }
    }, 5000);

    const checkRoute = () => {
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view");
      const id = params.get("id");
      const adminParam = params.get("admin");

      // Support path-based short routes (/i/XYZ, /d/XYZ, /download/XYZ, /v/XYZ, /f/XYZ, /file/XYZ)
      const pathname = window.location.pathname;
      let pathId: string | null = null;
      const pathParts = pathname.split("/").filter(Boolean);
      if (pathParts.length >= 2 && ["i", "d", "download", "v", "f", "file"].includes(pathParts[0])) {
        pathId = pathParts[1];
      }

      const activeDetailId = id || pathId;

      if (adminParam === "true" || view === "admin") {
        localStorage.setItem("inanresim_admin_visible", "true");
        setActiveTab("admin");
      } else if ((view === "image-detail" || pathId) && activeDetailId) {
        setSelectedDetailId(activeDetailId);
        setActiveTab("image-detail");
      } else {
        // Fallback default
        setSelectedDetailId(null);
        if (activeTab === "image-detail") {
          setActiveTab("home");
        }
      }
    };

    checkRoute();
    // Watch history changes
    window.addEventListener("popstate", checkRoute);
    return () => {
      window.removeEventListener("popstate", checkRoute);
      window.removeEventListener("user_session_updated", handleSessionUpdate);
      clearInterval(userSyncInterval);
    };
  }, []);

  const handleLoginSuccess = (user: ClientUser) => {
    setCurrentUser(user);
    localStorage.setItem("hizli_resim_user", JSON.stringify(user));
    setActiveTab("home");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("hizli_resim_user");
    setActiveTab("home");
  };

  const navigateToImageDetail = (id: string) => {
    window.history.pushState({}, "", `/?view=image-detail&id=${id}`);
    setSelectedDetailId(id);
    setActiveTab("image-detail");
  };

  const navigateBack = () => {
    window.history.pushState({}, "", "/");
    setSelectedDetailId(null);
    setUploadedImages([]); // reset
    setActiveTab("home");
  };

  // Helper to read file as Base64 string asynchronously
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle local files uploads
  const handleLocalUpload = async (
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
  ) => {
    // Client-side pre-validation of file sizes against guest/member limits
    for (const f of files) {
      if (!currentUser) {
        const guestMaxMb = siteConfig?.guestMaxMb ?? 100;
        if (guestMaxMb > 0 && f.size > guestMaxMb * 1024 * 1024) {
          alert(`"${f.name}" dosyası misafir yükleme limitini (${guestMaxMb} MB) aşıyor. Lütfen ücretsiz üye olun veya giriş yapın!`);
          return;
        }
      } else {
        const isVip = !!currentUser.isVip || currentUser.role === "admin";
        const maxMb = isVip 
          ? (siteConfig?.vipMaxMb ?? 5000) 
          : ((siteConfig?.registeredMaxMb ?? 1000) || 1000);
        if (maxMb > 0 && f.size > maxMb * 1024 * 1024) {
          const limitStr = maxMb >= 1000 ? `${(maxMb / 1000).toFixed(1)} GB (${maxMb} MB)` : `${maxMb} MB`;
          alert(`"${f.name}" dosyası üyelik limitinizi (${limitStr}) aşıyor.`);
          return;
        }
      }
    }

    setIsUploading(true);
    setUploadProgress(5);

    const totalFilesSize = files.reduce((acc, file) => acc + file.size, 0) || 1;
    let uploadedBytesPriorFiles = 0;

    try {
      let guestToken = localStorage.getItem("inanresim_guest_token");
      if (!guestToken) {
        guestToken = "gst_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
        localStorage.setItem("inanresim_guest_token", guestToken);
      }

      const results: ClientImage[] = [];
      const failedFiles: { name: string; error: string }[] = [];

      for (const file of files) {
        // Chunked & direct stream file uploader
        const uploadSingleFile = async (): Promise<any> => {
          const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB per chunk for optimal speed
          const CONCURRENCY = 3; // 3 parallel streams for fast uploads

          // Small files (<= 8MB): Direct single POST request
          if (file.size <= CHUNK_SIZE) {
            return new Promise((resolve, reject) => {
              const formData = new FormData();
              formData.append("file", file);
              formData.append("name", file.name);
              formData.append("mimeType", file.type || "application/octet-stream");
              formData.append("size", String(file.size));
              formData.append("deleteAfter", deleteAfter);
              if (password) formData.append("password", password);
              if (currentUser?.id) formData.append("userId", currentUser.id);
              if (guestToken) formData.append("guestToken", guestToken);
              if (watermarkOptions?.watermarkText) formData.append("watermarkText", watermarkOptions.watermarkText);
              if (watermarkOptions?.watermarkOpacity !== undefined) formData.append("watermarkOpacity", String(watermarkOptions.watermarkOpacity));
              if (watermarkOptions?.watermarkColor) formData.append("watermarkColor", watermarkOptions.watermarkColor);
              if (watermarkOptions?.watermarkSize !== undefined) formData.append("watermarkSize", String(watermarkOptions.watermarkSize));
              if (watermarkOptions?.watermarkPosition) formData.append("watermarkPosition", watermarkOptions.watermarkPosition);

              const xhr = new XMLHttpRequest();
              xhr.open("POST", "/api/upload");
              xhr.timeout = 10 * 60 * 1000;

              xhr.upload.onprogress = (event) => {
                if (event.lengthComputable && event.total > 0) {
                  const currentFileRatio = event.loaded / event.total;
                  const currentFileUploadedBytes = currentFileRatio * file.size;
                  const totalUploaded = uploadedBytesPriorFiles + currentFileUploadedBytes;
                  const percent = Math.min(95, Math.max(1, Math.round((totalUploaded / totalFilesSize) * 95)));
                  setUploadProgress(percent);
                }
              };

              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  try {
                    resolve(JSON.parse(xhr.responseText));
                  } catch (e) {
                    reject(new Error("Sunucudan geçersiz yanıt alındı."));
                  }
                } else {
                  try {
                    const errData = JSON.parse(xhr.responseText);
                    reject(new Error(errData.error || `Dosya yüklenemedi (Hata Kodu: ${xhr.status})`));
                  } catch (e) {
                    reject(new Error(`Yükleme başarısız oldu (Sunucu Yanıt Kodu: ${xhr.status})`));
                  }
                }
              };

              xhr.onerror = () => {
                reject(new Error("Sunucuya bağlanırken ağ hatası oluştu. Lütfen bağlantınızı kontrol edip tekrar deneyin."));
              };

              xhr.ontimeout = () => {
                reject(new Error("Dosya yükleme zaman aşımına uğradı."));
              };

              xhr.send(formData);
            });
          }

          // Large files (> 8MB): Parallel Chunked upload (Çoklu paralel parçalı yükleme - Maksimum Hız)
          const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
          const uploadId = "up_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

          const chunkProgresses = new Array(totalChunks).fill(0);

          const updateOverallProgress = () => {
            const uploadedInCurrentFile = chunkProgresses.reduce((acc, bytes) => acc + bytes, 0);
            const totalUploadedOverall = uploadedBytesPriorFiles + uploadedInCurrentFile;
            const percent = Math.min(95, Math.max(1, Math.round((totalUploadedOverall / totalFilesSize) * 95)));
            setUploadProgress(percent);
          };

          const uploadSingleChunk = async (i: number) => {
            const start = i * CHUNK_SIZE;
            const end = Math.min(file.size, start + CHUNK_SIZE);
            const chunkBlob = file.slice(start, end);
            const chunkSize = end - start;

            let lastError = "";

            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                await new Promise((resolve, reject) => {
                  const formData = new FormData();
                  formData.append("file", chunkBlob, file.name);
                  formData.append("uploadId", uploadId);
                  formData.append("chunkIndex", String(i));
                  formData.append("totalChunks", String(totalChunks));
                  formData.append("fileName", file.name);
                  formData.append("fileSize", String(file.size));
                  formData.append("mimeType", file.type || "application/octet-stream");
                  if (currentUser?.id) formData.append("userId", currentUser.id);
                  if (guestToken) formData.append("guestToken", guestToken);

                  const xhr = new XMLHttpRequest();
                  xhr.open("POST", "/api/upload-chunk");
                  xhr.timeout = 2 * 60 * 1000;

                  xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable && event.total > 0) {
                      chunkProgresses[i] = event.loaded;
                      updateOverallProgress();
                    }
                  };

                  xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                      chunkProgresses[i] = chunkSize;
                      updateOverallProgress();
                      resolve(true);
                    } else {
                      try {
                        const errData = JSON.parse(xhr.responseText);
                        reject(new Error(errData.error || `Parça ${i + 1}/${totalChunks} yüklenemedi.`));
                      } catch (e) {
                        reject(new Error(`Parça ${i + 1}/${totalChunks} yükleme hatası (${xhr.status}).`));
                      }
                    }
                  };

                  xhr.onerror = () => reject(new Error("Ağ hatası oluştu, tekrar deneniyor..."));
                  xhr.ontimeout = () => reject(new Error("Parça zaman aşımına uğradı, tekrar deneniyor..."));
                  xhr.send(formData);
                });

                return; // Chunk uploaded successfully!
              } catch (err: any) {
                lastError = err.message || "Parça yüklenemedi";
                if (err.message && (err.message.includes("limit") || err.message.includes("engellendi"))) {
                  throw err;
                }
                await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)));
              }
            }

            throw new Error(lastError || `Parça ${i + 1}/${totalChunks} yüklenirken ağ hatası oluştu.`);
          };

          // Queue worker for parallel chunk uploading (up to 3 chunks in parallel)
          let chunkQueueIndex = 0;
          const workers = Array.from({ length: Math.min(CONCURRENCY, totalChunks) }, async () => {
            while (chunkQueueIndex < totalChunks) {
              const i = chunkQueueIndex++;
              await uploadSingleChunk(i);
            }
          });

          await Promise.all(workers);

          // Combine chunks on server
          setUploadProgress(96);
          const completeRes = await fetch("/api/upload-complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uploadId,
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type || "application/octet-stream",
              totalChunks,
              userId: currentUser?.id,
              guestToken,
              deleteAfter,
              password: password || undefined,
              watermarkText: watermarkOptions?.watermarkText,
              watermarkOpacity: watermarkOptions?.watermarkOpacity,
              watermarkColor: watermarkOptions?.watermarkColor,
              watermarkSize: watermarkOptions?.watermarkSize,
              watermarkPosition: watermarkOptions?.watermarkPosition,
            }),
          });

          const completeData = await completeRes.json();
          if (!completeRes.ok) {
            throw new Error(completeData.error || "Parçalar birleştirilirken hata oluştu.");
          }

          return completeData;
        };

        try {
          const uploadResult = await uploadSingleFile();
          uploadedBytesPriorFiles += file.size;

          const origin = window.location.origin;
          results.push({
            id: uploadResult.id,
            name: uploadResult.name,
            size: uploadResult.size,
            mimeType: file.type,
            uploadedAt: uploadResult.uploadedAt,
            deleteAfter: deleteAfter as any,
            views: 0,
            deleteToken: uploadResult.deleteToken,
            watermarkText: watermarkOptions?.watermarkText,
            watermarkOpacity: watermarkOptions?.watermarkOpacity,
            watermarkColor: watermarkOptions?.watermarkColor,
            watermarkSize: watermarkOptions?.watermarkSize,
            watermarkPosition: watermarkOptions?.watermarkPosition,
            directUrl: `${origin}/api/images/${uploadResult.id}`,
            previewUrl: `${origin}/i/${uploadResult.id}`,
            bbCode: `[url=${origin}/i/${uploadResult.id}][img]${origin}/api/images/${uploadResult.id}[/img][/url]`,
            htmlCode: `<a href="${origin}/i/${uploadResult.id}"><img src="${origin}/api/images/${uploadResult.id}" alt="${uploadResult.name}" /></a>`,
            markdownCode: `[![${uploadResult.name}](${origin}/api/images/${uploadResult.id})](${origin}/i/${uploadResult.id})`,
          });
        } catch (fileErr: any) {
          uploadedBytesPriorFiles += file.size;
          failedFiles.push({ name: file.name, error: fileErr.message || "Yükleme hatası" });
        }

        // Keep the progress updated smoothly between sequential file uploads
        const immediatePercent = Math.min(99, Math.round((uploadedBytesPriorFiles / totalFilesSize) * 100));
        setUploadProgress(immediatePercent);
      }

      setUploadProgress(100);
      setTimeout(() => {
        if (results.length > 0) {
          setUploadedImages(results);
        }
        setIsUploading(false);

        if (failedFiles.length > 0) {
          if (results.length > 0) {
            alert(`${results.length}/${files.length} dosya başarıyla yüklendi.\n${failedFiles.length} dosya yüklenemedi: ${failedFiles[0].error}`);
          } else {
            alert(`Dosyalar yüklenemedi: ${failedFiles[0].error}`);
          }
        }
      }, 300);

    } catch (err: any) {
      setIsUploading(false);
      alert(err.message || "Görseller yüklenirken bir hata oluştu.");
    }
  };

  // Handle url upload success conversion
  const handleUrlUploadSuccess = (data: any) => {
    const origin = window.location.origin;
    const clientImg: ClientImage = {
      id: data.id,
      name: data.name,
      size: data.size,
      mimeType: "image/jpeg", // typical fallback
      uploadedAt: data.uploadedAt,
      deleteAfter: data.deleteAfter || "never",
      views: 0,
      deleteToken: data.deleteToken,
      directUrl: `${origin}/api/images/${data.id}`,
      previewUrl: `${origin}/i/${data.id}`,
      bbCode: `[url=${origin}/i/${data.id}][img]${origin}/api/images/${data.id}[/img][/url]`,
      htmlCode: `<a href="${origin}/i/${data.id}"><img src="${origin}/api/images/${data.id}" alt="${data.name}" /></a>`,
      markdownCode: `[![${data.name}](${origin}/api/images/${data.id})](${origin}/i/${data.id})`,
    };

    setUploadedImages([clientImg]);
    setActiveTab("home"); // Render success panel within the homepage context
  };

  // Password set/lock API handler
  const handleLockImage = async (id: string, pwd: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/images/${id}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  };

  // Delete image API handler
  const handleDeleteImage = async (id: string, token: string) => {
    try {
      const res = await fetch(`/api/images/${id}?token=${token}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Görsel başarıyla silindi.");
        // If viewing deleted image, navigate back
        if (selectedDetailId === id) {
          navigateBack();
        } else {
          setUploadedImages((prev) => prev.filter((img) => img.id !== id));
        }
      } else {
        const d = await res.json();
        alert(d.error || "Görsel silinemedi.");
      }
    } catch (err) {
      alert("Silme işlemi sırasında hata oluştu.");
    }
  };

  const renderContent = () => {
    if (activeTab === "image-detail" && selectedDetailId) {
      return <ImageDetailView imageId={selectedDetailId} onBack={navigateBack} />;
    }

    if (activeTab === "url-upload") {
      return (
        <UrlUploadView
          onBack={() => setActiveTab("home")}
          onUploadSuccess={handleUrlUploadSuccess}
          userId={currentUser?.id}
          currentUser={currentUser}
          siteConfig={siteConfig}
          onOpenVipModal={() => setIsVipModalOpen(true)}
        />
      );
    }

    if (activeTab === "gallery") {
      return (
        <GalleryView
          currentUser={currentUser}
          onSelectImage={navigateToImageDetail}
          onDeleteImage={handleDeleteImage}
        />
      );
    }

    if (activeTab === "auth") {
      return <AuthView onLoginSuccess={handleLoginSuccess} />;
    }

    if (activeTab === "admin") {
      return <AdminView onBack={navigateBack} />;
    }

    // Default Home view
    if (uploadedImages.length > 0) {
      return (
        <UploadSuccess
          uploadedImages={uploadedImages}
          onReset={navigateBack}
          onDeleteImage={handleDeleteImage}
          onSetPassword={handleLockImage}
        />
      );
    }

    return (
      <div id="homepage-main">
        {siteConfig && (
          <AnnouncementBanner
            siteConfig={siteConfig}
            onOpenVipModal={() => setIsVipModalOpen(true)}
          />
        )}

        {/* Upload Hero Section */}
        <HeroSection
          onUploadStart={handleLocalUpload}
          onSwitchToUrlUpload={() => setActiveTab("url-upload")}
          onSwitchToAuth={() => setActiveTab("auth")}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          homepageTitle={siteConfig?.homepageTitle}
          homepageSubtitle={siteConfig?.homepageSubtitle}
          currentUser={currentUser}
          siteConfig={siteConfig}
          onOpenVipModal={() => setIsVipModalOpen(true)}
        />

        {/* Real-time stats */}
        <StatsCounter />

        {/* Feature info sections */}
        <section className="py-16 bg-gray-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800/80" id="landing-benefits">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-900/40">
                Sınırları Olmayan Paylaşım Deneyimi
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-3 tracking-tight">
                Neden İnanResim'i Tercih Etmelisiniz?
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
              <div className="flex items-start space-x-3.5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-none w-10 h-10 bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center shrink-0">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Işık Hızında</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">En gelişmiş altyapımızla yüksek çözünürlüklü görselleriniz ve videolarınız anında sunucuya işlenir.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 shadow-sm bg-gradient-to-br from-white to-amber-50/30 dark:from-slate-900 dark:to-amber-950/20 hover:shadow-md transition-shadow">
                <div className="flex-none w-10 h-10 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Üyeler İçin 1 GB Transfer</h3>
                    <span className="text-[9px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded uppercase">Özel</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-xs mt-1 leading-relaxed">
                    Ücretsiz üye olarak <strong className="text-slate-900 dark:text-white">1 GB'a (1000 MB) kadar</strong> dosya, resim ve videolarınızı tek tıkla yükleyebilir, toplu olarak yönetebilirsiniz.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-none w-10 h-10 bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Tam Gizlilik & Kontrol</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">Görsellerinizi şifreleyin, otomatik silinme zamanı belirleyin veya galerinize ekleyip dilediğiniz zaman silin.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-none w-10 h-10 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                  <Code className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Güçlü Bağlantılar</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">BBCode, Direct Link, HTML ve Markdown gibi popüler forum ve blog paylaşım kodları anında kopyalamaya hazır.</p>
                </div>
              </div>
            </div>

            {/* Unlimited Membership Banner */}
            <div className="mt-8 p-6 sm:p-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white">
                  Sınırsız İnanResim Ayrıcalıkları
                </span>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                  Üye Olun 1 GB, PRO VIP İle 5 GB Transfer & Süresiz Saklama Kazanın!
                </h3>
                <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
                  İnanResim'e tamamen ücretsiz üye olarak tek seferde <strong>1 GB'a (1000 MB) kadar</strong> resim ve video yükleyebilirsiniz. Tek seferde <strong>5 GB (5000 MB) dosya yükleme</strong> ve <strong>Süresiz Kalıcı Depolama</strong> ayrıcalığı için PRO VIP paketlerimizi inceleyin!
                </p>
              </div>

              <div className="shrink-0">
                {currentUser ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab("gallery")}
                    className="px-6 py-3.5 bg-white text-blue-700 hover:bg-blue-50 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Galerime Git
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab("auth")}
                    className="px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Hemen Ücretsiz Üye Ol
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 3-Step Guide */}
        <section className="py-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800/80" id="landing-guide">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
              Hızlı Başlangıç Rehberi
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-4">
              Sadece 3 Adımda Resimlerinizi Paylaşın
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 max-w-5xl mx-auto relative">
              {[
                {
                  num: "1",
                  title: "Resimlerini Seç",
                  desc: "Bilgisayarından sürükle, kameranla çek, panodan Ctrl+V ile yapıştır ya da URL gir.",
                },
                {
                  num: "2",
                  title: "Ayarlarını Özelleştir",
                  desc: "Görsellerine otomatik silinme süresi ekle veya şifre koyarak erişimi sınırlandır.",
                },
                {
                  num: "3",
                  title: "Linklerini Al & Paylaş",
                  desc: "Oluşturulan doğrudan forum, blog, markdown ya da direkt linklerini anında paylaş.",
                },
              ].map((step, idx) => (
                <div key={idx} className="relative flex flex-col items-center">
                  <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20 mb-4 z-10">
                    {step.num}
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base mt-2">{step.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium max-w-xs mt-2 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SSS Accordion Section */}
        <FaqSection
          onOpenAuth={() => setActiveTab("auth")}
          onOpenVipModal={() => setIsVipModalOpen(true)}
        />

        {/* Join Member CTA Banner */}
        {!currentUser && (
          <section className="py-12 px-4 max-w-5xl mx-auto" id="landing-cta-banner">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-blue-100">
              <div className="text-center md:text-left">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight flex items-center justify-center md:justify-start gap-2">
                  <UserPlus className="w-6 h-6 text-blue-200 animate-pulse" />
                  Ücretsiz Üye Hesabı Oluşturun!
                </h3>
                <p className="text-xs sm:text-sm text-blue-100 mt-2 max-w-md leading-relaxed font-medium">
                  Yüklediğiniz tüm resimleri tek bir kontrol panelinde görmek, silinmelerini önlemek ve istatistikleri takip etmek için ücretsiz kayıt olun.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("auth")}
                className="px-6 py-3.5 bg-white text-blue-600 hover:bg-blue-50 font-extrabold text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                Hemen Üye Ol
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}
      </div>
    );
  };

  const [isAdminState, setIsAdminState] = useState<boolean>(
    () => localStorage.getItem("inanresim_admin_token") === "true"
  );
  const [showMaintenanceAdminModal, setShowMaintenanceAdminModal] = useState(false);
  const [maintPassword, setMaintPassword] = useState("");
  const [maintError, setMaintError] = useState<string | null>(null);
  const [maintLoading, setMaintLoading] = useState(false);

  const handleMaintLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMaintLoading(true);
    setMaintError(null);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: maintPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem("inanresim_admin_token", "true");
        localStorage.setItem("inanresim_admin_visible", "true");
        setIsAdminState(true);
        setActiveTab("admin");
        setShowMaintenanceAdminModal(false);
      } else {
        setMaintError(data.error || "Hatalı yönetici şifresi!");
      }
    } catch (err) {
      setMaintError("Bağlantı hatası oluştu.");
    } finally {
      setMaintLoading(false);
    }
  };

  const isMaintenanceActive = (siteConfig ? siteConfig.maintenanceModeEnabled : cachedMaintenance) && !isAdminState;

  if (isMaintenanceActive) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative font-sans select-none overflow-hidden" id="maintenance-overlay">
        {/* Subtle background graphics */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full filter blur-[100px] animate-pulse"></div>

        <div className="max-w-md w-full text-center space-y-6 z-10">
          <div className="inline-flex w-20 h-20 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-3xl items-center justify-center text-4xl animate-bounce">
            🔧
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Sistem Bakımda
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              İnanResim'i daha kararlı ve hızlı hale getirmek için planlı bakım çalışması yapıyoruz. Kısa süre sonra tekrar çevrimiçi olacağız!
            </p>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-xs text-slate-400 flex items-center gap-3 justify-center">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Tahmini tamamlanma süresi: ~15 dakika
          </div>
        </div>

        {/* Footer with a working secret click-to-login for administrators */}
        <div className="absolute bottom-8 left-0 right-0 text-center z-10">
          <p className="text-[10px] text-slate-600">© 2026 İnanResim. Tüm hakları saklıdır.</p>
          <button 
            onClick={() => {
              setShowMaintenanceAdminModal(true);
              setMaintError(null);
            }}
            className="mt-3 text-xs text-amber-500/80 hover:text-amber-400 font-bold transition-colors cursor-pointer px-3 py-1.5 rounded-xl bg-slate-900/80 border border-amber-500/20 hover:border-amber-500/40 inline-flex items-center gap-1.5"
          >
            <span>🔐</span> Yönetici Girişi
          </button>
        </div>

        {/* Admin Login Modal for Maintenance Mode */}
        {showMaintenanceAdminModal && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-fade-in">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto text-xl border border-amber-500/20">
                🔐
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Yönetici Paneli Girişi</h3>
                <p className="text-xs text-slate-400 mt-1">Bakım modunu geçmek ve yönetim paneline erişmek için şifrenizi girin.</p>
              </div>

              <form onSubmit={handleMaintLoginSubmit} className="space-y-3">
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Yönetici Şifresi..."
                  value={maintPassword}
                  onChange={(e) => setMaintPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                />

                {maintError && (
                  <p className="text-xs font-bold text-rose-400">{maintError}</p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMaintenanceAdminModal(false);
                      setMaintPassword("");
                      setMaintError(null);
                    }}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={maintLoading}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {maintLoading ? "Giriş yapılıyor..." : "Giriş Yap 🚀"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden flex flex-col font-sans dark bg-slate-950 text-slate-100" id="app-root-container">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        theme="dark"
        onOpenVipModal={() => setIsVipModalOpen(true)}
        siteConfig={siteConfig}
      />

      {/* Header Ad Banners */}
      {siteConfig?.adsEnabled !== false && siteConfig?.adsList && siteConfig.adsList.filter(b => b.enabled && b.position === "header").length > 0 && (
        <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-2 px-4" id="header-ad-banner-container">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            {siteConfig.adsList.filter(b => b.enabled && b.position === "header").map(ad => (
              <div key={ad.id} className="w-full flex items-center justify-center">
                {ad.imageUrl ? (
                  <a href={ad.targetUrl || "#"} target="_blank" rel="noreferrer" className="block max-w-4xl w-full rounded-2xl overflow-hidden shadow-sm hover:opacity-95 transition-all border border-slate-200 dark:border-slate-800">
                    <img src={ad.imageUrl} alt={ad.title} className="w-full max-h-24 object-cover" />
                  </a>
                ) : ad.htmlCode ? (
                  <div dangerouslySetInnerHTML={{ __html: ad.htmlCode }} />
                ) : (
                  <a href={ad.targetUrl || "#"} target="_blank" rel="noreferrer" className="block w-full text-center py-2 px-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-all">
                    📢 {ad.title}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Container Workspace */}
      <main className="flex-grow bg-slate-50/50 dark:bg-slate-950">
        {renderContent()}
      </main>

      {/* Floating Chat Panel */}
      {siteConfig?.miniChatEnabled !== false && <MiniChat />}

      {/* Live Update Toast */}
      {showUpdateToast && (
        <div className="fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:w-96 z-[9999] bg-slate-900 dark:bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl p-5 animate-bounce-short">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center shrink-0 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.2" />
              </svg>
            </div>
            <div className="flex-grow">
              <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300">Sistem Güncellendi! 🚀</h4>
              <p className="text-[11px] text-slate-300 font-semibold mt-1 leading-relaxed">
                Sitenin yeni bir sürümü yayınlandı. Yeni özellikler ve düzeltmeleri görmek için sayfa yenileniyor...
              </p>
              
              <div className="flex items-center justify-between gap-4 mt-3.5 pt-3 border-t border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold">
                  Kalan süre: <span className="text-white font-black">{updateCountdown} sn</span>
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUpdateToast(false);
                      // Set current config version as acknowledged so we don't prompt again until next server reboot
                      if (siteConfig?.appVersion) {
                        initialAppVersionRef.current = siteConfig.appVersion;
                      }
                    }}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer"
                  >
                    Ertele
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black transition-all shadow-sm cursor-pointer"
                  >
                    Şimdi Yenile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ad Contact Modal */}
      <AdContactModal
        isOpen={showAdModal}
        onClose={() => setShowAdModal(false)}
        siteConfig={siteConfig || undefined}
      />

      {/* PRO VIP Subscription Modal */}
      <VipModal
        isOpen={isVipModalOpen}
        onClose={() => setIsVipModalOpen(false)}
        currentUser={currentUser}
        siteConfig={siteConfig || undefined}
        onVipSuccess={() => {
          fetchSiteConfig();
          // Reload user or update status if needed
        }}
      />

      {/* Footer Banner Ad */}
      <AdBannerSection
        position="footer"
        adsList={siteConfig?.adsList}
        adsEnabled={siteConfig?.adsEnabled !== false}
        onOpenContactModal={() => setShowAdModal(true)}
      />

      {/* Bottom Footer block */}
      <Footer onOpenAdsModal={() => setShowAdModal(true)} siteConfig={siteConfig} />
    </div>
  );
}
