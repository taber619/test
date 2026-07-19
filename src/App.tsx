import React, { useState, useEffect } from "react";
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

  const fetchSiteConfig = async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setSiteConfig(data);
      }
    } catch (e) {
      console.error("Failed to load site config:", e);
    }
  };

  useEffect(() => {
    fetchSiteConfig();
    
    // Set up rapid background polling to instantly reflect any admin modifications
    const interval = setInterval(() => {
      fetchSiteConfig();
    }, 3000);

    return () => clearInterval(interval);
  }, [activeTab]);
  
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
    setUploadProgress(10);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev < 90 ? prev + 10 : prev));
    }, 150);

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

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Görsel yüklenemedi.");
        }

        const origin = window.location.origin;
        results.push({
          id: data.id,
          name: data.name,
          size: data.size,
          mimeType: file.type,
          uploadedAt: data.uploadedAt,
          deleteAfter: deleteAfter as any,
          views: 0,
          deleteToken: data.deleteToken,
          directUrl: `${origin}/api/images/${data.id}`,
          previewUrl: `${origin}/?view=image-detail&id=${data.id}`,
          bbCode: `[IMG]${origin}/api/images/${data.id}[/IMG]`,
          htmlCode: `<a href="${origin}/?view=image-detail&id=${data.id}"><img src="${origin}/api/images/${data.id}" alt="${data.name}" /></a>`,
          markdownCode: `![${data.name}](${origin}/api/images/${data.id})`,
        });
      }

      clearInterval(progressInterval);
      setUploadProgress(100);
      setTimeout(() => {
        setUploadedImages(results);
        setIsUploading(false);
      }, 300);

    } catch (err: any) {
      clearInterval(progressInterval);
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
        {siteConfig?.announcementEnabled && (siteConfig.announcements || [siteConfig.announcementText]).filter(Boolean).length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950/40 border-b border-blue-100 dark:border-indigo-950/80 py-3.5 px-4" id="site-announcement-banner">
            <div className="max-w-4xl mx-auto flex flex-col gap-2">
              {(siteConfig.announcements || [siteConfig.announcementText]).filter(Boolean).map((ann, idx) => (
                <div key={idx} className="flex items-center justify-center gap-2.5">
                  <span className="flex h-2 w-2 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 dark:bg-blue-400"></span>
                  </span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight text-center">
                    {ann}
                  </p>
                </div>
              ))}
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
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${theme === "dark" ? "dark bg-slate-950 text-slate-100" : "bg-white text-slate-900"}`} id="app-root-container">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Container Workspace */}
      <main className="flex-grow bg-slate-50/30">
        {renderContent()}
      </main>

      {/* Floating Chat Panel */}
      <MiniChat />

      {/* Bottom Footer block */}
      <Footer />
    </div>
  );
}
