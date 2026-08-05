/**
 * Global Toast Notification Utility & Helper
 * 
 * Herhangi bir bileşenden veya fonksiyondan anında toast bildirimi
 * tetiklemek için kullanılan olay tabanlı yardımcı modül.
 */

export type ToastType = "success" | "error" | "info" | "warning" | "wifi-off" | "wifi-on";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // milisaniye cinsinden (0 ise kapanmaz)
  actionLabel?: string;
  onAction?: () => void;
}

export type ToastOptions = Omit<ToastItem, "id">;

export function showToast(options: ToastOptions) {
  const event = new CustomEvent("app-toast", {
    detail: {
      ...options,
      id: "toast_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
    },
  });
  window.dispatchEvent(event);
}

export const toast = {
  success: (title: string, message?: string, duration = 4000) => {
    showToast({ type: "success", title, message, duration });
  },
  error: (title: string, message?: string, duration = 5000) => {
    showToast({ type: "error", title, message, duration });
  },
  info: (title: string, message?: string, duration = 4000) => {
    showToast({ type: "info", title, message, duration });
  },
  warning: (title: string, message?: string, duration = 4500) => {
    showToast({ type: "warning", title, message, duration });
  },
  wifiOff: (message = "Ağ bağlantınız koptu. Lütfen internetinizi kontrol edin.") => {
    showToast({
      type: "wifi-off",
      title: "İnternet Bağlantısı Kesildi!",
      message,
      duration: 6000,
    });
  },
  wifiOn: (message = "Yeniden çevrimiçisiniz, tüm servisler aktif.") => {
    showToast({
      type: "wifi-on",
      title: "İnternet Bağlantısı Sağlandı",
      message,
      duration: 4000,
    });
  },
};
