import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useParams, useLocation, Navigate } from "react-router-dom";
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
import InfoModals from "./components/InfoModals";
import BlogView from "./components/BlogView";
import FaqSection from "./components/FaqSection";
import PrivacyView from "./components/PrivacyView";
import AbuseReportView from "./components/AbuseReportView";
import ContactView from "./components/ContactView";
import ApiDocsView from "./components/ApiDocsView";
import AboutView from "./components/AboutView";
import TermsView from "./components/TermsView";
import { ClientImage, ClientUser, SiteConfig } from "./types";
import { Zap, ShieldCheck, Code, Target, ArrowRight, UserPlus, Image as ImageIcon, Volume2 } from "lucide-react";

export function calculateUploadLimit(
  user: (ClientUser & { role?: string }) | null | undefined, 
  siteConfig: SiteConfig | null | undefined
) {
  if (!user) {
    const guestMaxMb = siteConfig?.guestMaxMb ?? 100;
    const maxSizeBytes = guestMaxMb * 1024 * 1024;
    return {
      maxMb: guestMaxMb,
      maxSizeBytes,
      limitStr: `${guestMaxMb} MB`,
      userType: "guest" as const
    };
  }

  const isVip = !!user.isVip || user.role === "admin";
  const maxMb = isVip 
    ? (siteConfig?.vipMaxMb ?? 5000) 
    : ((siteConfig?.registeredMaxMb ?? 1000) || 1000);
  const maxSizeBytes = maxMb * 1024 * 1024;
  const limitStr = maxMb >= 1000 ? `${(maxMb / 1000).toFixed(1)} GB (${maxMb} MB)` : `${maxMb} MB`;

  return {
    maxMb,
    maxSizeBytes,
    limitStr,
    userType: isVip ? ("vip" as const) : ("registered" as const)
  };
}

function ImageDetailRouteWrapper() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return <Navigate to="/" replace />;
  }

  return <ImageDetailView imageId={id} onBack={() => navigate(-1)} />;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeInfoModal, setActiveInfoModal] = useState<"faq" | "privacy" | "abuse" | "contact" | null>(null);
  const [currentUser, setCurrentUser] = useState<ClientUser | null>(null);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(() => {
    try {
      const cached = localStorage.getItem("inanresim_site_config");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  });
  const [isConfigLoaded, setIsConfigLoaded] = useState(() => {
    return !!localStorage.getItem("inanresim_site_config");
  });
  const [cachedMaintenance] = useState(() => localStorage.getItem("inanresim_maintenance_mode") === "true");

  // Live reload version checking states
  const initialAppVersionRef = React.useRef<string | null>(null);
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const [updateCountdown, setUpdateCountdown] = useState(5);

  const fetchSiteConfig = async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setSiteConfig((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data;
        });
        try {
          localStorage.setItem("inanresim_site_config", JSON.stringify(data));
        } catch (e) {}
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
      // Load cached site configuration seamlessly on network error
      const cached = localStorage.getItem("inanresim_site_config");
      if (cached) {
        try {
          setSiteConfig(JSON.parse(cached));
        } catch (parseErr) {}
      }
    } finally {
      setIsConfigLoaded(true);
    }
  };

  useEffect(() => {
    document.documentElement.classList.add("dark");
    fetchSiteConfig();
    const interval = setInterval(fetchSiteConfig, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update Toast Countdown logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showUpdateToast) {
      if (updateCountdown > 0) {
        timer = setTimeout(() => {
          setUpdateCountdown((prev) => prev - 1);
        }, 1000);
      } else {
        window.location.reload();
      }
    }
    return () => clearTimeout(timer);
  }, [showUpdateToast, updateCountdown]);

  // Auth User Session Restore
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const stored = localStorage.getItem("hizli_resim_user");
        if (stored) {
          const u = JSON.parse(stored);
          if (u && u.id) {
            setCurrentUser(u);
            const res = await fetch(`/api/auth/me?id=${encodeURIComponent(u.id)}`);
            if (res.ok) {
              const freshUser = await res.json();
              setCurrentUser((prev) => {
                if (JSON.stringify(prev) === JSON.stringify(freshUser)) return prev;
                return freshUser;
              });
              localStorage.setItem("hizli_resim_user", JSON.stringify(freshUser));
            }
          }
        }
      } catch (e) {}
    };

    restoreSession();

    const handleSessionUpdate = () => {
      restoreSession();
    };
    window.addEventListener("user_session_updated", handleSessionUpdate);

    const userSyncInterval = setInterval(restoreSession, 15000);

    return () => {
      window.removeEventListener("user_session_updated", handleSessionUpdate);
      clearInterval(userSyncInterval);
    };
  }, []);

  // Backwards compatibility for query params like ?view=image-detail&id=123 or ?admin=true
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const viewParam = params.get("view");
    const idParam = params.get("id");
    const adminParam = params.get("admin");

    if (adminParam === "true" || viewParam === "admin") {
      localStorage.setItem("inanresim_admin_visible", "true");
      if (location.pathname !== "/admin") {
        navigate("/admin", { replace: true });
      }
    } else if (viewParam === "image-detail" && idParam) {
      if (location.pathname !== `/image/${idParam}`) {
        navigate(`/image/${idParam}`, { replace: true });
      }
    }
  }, [location.search, location.pathname, navigate]);

  const [uploadedImages, setUploadedImages] = useState<ClientImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [showAdModal, setShowAdModal] = useState(false);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);

  const handleLoginSuccess = (user: ClientUser) => {
    setCurrentUser(user);
    localStorage.setItem("hizli_resim_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("hizli_resim_user");
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleLocalUpload = async (
    files: File[], 
    deleteAfter: string, 
    password?: string,
    watermarkOptions?: any
  ) => {
    setIsUploading(true);
    setUploadProgress(10);

    try {
      const results: ClientImage[] = [];
      const total = files.length;

      for (let i = 0; i < total; i++) {
        const file = files[i];
        const base64 = await fileToBase64(file);

        let guestToken = localStorage.getItem("inanresim_guest_token") || "";

        const payload: any = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64,
          deleteAfter,
          password: password || undefined,
          userId: currentUser?.id,
          guestToken: guestToken || undefined,
          watermarkOptions,
        };

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const img: ClientImage = await res.json();
          results.push(img);
          if ((img as any).guestToken) {
            localStorage.setItem("inanresim_guest_token", (img as any).guestToken);
          }
          if ((img as any).guestUploadCount !== undefined) {
            localStorage.setItem("inanresim_guest_upload_count", String((img as any).guestUploadCount));
          }
        } else {
          let errText = "Görsel yüklenemedi.";
          try {
            const errJson = await res.json();
            if (errJson.error) errText = errJson.error;
          } catch (e) {}
          alert(errText);
        }

        setUploadProgress(Math.round(((i + 1) / total) * 100));
      }

      if (results.length > 0) {
        setUploadedImages(results);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Yükleme sırasında teknik bir hata oluştu.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUrlUploadSuccess = (img: ClientImage) => {
    setUploadedImages([img]);
    navigate("/");
  };

  const handleLockImage = async (id: string, pass: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/images/${id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pass, userId: currentUser?.id }),
      });
      if (res.ok) {
        setUploadedImages((prev) =>
          prev.map((x) => (x.id === id ? { ...x, isProtected: !!pass } : x))
        );
        alert("Görsel şifresi başarıyla güncellendi.");
        return true;
      } else {
        alert("Şifre güncellenemedi.");
        return false;
      }
    } catch (e) {
      alert("Bir hata oluştu.");
      return false;
    }
  };

  const handleDeleteImage = async (id: string, deleteKey?: string) => {
    try {
      const url = `/api/images/${id}?deleteKey=${encodeURIComponent(deleteKey || "")}&userId=${encodeURIComponent(currentUser?.id || "")}`;
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        setUploadedImages((prev) => prev.filter((x) => x.id !== id));
        alert("Görsel başarıyla silindi.");
        navigate("/");
      } else {
        alert("Silme yetkiniz yok veya görsel bulunamadı.");
      }
    } catch (e) {
      alert("Silme işlemi sırasında hata oluştu.");
    }
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
        setShowMaintenanceAdminModal(false);
        navigate("/admin");
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

          <div className="p-4.5 bg-slate-900/80 border border-slate-800/90 rounded-2xl space-y-3 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block"></span>
                Bakım İlerlemesi
              </span>
              <span className="text-amber-400 font-mono font-black text-xs">%72 Tamamlandı</span>
            </div>

            <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 p-0.5 relative">
              <div 
                className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 h-full rounded-full transition-all duration-1000 relative shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                style={{ width: "72%" }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[stripe_2s_linear_infinite]"></div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 font-medium">
              <span>Sistem optimizasyonları ve veritabanı bakımı</span>
              <span className="text-amber-400/90 font-semibold shrink-0">~15 dakika</span>
            </div>
          </div>
        </div>

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

  // Home Page Component
  const HomeViewComponent = () => {
    if (uploadedImages.length > 0) {
      return (
        <UploadSuccess
          uploadedImages={uploadedImages}
          onReset={() => setUploadedImages([])}
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

        <HeroSection
          onUploadStart={handleLocalUpload}
          onSwitchToUrlUpload={() => navigate("/upload")}
          onSwitchToAuth={() => navigate("/login")}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          homepageTitle={siteConfig?.homepageTitle}
          homepageSubtitle={siteConfig?.homepageSubtitle}
          currentUser={currentUser}
          siteConfig={siteConfig}
          onOpenVipModal={() => setIsVipModalOpen(true)}
        />

        <StatsCounter />

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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-10">
              <div className="flex items-start gap-3.5 sm:gap-4 p-4.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-slate-300/50 dark:hover:shadow-slate-900/80 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform hover:-translate-y-2 hover:scale-[1.03] cursor-pointer group">
                <div className="flex-none w-10 h-10 bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Işık Hızında</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">En gelişmiş altyapımızla yüksek çözünürlüklü görselleriniz ve videolarınız anında sunucuya işlenir.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 sm:gap-4 p-4.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 shadow-sm bg-gradient-to-br from-white to-amber-50/30 dark:from-slate-900 dark:to-amber-950/20 hover:shadow-2xl hover:shadow-amber-500/15 dark:hover:shadow-amber-950/80 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform hover:-translate-y-2 hover:scale-[1.03] cursor-pointer group">
                <div className="flex-none w-10 h-10 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Üyeler İçin 1 GB Transfer</h3>
                    <span className="text-[9px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded uppercase">Özel</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-xs mt-1 leading-relaxed">
                    Ücretsiz üye olarak <strong className="text-slate-900 dark:text-white">1 GB'a (1000 MB) kadar</strong> dosya, resim ve videolarınızı tek tıkla yükleyebilir, toplu olarak yönetebilirsiniz.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 sm:gap-4 p-4.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-purple-500/15 dark:hover:shadow-slate-900/80 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform hover:-translate-y-2 hover:scale-[1.03] cursor-pointer group">
                <div className="flex-none w-10 h-10 bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Tam Gizlilik & Kontrol</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">Görsellerinizi şifreleyin, otomatik silinme zamanı belirleyin veya galerinize ekleyip dilediğiniz zaman silin.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 sm:gap-4 p-4.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-blue-500/15 dark:hover:shadow-slate-900/80 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform hover:-translate-y-2 hover:scale-[1.03] cursor-pointer group">
                <div className="flex-none w-10 h-10 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
                  <Code className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Güçlü Bağlantılar</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">BBCode, Direct Link, HTML ve Markdown gibi popüler forum ve blog paylaşım kodları anında kopyalamaya hazır.</p>
                </div>
              </div>
            </div>

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
                    onClick={() => navigate("/dashboard")}
                    className="px-6 py-3.5 bg-white text-blue-700 hover:bg-blue-50 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Galerime Git
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/register")}
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
                onClick={() => navigate("/register")}
                className="px-6 py-3.5 bg-white text-blue-600 hover:bg-blue-50 font-extrabold text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                Hemen Üye Ol
              </button>
            </div>
          </section>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden flex flex-col font-sans dark bg-slate-950 text-slate-100" id="app-root-container">
      {/* Navigation Header */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        theme="dark"
        onOpenVipModal={() => setIsVipModalOpen(true)}
        onOpenInfoModal={(modal) => setActiveInfoModal(modal)}
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
      <main className="flex-grow bg-slate-50/50 dark:bg-slate-950 overflow-x-hidden relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="w-full min-h-full"
          >
            <Routes>
              <Route path="/" element={<HomeViewComponent />} />
              <Route
                path="/upload"
                element={
                  <UrlUploadView
                    onBack={() => navigate("/")}
                    onUploadSuccess={handleUrlUploadSuccess}
                    userId={currentUser?.id}
                    currentUser={currentUser}
                    siteConfig={siteConfig}
                    onOpenVipModal={() => setIsVipModalOpen(true)}
                  />
                }
              />
              <Route
                path="/gallery"
                element={
                  <GalleryView
                    currentUser={currentUser}
                    onSelectImage={(id) => navigate(`/image/${id}`)}
                    onDeleteImage={handleDeleteImage}
                  />
                }
              />
              <Route
                path="/dashboard"
                element={
                  currentUser ? (
                    <GalleryView
                      currentUser={currentUser}
                      onSelectImage={(id) => navigate(`/image/${id}`)}
                      onDeleteImage={handleDeleteImage}
                    />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/blog"
                element={
                  <BlogView
                    onNavigateHome={() => navigate("/")}
                    onOpenVipModal={() => setIsVipModalOpen(true)}
                  />
                }
              />
              <Route
                path="/help"
                element={
                  <div className="py-8">
                    <FaqSection
                      onOpenAuth={() => navigate("/login")}
                      onOpenVipModal={() => setIsVipModalOpen(true)}
                    />
                  </div>
                }
              />
              <Route
                path="/privacy"
                element={
                  <PrivacyView
                    onNavigateHome={() => navigate("/")}
                    siteConfig={siteConfig}
                  />
                }
              />
              <Route
                path="/contact"
                element={
                  <ContactView
                    onNavigateHome={() => navigate("/")}
                    siteConfig={siteConfig}
                  />
                }
              />
              <Route
                path="/login"
                element={
                  <AuthView
                    onLoginSuccess={(u) => {
                      handleLoginSuccess(u);
                      navigate("/dashboard");
                    }}
                    initialMode="login"
                  />
                }
              />
              <Route
                path="/register"
                element={
                  <AuthView
                    onLoginSuccess={(u) => {
                      handleLoginSuccess(u);
                      navigate("/dashboard");
                    }}
                    initialMode="register"
                  />
                }
              />
              <Route path="/admin" element={<AdminView onBack={() => navigate("/")} />} />
              <Route path="/terms" element={<TermsView onNavigateHome={() => navigate("/")} siteConfig={siteConfig} />} />
              <Route path="/about" element={<AboutView onNavigateHome={() => navigate("/")} siteConfig={siteConfig} />} />
              <Route path="/abuse" element={<AbuseReportView onNavigateHome={() => navigate("/")} />} />
              <Route path="/api-docs" element={<ApiDocsView onNavigateHome={() => navigate("/")} siteConfig={siteConfig} />} />

              {/* Image Detail routes */}
              <Route path="/image/:id" element={<ImageDetailRouteWrapper />} />
              <Route path="/i/:id" element={<ImageDetailRouteWrapper />} />
              <Route path="/d/:id" element={<ImageDetailRouteWrapper />} />
              <Route path="/download/:id" element={<ImageDetailRouteWrapper />} />
              <Route path="/v/:id" element={<ImageDetailRouteWrapper />} />
              <Route path="/f/:id" element={<ImageDetailRouteWrapper />} />
              <Route path="/file/:id" element={<ImageDetailRouteWrapper />} />

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
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
      <Footer 
        onOpenAdsModal={() => setShowAdModal(true)} 
        siteConfig={siteConfig} 
      />

      {/* Global Info / FAQ / Privacy / DMCA Modals */}
      <InfoModals
        activeModal={activeInfoModal}
        onClose={() => setActiveInfoModal(null)}
        siteConfig={siteConfig}
        onOpenAuth={() => navigate("/login")}
        onOpenVipModal={() => setIsVipModalOpen(true)}
      />
    </div>
  );
}
