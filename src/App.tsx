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
import QRCodeModal from "./components/QRCodeModal";
import { ActiveTab, ClientImage, ClientUser, SiteConfig } from "./types";
import { Zap, ShieldCheck, Code, Target, ArrowRight, UserPlus, Image as ImageIcon, Volume2 } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [currentUser, setCurrentUser] = useState<ClientUser | null>(null);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("theme") as "light" | "dark") || "light"
  );

  const playThemeSound = (currentTheme: "light" | "dark") => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (currentTheme === "dark") {
        // Soft descending warm nighttime sweep
        osc.type = "sine";
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        // Bright ascending cheerful morning beep
        osc.type = "sine";
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (err) {
      console.warn("Could not play theme sound", err);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    playThemeSound(nextTheme);
  };

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

  // QR Code Modal states
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrModalUrl, setQrModalUrl] = useState("");

  // Parse custom parameters on mount (to support shareable preview links: /?view=image-detail&id=xyz)
  useEffect(() => {
    // Load local auth session if any
    const stored = localStorage.getItem("hizli_resim_user");
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch (e) {}
    }

    const checkRoute = () => {
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view");
      const id = params.get("id");
      if (view === "image-detail" && id) {
        setSelectedDetailId(id);
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
    return () => window.removeEventListener("popstate", checkRoute);
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
  const handleLocalUpload = async (files: File[], deleteAfter: string, password?: string) => {
    setIsUploading(true);
    setUploadProgress(0);

    const totalFilesSize = files.reduce((acc, file) => acc + file.size, 0) || 1;
    let uploadedBytesPriorFiles = 0;

    try {
      const results: ClientImage[] = [];

      for (const file of files) {
        const base64Data = await fileToBase64(file);
        const payload = {
          name: file.name,
          mimeType: file.type,
          size: file.size,
          data: base64Data,
          deleteAfter,
          password,
          userId: currentUser?.id || undefined,
        };

        // Create an XMLHttpRequest to support real upload progress tracking
        const uploadResult = await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/upload");
          xhr.setRequestHeader("Content-Type", "application/json");

          // Track progress of the current file being sent over the network
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const currentFileRatio = event.loaded / event.total;
              const currentFileUploadedBytes = currentFileRatio * file.size;
              const totalUploaded = uploadedBytesPriorFiles + currentFileUploadedBytes;
              
              const percent = Math.min(99, Math.round((totalUploaded / totalFilesSize) * 100));
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
                reject(new Error(errData.error || "Görsel yüklenemedi."));
              } catch (e) {
                reject(new Error(`Yükleme başarısız (Kod: ${xhr.status})`));
              }
            }
          };

          xhr.onerror = () => {
            reject(new Error("Sunucuya bağlanırken bir ağ hatası oluştu."));
          };

          xhr.send(JSON.stringify(payload));
        });

        // Add this file's full size to the accumulated total of prior uploaded files
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
          directUrl: `${origin}/api/images/${uploadResult.id}`,
          previewUrl: `${origin}/?view=image-detail&id=${uploadResult.id}`,
          bbCode: `[IMG]${origin}/api/images/${uploadResult.id}[/IMG]`,
          htmlCode: `<a href="${origin}/?view=image-detail&id=${uploadResult.id}"><img src="${origin}/api/images/${uploadResult.id}" alt="${uploadResult.name}" /></a>`,
          markdownCode: `![${uploadResult.name}](${origin}/api/images/${uploadResult.id})`,
        });

        // Keep the progress updated smoothly between sequential file uploads
        const immediatePercent = Math.min(99, Math.round((uploadedBytesPriorFiles / totalFilesSize) * 100));
        setUploadProgress(immediatePercent);
      }

      setUploadProgress(100);
      setTimeout(() => {
        setUploadedImages(results);
        setIsUploading(false);
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
      previewUrl: `${origin}/?view=image-detail&id=${data.id}`,
      bbCode: `[IMG]${origin}/api/images/${data.id}[/IMG]`,
      htmlCode: `<a href="${origin}/?view=image-detail&id=${data.id}"><img src="${origin}/api/images/${data.id}" alt="${data.name}" /></a>`,
      markdownCode: `![${data.name}](${origin}/api/images/${data.id})`,
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

  const handleOpenQRCode = (url: string) => {
    setQrModalUrl(url);
    setQrModalOpen(true);
  };

  const renderContent = () => {
    if (activeTab === "image-detail" && selectedDetailId) {
      return <ImageDetailView imageId={selectedDetailId} onBack={navigateBack} onOpenQRCode={handleOpenQRCode} />;
    }

    if (activeTab === "url-upload") {
      return (
        <UrlUploadView
          onBack={() => setActiveTab("home")}
          onUploadSuccess={handleUrlUploadSuccess}
          userId={currentUser?.id}
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
          onOpenQRCode={handleOpenQRCode}
        />
      );
    }

    return (
      <div id="homepage-main">
        {siteConfig?.announcementEnabled && !isAnnDismissed && (
          (() => {
            const list = (siteConfig.announcements || [siteConfig.announcementText]).filter(Boolean);
            if (list.length === 0) return null;
            const currentText = list[currentAnnIdx] || "";
            return (
              <div className="max-w-5xl mx-auto px-4 pt-6" id="site-announcement-container">
                <div 
                  className="relative overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 sm:p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300"
                  id="site-announcement-toast"
                >
                  {/* Left accent color strip */}
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-600"></div>
                  
                  {/* Left Side: Badge & Animating Text */}
                  <div className="flex items-center gap-3 min-w-0 flex-1 pl-1.5">
                    <span className="flex-none px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-blue-100/30 dark:border-blue-900/30">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                      </span>
                      Duyuru
                    </span>
                    
                    {/* Sliding text wrapper */}
                    <div className="min-w-0 flex-1 relative min-h-[24px] flex items-center overflow-hidden">
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={currentAnnIdx}
                          initial={{ y: 12, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -12, opacity: 0 }}
                          transition={{ duration: 0.28, ease: "easeOut" }}
                          className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 tracking-tight leading-relaxed"
                        >
                          {currentText}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Right Side: Navigation, View All & Dismiss */}
                  <div className="flex items-center gap-3 shrink-0">
                    {list.length > 1 && (
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950/50 p-1 rounded-xl border border-slate-200/40 dark:border-slate-800/60 text-[10px] font-extrabold text-slate-500">
                        <button
                          type="button"
                          onClick={() => setCurrentAnnIdx((prev) => (prev - 1 + list.length) % list.length)}
                          className="hover:bg-slate-200 dark:hover:bg-slate-850 p-1 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          title="Önceki"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <span className="px-1 text-[9px] font-black tabular-nums">{currentAnnIdx + 1} / {list.length}</span>
                        <button
                          type="button"
                          onClick={() => setCurrentAnnIdx((prev) => (prev + 1) % list.length)}
                          className="hover:bg-slate-200 dark:hover:bg-slate-850 p-1 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          title="Sonraki"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowAllAnnouncements(true)}
                      className="text-[10px] font-black text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline shrink-0 cursor-pointer bg-blue-50/50 dark:bg-blue-950/20 px-2 py-1 rounded-lg border border-blue-100/30 dark:border-blue-900/20"
                    >
                      Hepsini Gör ({list.length})
                    </button>

                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

                    <button
                      type="button"
                      onClick={() => setIsAnnDismissed(true)}
                      className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                      title="Kapat"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()
        )}

        {/* Modal for viewing all announcements */}
        {showAllAnnouncements && siteConfig && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl">
              <button
                type="button"
                onClick={() => setShowAllAnnouncements(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">Yayınlanan Tüm Duyurular</h3>
                  <p className="text-[11px] text-slate-400">Yöneticiler tarafından yayınlanan tüm aktif duyurular ve sistem bilgilendirmeleri.</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                {(siteConfig.announcements || [siteConfig.announcementText]).filter(Boolean).map((ann, idx) => (
                  <div 
                    key={idx}
                    className="p-4 bg-slate-50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800/60 rounded-2xl flex items-start gap-3.5 hover:border-indigo-100/60 dark:hover:border-indigo-950/60 transition-colors"
                  >
                    <span className="flex-none w-5 h-5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center font-bold text-xs mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                      {ann}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAllAnnouncements(false)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Hero Section */}
        <HeroSection
          onUploadStart={handleLocalUpload}
          onSwitchToUrlUpload={() => setActiveTab("url-upload")}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          homepageTitle={siteConfig?.homepageTitle}
          homepageSubtitle={siteConfig?.homepageSubtitle}
        />

        {/* Real-time stats */}
        <StatsCounter />

        {/* Feature info sections */}
        <section className="py-16 bg-gray-50 border-t border-slate-200" id="landing-benefits">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
                Sınırları Olmayan Paylaşım Deneyimi
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">
                Neden İnanResim'i Tercih Etmelisiniz?
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              <div className="flex items-start space-x-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="flex-none w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Işık Hızında</h3>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">En gelişmiş sunucularımızla resimleriniz anında sıkıştırılmadan orijinal kalitede sunucuya işlenir.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="flex-none w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04c0 4.833 2.053 9.227 5.343 12.316a1.977 1.977 0 002.55 0c3.29-3.089 5.343-7.483 5.343-12.316z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Tam Gizlilik</h3>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">Resimlerinizi isteğe bağlı şifreleyin, otomatik silinme süresi ekleyin veya kalıcı olarak dilediğiniz an silin.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="flex-none w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Güçlü Linkler</h3>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">BBCode, HTML ve Markdown gibi popüler forum ve blog paylaşım linkleri tek tıkla kopyalamaya hazır elinizin altında.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3-Step Guide */}
        <section className="py-16 bg-white" id="landing-guide">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="text-xs font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3.5 py-1.5 rounded-full">
              Hızlı Başlangıç Rehberi
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mt-4">
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
                  <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-100 mb-4 z-10">
                    {step.num}
                  </div>
                  <h3 className="font-bold text-slate-800 text-base mt-2">{step.title}</h3>
                  <p className="text-xs text-slate-400 max-w-xs mt-2 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

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

  return (
    <div className={`min-h-screen max-w-full overflow-x-hidden flex flex-col font-sans transition-colors duration-300 ${theme === "dark" ? "dark bg-slate-950 text-slate-100" : "bg-white text-slate-900"}`} id="app-root-container">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenQRCode={handleOpenQRCode}
      />

      {/* Main Container Workspace */}
      <main className="flex-grow bg-slate-50/30">
        {renderContent()}
      </main>

      {/* Floating Chat Panel */}
      <MiniChat />

      {/* Standalone customizable QR Code Modal */}
      <QRCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        defaultUrl={qrModalUrl}
      />

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

      {/* Bottom Footer block */}
      <Footer />
    </div>
  );
}
