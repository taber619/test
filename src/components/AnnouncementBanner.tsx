import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bell, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ExternalLink, 
  Rocket, 
  ShieldCheck, 
  Wrench, 
  Gift, 
  AlertTriangle, 
  Info,
  Maximize2,
  CheckCircle2
} from "lucide-react";
import { AnnouncementItem, SiteConfig } from "../types";

interface AnnouncementBannerProps {
  siteConfig: SiteConfig;
  onOpenVipModal: () => void;
  onOpenChat?: () => void;
}

export default function AnnouncementBanner({ 
  siteConfig, 
  onOpenVipModal,
  onOpenChat 
}: AnnouncementBannerProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Combine structured and plain string announcements
  const structuredList: AnnouncementItem[] = (siteConfig.structuredAnnouncements || []).filter(a => a.enabled !== false);
  
  const plainList: AnnouncementItem[] = (siteConfig.announcements || [siteConfig.announcementText])
    .filter(Boolean)
    .map((text, idx) => ({
      id: `plain_${idx}`,
      text,
      category: "info" as const,
      priority: "normal" as const,
      createdAt: Date.now()
    }));

  // Prefer structured if available, otherwise fallback to plain list
  const activeAnnouncements: AnnouncementItem[] = structuredList.length > 0 ? structuredList : plainList;

  useEffect(() => {
    if (activeAnnouncements.length <= 1 || isPaused || isDismissed) return;

    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % activeAnnouncements.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [activeAnnouncements.length, isPaused, isDismissed]);

  if (!siteConfig.announcementEnabled || isDismissed || activeAnnouncements.length === 0) {
    return null;
  }

  const currentAnn = activeAnnouncements[currentIdx] || activeAnnouncements[0];

  const handleActionClick = (url?: string) => {
    if (!url) return;
    if (url === "#vip") {
      onOpenVipModal();
    } else if (url === "#chat" && onOpenChat) {
      onOpenChat();
    } else if (url.startsWith("http")) {
      window.open(url, "_blank");
    }
  };

  const getCategoryBadge = (category?: string) => {
    switch (category) {
      case "success":
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          label: "BAŞARI / MÜJDE",
          bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10",
          ping: "bg-emerald-400",
          glow: "from-emerald-500/25 via-teal-500/15 to-transparent",
          cardBg: "from-emerald-950/50 via-slate-900/95 to-slate-900/90",
          cardBorder: "border-emerald-500/40 hover:border-emerald-500/60",
          accentLine: "bg-gradient-to-r from-emerald-400 to-teal-500"
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          label: "ÖNEMLİ UYARI",
          bg: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10",
          ping: "bg-amber-400",
          glow: "from-amber-500/25 via-orange-500/15 to-transparent",
          cardBg: "from-amber-950/50 via-slate-900/95 to-slate-900/90",
          cardBorder: "border-amber-500/40 hover:border-amber-500/60",
          accentLine: "bg-gradient-to-r from-amber-400 to-orange-500"
        };
      case "update":
        return {
          icon: <Rocket className="w-3.5 h-3.5" />,
          label: "GÜNCELLEME",
          bg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/10",
          ping: "bg-cyan-400",
          glow: "from-cyan-500/25 via-blue-500/15 to-transparent",
          cardBg: "from-cyan-950/50 via-slate-900/95 to-slate-900/90",
          cardBorder: "border-cyan-500/40 hover:border-cyan-500/60",
          accentLine: "bg-gradient-to-r from-cyan-400 to-blue-500"
        };
      case "campaign":
        return {
          icon: <Gift className="w-3.5 h-3.5" />,
          label: "KAMPANYA / VIP",
          bg: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-sm shadow-yellow-500/10",
          ping: "bg-yellow-400",
          glow: "from-yellow-500/25 via-amber-500/15 to-transparent",
          cardBg: "from-yellow-950/50 via-slate-900/95 to-slate-900/90",
          cardBorder: "border-yellow-500/40 hover:border-yellow-500/60",
          accentLine: "bg-gradient-to-r from-yellow-400 to-amber-500"
        };
      case "maintenance":
        return {
          icon: <Wrench className="w-3.5 h-3.5" />,
          label: "SİSTEM BAKIMI",
          bg: "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/10",
          ping: "bg-rose-400",
          glow: "from-rose-500/25 via-red-500/15 to-transparent",
          cardBg: "from-rose-950/50 via-slate-900/95 to-slate-900/90",
          cardBorder: "border-rose-500/40 hover:border-rose-500/60",
          accentLine: "bg-gradient-to-r from-rose-400 to-red-500"
        };
      case "security":
        return {
          icon: <ShieldCheck className="w-3.5 h-3.5" />,
          label: "GÜVENLİK BİLDİRİMİ",
          bg: "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/10",
          ping: "bg-purple-400",
          glow: "from-purple-500/25 via-indigo-500/15 to-transparent",
          cardBg: "from-purple-950/50 via-slate-900/95 to-slate-900/90",
          cardBorder: "border-purple-500/40 hover:border-purple-500/60",
          accentLine: "bg-gradient-to-r from-purple-400 to-indigo-500"
        };
      case "info":
      default:
        return {
          icon: <Info className="w-3.5 h-3.5" />,
          label: "DUYURU",
          bg: "bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm shadow-blue-500/10",
          ping: "bg-blue-400",
          glow: "from-blue-500/25 via-indigo-500/15 to-transparent",
          cardBg: "from-blue-950/50 via-slate-900/95 to-slate-900/90",
          cardBorder: "border-blue-500/40 hover:border-blue-500/60",
          accentLine: "bg-gradient-to-r from-blue-400 to-indigo-500"
        };
    }
  };

  const badge = getCategoryBadge(currentAnn.category);

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: -16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="max-w-6xl mx-auto px-4 pt-5 sm:pt-6" 
        id="site-announcement-container"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div 
          className={`relative overflow-hidden bg-gradient-to-r ${badge.cardBg} backdrop-blur-xl border ${badge.cardBorder} rounded-2xl p-3.5 sm:p-4 shadow-2xl shadow-slate-950/50 transition-all duration-300 group`}
          id="site-announcement-toast"
        >
          {/* Eye-catching glowing background gradient effect */}
          <div className={`absolute inset-0 bg-gradient-to-r ${badge.glow} pointer-events-none opacity-70`}></div>
          <div className={`absolute top-0 left-0 right-0 h-[2px] ${badge.accentLine}`}></div>

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            
            {/* Left Side: Badge + Title + Content */}
            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
              <span className={`flex-none px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 border ${badge.bg}`}>
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${badge.ping} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${badge.ping}`}></span>
                </span>
                {badge.icon}
                <span>{badge.label}</span>
              </span>

              {/* Animating Announcement Content */}
              <div className="min-w-0 flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentIdx}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -12, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2"
                  >
                    {currentAnn.title && (
                      <span className="text-xs font-black text-white tracking-tight shrink-0 flex items-center gap-1">
                        {currentAnn.title}
                        <span className="hidden sm:inline text-slate-500">•</span>
                      </span>
                    )}
                    <p className="text-xs font-bold text-slate-200 tracking-tight leading-relaxed truncate">
                      {currentAnn.text}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Right Side: Interactive Action, Navigation & Close */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {/* Action Button if specified */}
              {currentAnn.actionText && (
                <button
                  type="button"
                  onClick={() => handleActionClick(currentAnn.actionUrl)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 text-[11px] font-black rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 animate-pulse hover:scale-105"
                >
                  <span>{currentAnn.actionText}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Slider Controls */}
              {activeAnnouncements.length > 1 && (
                <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-[10px] font-extrabold text-slate-400">
                  <button
                    type="button"
                    onClick={() => setCurrentIdx((prev) => (prev - 1 + activeAnnouncements.length) % activeAnnouncements.length)}
                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Önceki Duyuru"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-1.5 text-[9px] font-black text-amber-400 tabular-nums">
                    {currentIdx + 1}/{activeAnnouncements.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentIdx((prev) => (prev + 1) % activeAnnouncements.length)}
                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Sonraki Duyuru"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* View All Drawer Button */}
              <button
                type="button"
                onClick={() => setShowAllModal(true)}
                className="text-[10px] font-black text-blue-300 hover:text-blue-200 bg-blue-500/15 hover:bg-blue-500/25 px-2.5 py-1.5 rounded-xl border border-blue-500/35 transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-sm"
                title="Tüm Duyuruları Listele"
              >
                <Maximize2 className="w-3 h-3" />
                <span className="hidden sm:inline">Tüm Duyurular</span>
              </button>

              <div className="w-px h-4 bg-slate-800 hidden sm:block"></div>

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-slate-800/80 rounded-xl transition-all cursor-pointer"
                title="Duyuruyu Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Bottom auto-slide progress line */}
          {activeAnnouncements.length > 1 && !isPaused && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900 overflow-hidden">
              <motion.div 
                key={currentIdx}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 6, ease: "linear" }}
                className={`h-full ${badge.accentLine}`}
              />
            </div>
          )}
        </div>
      </motion.div>

      {/* Modal for Viewing All Active Announcements */}
      <AnimatePresence>
        {showAllModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl text-slate-100 overflow-hidden"
            >
              {/* Background gradient blur */}
              <div className="absolute -top-24 -right-24 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <button
                type="button"
                onClick={() => setShowAllModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 hover:bg-slate-800/80 rounded-full transition-colors cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3.5 mb-6 border-b border-slate-800/80 pb-4 relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-blue-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                  <Bell className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                    Duyuru & Bildirim Merkezi
                    <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-black">
                      {activeAnnouncements.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Yöneticiler tarafından yayınlanan en güncel haberler ve sistem bildirimleri.</p>
                </div>
              </div>

              <div className="space-y-3.5 max-h-[440px] overflow-y-auto pr-1 relative z-10">
                {activeAnnouncements.map((ann, idx) => {
                  const b = getCategoryBadge(ann.category);
                  return (
                    <motion.div 
                      key={ann.id || idx}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.04 }}
                      className={`p-4 sm:p-5 bg-gradient-to-br ${b.cardBg} border ${b.cardBorder} rounded-2xl shadow-lg transition-all duration-300 hover:scale-[1.01] relative overflow-hidden group space-y-2.5`}
                    >
                      {/* Top accent line */}
                      <div className={`absolute top-0 left-0 right-0 h-[2px] ${b.accentLine}`}></div>

                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 border ${b.bg}`}>
                          {b.icon}
                          {b.label}
                        </span>
                        {ann.createdAt && (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded-md border border-slate-800">
                            {new Date(ann.createdAt).toLocaleDateString("tr-TR")}
                          </span>
                        )}
                      </div>

                      {ann.title && (
                        <h4 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
                          {ann.title}
                        </h4>
                      )}

                      <p className="text-xs text-slate-200 font-semibold leading-relaxed">
                        {ann.text}
                      </p>

                      {ann.actionText && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAllModal(false);
                              handleActionClick(ann.actionUrl);
                            }}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                          >
                            <span>{ann.actionText}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end relative z-10">
                <button
                  type="button"
                  onClick={() => setShowAllModal(false)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

