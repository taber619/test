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
import { ActiveTab, ClientImage, ClientUser, SiteConfig } from "./types";
import { Zap, ShieldCheck, Code, Target, ArrowRight, UserPlus, Image as ImageIcon, Volume2 } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [currentUser, setCurrentUser] = useState<ClientUser | null>(null);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
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
      const adminParam = params.get("admin");

      if (adminParam === "true" || view === "admin") {
        localStorage.setItem("inanresim_admin_visible", "true");
        setActiveTab("admin");
      } else if (view === "image-detail" && id) {
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
    setIsUploading(true);
    setUploadProgress(0);

    const totalFilesSize = files.reduce((acc, file) => acc + file.size, 0) || 1;
    let uploadedBytesPriorFiles = 0;

    try {
      let guestToken = localStorage.getItem("inanresim_guest_token");
      if (!guestToken) {
        guestToken = "gst_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
        localStorage.setItem("inanresim_guest_token", guestToken);
      }

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
          guestToken,
          watermarkText: watermarkOptions?.watermarkText,
          watermarkOpacity: watermarkOptions?.watermarkOpacity,
          watermarkColor: watermarkOptions?.watermarkColor,
          watermarkSize: watermarkOptions?.watermarkSize,
          watermarkPosition: watermarkOptions?.watermarkPosition,
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
          watermarkText: watermarkOptions?.watermarkText,
          watermarkOpacity: watermarkOptions?.watermarkOpacity,
          watermarkColor: watermarkOptions?.watermarkColor,
          watermarkSize: watermarkOptions?.watermarkSize,
          watermarkPosition: watermarkOptions?.watermarkPosition,
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

  const isMaintenanceActive = siteConfig?.maintenanceModeEnabled && !isAdminState;

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
      <Footer onOpenAdsModal={() => setShowAdModal(true)} />
    </div>
  );
}
