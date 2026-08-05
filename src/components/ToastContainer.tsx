import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  WifiOff,
  Wifi,
  CheckCircle2,
  AlertCircle,
  TriangleAlert,
  Info,
  X,
  ExternalLink,
} from "lucide-react";
import { ToastItem, toast } from "../utils/toast";

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Listen for custom app-toast events
  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastItem>;
      if (customEvent.detail) {
        const newToast = customEvent.detail;
        setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // Keep maximum 5 toasts simultaneously
      }
    };

    window.addEventListener("app-toast", handleToastEvent);
    return () => window.removeEventListener("app-toast", handleToastEvent);
  }, []);

  // Listen for browser offline / online connectivity events automatically
  useEffect(() => {
    const handleOffline = () => {
      toast.wifiOff("İnternet bağlantınız koptu. Sayfa yenilense bile verileriniz koruncak.");
    };

    const handleOnline = () => {
      toast.wifiOn("İnternet bağlantısı sağlandı. Servisler normal şekilde çalışıyor.");
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Initial check on load
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.wifiOff("Şu an çevrimdışısınız. Bağlantı sağlandığında otomatik güncellenecek.");
    }

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[99999] flex flex-col gap-2.5 max-w-[calc(100vw-2rem)] w-full sm:w-[380px] pointer-events-none"
    >
      <AnimatePresence mode="sync">
        {toasts.map((toastItem) => (
          <SingleToast
            key={toastItem.id}
            item={toastItem}
            onClose={() => removeToast(toastItem.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface SingleToastProps {
  key?: string;
  item: ToastItem;
  onClose: () => void;
}

function SingleToast({ item, onClose }: SingleToastProps) {
  const duration = item.duration ?? 4000;
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (duration <= 0 || hovered) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, hovered, onClose]);

  // Determine styles & icon per toast type
  let icon = <Info className="w-5 h-5 text-sky-400 shrink-0" />;
  let borderClass = "border-sky-500/30";
  let bgGradient = "from-slate-900/95 via-slate-900/95 to-sky-950/90";
  let badgeColor = "bg-sky-500/10 text-sky-300 border-sky-500/20";
  let progressBg = "bg-sky-500";

  switch (item.type) {
    case "success":
      icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      borderClass = "border-emerald-500/40";
      bgGradient = "from-slate-900/95 via-slate-900/95 to-emerald-950/90";
      badgeColor = "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
      progressBg = "bg-emerald-500";
      break;

    case "error":
      icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
      borderClass = "border-rose-500/40";
      bgGradient = "from-slate-900/95 via-slate-900/95 to-rose-950/90";
      badgeColor = "bg-rose-500/10 text-rose-300 border-rose-500/20";
      progressBg = "bg-rose-500";
      break;

    case "warning":
      icon = <TriangleAlert className="w-5 h-5 text-amber-400 shrink-0" />;
      borderClass = "border-amber-500/40";
      bgGradient = "from-slate-900/95 via-slate-900/95 to-amber-950/90";
      badgeColor = "bg-amber-500/10 text-amber-300 border-amber-500/20";
      progressBg = "bg-amber-500";
      break;

    case "wifi-off":
      icon = <WifiOff className="w-5 h-5 text-rose-400 animate-pulse shrink-0" />;
      borderClass = "border-rose-500/60 shadow-lg shadow-rose-950/30";
      bgGradient = "from-slate-900/95 via-slate-900/95 to-rose-950/95";
      badgeColor = "bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold";
      progressBg = "bg-rose-500";
      break;

    case "wifi-on":
      icon = <Wifi className="w-5 h-5 text-emerald-400 shrink-0" />;
      borderClass = "border-emerald-500/50 shadow-lg shadow-emerald-950/30";
      bgGradient = "from-slate-900/95 via-slate-900/95 to-emerald-950/95";
      badgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold";
      progressBg = "bg-emerald-500";
      break;
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, x: 50, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border backdrop-blur-xl bg-gradient-to-r ${bgGradient} ${borderClass} p-4 text-slate-100 shadow-2xl transition-all group`}
    >
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div className="mt-0.5 p-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
          {icon}
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold tracking-tight text-white line-clamp-1">
              {item.title}
            </h4>
          </div>

          {item.message && (
            <p className="text-xs text-slate-300/90 mt-1 leading-relaxed line-clamp-2 font-normal">
              {item.message}
            </p>
          )}

          {item.actionLabel && item.onAction && (
            <button
              type="button"
              onClick={() => {
                item.onAction?.();
                onClose();
              }}
              className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
            >
              <span>{item.actionLabel}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
          title="Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Animated Countdown Progress Bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800/50 overflow-hidden">
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: hovered ? "100%" : "0%" }}
            transition={{ duration: duration / 1000, ease: "linear" }}
            className={`h-full ${progressBg}`}
          />
        </div>
      )}
    </motion.div>
  );
}
