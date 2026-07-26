import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Users, 
  Image as ImageIcon, 
  Trash2, 
  Search, 
  Lock, 
  Unlock, 
  Save, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Eye,
  Calendar,
  ChevronRight,
  MessageCircle,
  Plus,
  X,
  ShieldAlert,
  Mail,
  Send,
  Megaphone,
  DollarSign,
  ExternalLink,
  Edit3,
  Globe
} from "lucide-react";
import { SiteConfig, AdBanner } from "../types";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  createdAt: number;
  emailVerified?: boolean;
  isBanned?: boolean;
  banReason?: string;
}

interface AdminImage {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: number;
  deleteAfter: string;
  views: number;
  hasPassword: boolean;
  userId: string | null;
}

interface AdminViewProps {
  onBack: () => void;
}

export default function AdminView({ onBack }: AdminViewProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem("inanresim_admin_token") === "true");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  
  // Tab states
  const [activeSubTab, setActiveSubTab] = useState<"settings" | "users" | "images" | "chat" | "smtp" | "ads">("settings");
  
  // Ad Management states
  const [newBannerTitle, setNewBannerTitle] = useState("");
  const [newBannerImgUrl, setNewBannerImgUrl] = useState("");
  const [newBannerTargetUrl, setNewBannerTargetUrl] = useState("");
  const [newBannerPosition, setNewBannerPosition] = useState<"header" | "sidebar" | "footer" | "image-page">("header");
  const [newBannerHtml, setNewBannerHtml] = useState("");
  const [showAddBannerModal, setShowAddBannerModal] = useState(false);
  
  // SMTP Config states
  const [smtpConfig, setSmtpConfig] = useState({
    host: "",
    port: 587,
    user: "",
    pass: "",
    from: ""
  });
  const [smtpSaveSuccess, setSmtpSaveSuccess] = useState(false);
  const [smtpSaveError, setSmtpSaveError] = useState("");
  const [smtpIsLoading, setSmtpIsLoading] = useState(false);

  // SMTP Test states
  const [testEmail, setTestEmail] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testIsLoading, setTestIsLoading] = useState(false);
  
  // Loading & Action feedback
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New admin password variables
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");

  // New mod password variables
  const [newModPassword, setNewModPassword] = useState("");
  const [changeModPasswordSuccess, setChangeModPasswordSuccess] = useState(false);
  const [changeModPasswordError, setChangeModPasswordError] = useState("");
  
  // Data states
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    homepageTitle: "",
    homepageSubtitle: "",
    announcementEnabled: false,
    announcementText: "",
    statsOffset: 0,
    usersOffset: 0,
    todayOffset: 0,
    maintenanceModeEnabled: false,
    miniChatEnabled: true
  });

  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [newAnnText, setNewAnnText] = useState("");

  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [moderationLogs, setModerationLogs] = useState<any[]>([]);
  const [chatSlowMode, setChatSlowMode] = useState(false);
  const [directBanUserId, setDirectBanUserId] = useState("");
  const [directBanUsername, setDirectBanUsername] = useState("");
  
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [imagesList, setImagesList] = useState<AdminImage[]>([]);
  
  // Bulk/Batch delete image states
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showDeleteAllConfirmModal, setShowDeleteAllConfirmModal] = useState(false);
  
  // Search/Filter states
  const [userSearch, setUserSearch] = useState("");
  const [imageSearch, setImageSearch] = useState("");

  // Authenticate Admin dynamically
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setAuthError("");
        localStorage.setItem("inanresim_admin_token", "true");
        localStorage.setItem("inanresim_admin_visible", "true");
      } else {
        setAuthError(data.error || "Geçersiz yönetici şifresi! (Örn: 'admin' deneyin)");
      }
    } catch (err) {
      setAuthError("Sunucu bağlantısı sırasında hata oluştu.");
    }
  };

  const fetchSmtpConfig = async () => {
    try {
      const res = await fetch("/api/admin/smtp");
      const data = await res.json();
      if (res.ok) {
        setSmtpConfig(data);
      }
    } catch (e) {
      console.error("SMTP config fetch error", e);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpIsLoading(true);
    setSmtpSaveSuccess(false);
    setSmtpSaveError("");
    try {
      const res = await fetch("/api/admin/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(smtpConfig),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSmtpSaveSuccess(true);
        setSmtpConfig(data.smtp);
        setTimeout(() => setSmtpSaveSuccess(false), 3000);
      } else {
        setSmtpSaveError(data.error || "SMTP ayarları kaydedilemedi.");
      }
    } catch (err) {
      setSmtpSaveError("Bağlantı hatası oluştu.");
    } finally {
      setSmtpIsLoading(false);
    }
  };

  const handleTestSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestIsLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...smtpConfig,
          testEmail: testEmail.trim()
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ success: true, message: data.message });
      } else {
        setTestResult({ success: false, message: data.error || "E-posta gönderimi başarısız oldu." });
      }
    } catch (err) {
      setTestResult({ success: false, message: "Bağlantı hatası oluştu." });
    } finally {
      setTestIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError("");
    setChangePasswordSuccess(false);
    if (newAdminPassword.trim().length < 4) {
      setChangePasswordError("Şifre en az 4 karakter olmalıdır.");
      return;
    }
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newAdminPassword.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setChangePasswordSuccess(true);
        setNewAdminPassword("");
      } else {
        setChangePasswordError(data.error || "Şifre güncellenemedi.");
      }
    } catch (err) {
      setChangePasswordError("Bağlantı hatası oluştu.");
    }
  };

  const handleChangeModPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeModPasswordError("");
    setChangeModPasswordSuccess(false);
    if (newModPassword.trim().length < 4) {
      setChangeModPasswordError("Moderatör şifresi en az 4 karakter olmalıdır.");
      return;
    }
    try {
      const res = await fetch("/api/admin/change-mod-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newModPassword.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setChangeModPasswordSuccess(true);
        setNewModPassword("");
      } else {
        setChangeModPasswordError(data.error || "Moderatör şifresi güncellenemedi.");
      }
    } catch (err) {
      setChangeModPasswordError("Bağlantı hatası oluştu.");
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      if (res.ok) {
        setSiteConfig(data);
        setAnnouncements(data.announcements || (data.announcementText ? [data.announcementText] : []));
      }
    } catch (e) {
      console.error("Config fetch error", e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok) {
        setUsersList(data);
      }
    } catch (e) {
      console.error("Users fetch error", e);
    }
  };

  const fetchImages = async () => {
    try {
      const res = await fetch("/api/admin/images");
      const data = await res.json();
      if (res.ok) {
        setImagesList(data);
      }
    } catch (e) {
      console.error("Images fetch error", e);
    }
  };

  const fetchBannedUsers = async () => {
    try {
      const res = await fetch("/api/admin/chat/bans");
      const data = await res.json();
      if (res.ok) {
        setBannedUsers(data);
      }
    } catch (e) {
      console.error("Fetch bans error", e);
    }
  };

  const fetchChatSlowMode = async () => {
    try {
      const res = await fetch("/api/chat/slowmode");
      const data = await res.json();
      if (res.ok && data.slowMode !== undefined) {
        setChatSlowMode(data.slowMode);
      }
    } catch (e) {
      console.error("Fetch slowmode error", e);
    }
  };

  const fetchModerationLogs = async () => {
    try {
      const res = await fetch("/api/admin/chat/logs");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setModerationLogs(data);
      }
    } catch (e) {
      console.error("Fetch moderation logs error", e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      setIsLoading(true);
      Promise.all([
        fetchConfig(),
        fetchUsers(),
        fetchImages(),
        fetchBannedUsers(),
        fetchChatSlowMode(),
        fetchModerationLogs(),
        fetchSmtpConfig()
      ]).finally(() => {
        setIsLoading(false);
      });
    }
  }, [isAuthenticated]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...siteConfig, announcements }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert("Ayarlar kaydedilemedi.");
      }
    } catch (err) {
      alert("Hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm("Bu görseli kalıcı olarak silmek istediğinize emin misiniz?")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/images/${imageId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setImagesList(prev => prev.filter(img => img.id !== imageId));
        setSelectedImageIds(prev => prev.filter(id => id !== imageId));
        alert("Görsel başarıyla silindi.");
      } else {
        alert("Görsel silinemedi.");
      }
    } catch (e) {
      alert("Hata oluştu.");
    }
  };

  const toggleSelectImage = (id: string) => {
    setSelectedImageIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllImages = () => {
    if (selectedImageIds.length === filteredImages.length && filteredImages.length > 0) {
      setSelectedImageIds([]);
    } else {
      setSelectedImageIds(filteredImages.map(img => img.id));
    }
  };

  const handleBatchDeleteImages = async () => {
    if (selectedImageIds.length === 0) return;
    if (!confirm(`Seçilen ${selectedImageIds.length} adet görseli kalıcı olarak silmek istediğinize emin misiniz?`)) {
      return;
    }
    setIsBulkDeleting(true);
    try {
      const res = await fetch("/api/admin/images/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedImageIds })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setImagesList(prev => prev.filter(img => !selectedImageIds.includes(img.id)));
        setSelectedImageIds([]);
        alert(`${data.count || selectedImageIds.length} adet görsel başarıyla silindi.`);
      } else {
        alert(data.error || "Görseller silinemedi.");
      }
    } catch (e) {
      alert("Sunucu hatası oluştu.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteAllImages = async () => {
    setIsBulkDeleting(true);
    try {
      const res = await fetch("/api/admin/images/delete-all", {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setImagesList([]);
        setSelectedImageIds([]);
        setShowDeleteAllConfirmModal(false);
        alert(data.message || "Sistemdeki tüm görseller başarıyla silindi.");
      } else {
        alert(data.error || "Tüm görseller silinirken bir hata oluştu.");
      }
    } catch (e) {
      alert("Sunucu hatası oluştu.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleToggleSlowMode = async (checked: boolean) => {
    setChatSlowMode(checked);
    try {
      await fetch("/api/admin/chat/slowmode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slowMode: checked })
      });
      fetchModerationLogs();
    } catch (e) {
      console.error("Toggle slowmode error", e);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/chat/unban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        alert("Kullanıcının engeli başarıyla kaldırıldı.");
        fetchBannedUsers();
        fetchModerationLogs();
      } else {
        alert("Engel kaldırılamadı.");
      }
    } catch (e) {
      alert("Hata oluştu.");
    }
  };

  const handleBanUserDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directBanUserId.trim()) return;

    try {
      const res = await fetch("/api/admin/chat/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: directBanUserId.trim(),
          username: directBanUsername.trim() || "Kullanıcı"
        })
      });
      if (res.ok) {
        alert("Kullanıcı başarıyla yasaklandı.");
        setDirectBanUserId("");
        setDirectBanUsername("");
        fetchBannedUsers();
        fetchModerationLogs();
      } else {
        alert("Yasaklama işlemi başarısız.");
      }
    } catch (e) {
      alert("Hata oluştu.");
    }
  };

  const handleClearChat = async () => {
    if (!confirm("Sohbet odasındaki TÜM mesajları silmek ve sıfırlamak istediğinize emin misiniz? Bu işlem geri alınamaz!")) {
      return;
    }
    try {
      const res = await fetch("/api/admin/chat/clear", {
        method: "POST"
      });
      if (res.ok) {
        alert("Sohbet odası mesajları başarıyla temizlendi.");
        fetchModerationLogs();
      } else {
        alert("Sohbet odası temizlenemedi.");
      }
    } catch (e) {
      alert("Hata oluştu.");
    }
  };

  // User Management Actions
  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`"@${username}" isimli kullanıcı hesabını kalıcı olarak silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setUsersList((prev) => prev.filter((u) => u.id !== userId));
      } else {
        alert(data.error || "Kullanıcı silinemedi.");
      }
    } catch (e) {
      alert("Bağlantı hatası.");
    }
  };

  const handleToggleBanUser = async (userId: string, currentIsBanned: boolean, username: string) => {
    let banReason = "";
    if (!currentIsBanned) {
      const input = window.prompt(`"@${username}" kullanıcısını engelleme nedeni (opsiyonel):`, "Sistem kural ihlali");
      if (input === null) return; // User cancelled
      banReason = input;
    } else {
      if (!window.confirm(`"@${username}" kullanıcısının engelini kaldırmak istediğinize emin misiniz?`)) {
        return;
      }
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBanned: !currentIsBanned, banReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsersList((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, isBanned: !currentIsBanned, banReason } : u
          )
        );
      } else {
        alert(data.error || "İşlem başarısız.");
      }
    } catch (e) {
      alert("Bağlantı hatası.");
    }
  };

  // Format Helpers
  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("tr-TR");
  };

  // Filter lists
  const filteredUsers = usersList.filter(u => 
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredImages = imagesList.filter(img => 
    img.name.toLowerCase().includes(imageSearch.toLowerCase()) ||
    img.id.toLowerCase().includes(imageSearch.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="max-w-md w-full mx-auto my-12 px-4 animate-fade-in" id="admin-login-card">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-[32px] shadow-xl p-6 sm:p-8 text-center transition-colors duration-300">
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner shadow-blue-500/10">
            <Settings className="w-7 h-7 animate-spin" style={{ animationDuration: "12s" }} />
          </div>
          
          <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Yönetici Girişi</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 mb-8 leading-relaxed">
            İnanResim sistem yapılandırmasını canlı düzenlemek ve kullanıcı listelerini denetlemek için şifrenizi doğrulayın.
          </p>

          <form onSubmit={handleAuth} className="space-y-5" id="admin-login-form">
            <div>
              <label className="block text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 pl-1">
                Yönetici Şifresi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="admin-pwd-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Yönetici şifresini girin (Örn: admin)"
                  className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-950/50 text-slate-800 dark:text-white border border-slate-200/50 dark:border-slate-800/80 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 transition-all shadow-sm"
                  required
                />
              </div>
            </div>

            {authError && (
              <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/25 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl flex items-start gap-2.5 animate-fade-in" id="admin-auth-error">
                <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-rose-500" />
                <span className="leading-relaxed text-left">{authError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                id="admin-back-btn"
                type="button"
                onClick={onBack}
                className="flex-1 py-3.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Geri Dön
              </button>
              <button
                id="admin-submit-btn"
                type="submit"
                className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
              >
                Doğrula
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto my-8 px-4" id="admin-dashboard-container">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Sistem Yöneticisi</span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Aktif Bağlantı
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight mt-1">Yönetici Kontrol Paneli</h1>
          <p className="text-xs text-slate-400 mt-1">Görselleri denetleyin, kullanıcı istatistiklerini izleyin ve ana sayfayı canlı düzenleyin.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              localStorage.removeItem("inanresim_admin_token");
              localStorage.removeItem("inanresim_admin_visible");
              localStorage.removeItem("chat_moderator_session");
              window.dispatchEvent(new Event("storage"));
              setIsAuthenticated(false);
              onBack();
            }}
            className="px-4 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            Yönetici Çıkışı 🔒
          </button>
          <button
            id="admin-exit-btn"
            onClick={onBack}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>

      {/* Admin Quick Metrics Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold">Toplam Kullanıcı</span>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">{usersList.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold">Yüklenen Resim (Gerçek)</span>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">{imagesList.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ImageIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold">Toplam Gösterim</span>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">
              {imagesList.reduce((acc, img) => acc + (img.views || 0), 0)}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Eye className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Admin Tab Buttons */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1 mb-6" id="admin-subtabs-nav">
        <button
          onClick={() => setActiveSubTab("settings")}
          className={`px-5 py-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === "settings"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <Settings className="w-4 h-4" />
          Site Ayarları & Başlıklar
        </button>

        <button
          onClick={() => setActiveSubTab("users")}
          className={`px-5 py-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === "users"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <Users className="w-4 h-4" />
          Kayıtlı Üyeler ({usersList.length})
        </button>

        <button
          onClick={() => setActiveSubTab("images")}
          className={`px-5 py-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === "images"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Tüm Yüklenen Görseller ({imagesList.length})
        </button>

        <button
          onClick={() => setActiveSubTab("chat")}
          className={`px-5 py-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === "chat"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Sohbet Moderasyonu
        </button>

        <button
          id="admin-smtp-tab"
          onClick={() => setActiveSubTab("smtp")}
          className={`px-5 py-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === "smtp"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <Mail className="w-4 h-4" />
          SMTP E-Posta Ayarları
        </button>

        <button
          id="admin-ads-tab"
          onClick={() => setActiveSubTab("ads")}
          className={`px-5 py-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === "ads"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <Megaphone className="w-4 h-4 text-amber-500" />
          Reklam Yönetimi & Bannerlar
        </button>
      </div>

      {/* Tab Contents */}
      {activeSubTab === "settings" && (
        <form onSubmit={handleSaveConfig} className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-6" id="admin-settings-form">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-400" />
              Ana Sayfa Görünümü Düzenleme
            </h3>
            <button
              type="button"
              onClick={fetchConfig}
              title="Yenile"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Ana Başlık (Title)</label>
              <input
                type="text"
                value={siteConfig.homepageTitle}
                onChange={(e) => setSiteConfig({ ...siteConfig, homepageTitle: e.target.value })}
                placeholder="Örn: Hızlı ve Güvenilir Resim Paylaşımı"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Alt Açıklama (Subtitle)</label>
              <input
                type="text"
                value={siteConfig.homepageSubtitle}
                onChange={(e) => setSiteConfig({ ...siteConfig, homepageSubtitle: e.target.value })}
                placeholder="Örn: Saniyeler içinde resim yükleyin..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                required
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Yönetici Duyuru Panosu</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Sitenin en üstünde gösterilecek duyuruları ekleyin, sıralayın ve silin.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={siteConfig.announcementEnabled}
                  onChange={(e) => setSiteConfig({ ...siteConfig, announcementEnabled: e.target.checked })}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* List of active announcements */}
            {announcements.length > 0 ? (
              <div className="space-y-2 mb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Yayındaki Duyurular ({announcements.length})</span>
                {announcements.map((ann, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 px-4 py-2.5 rounded-xl">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{ann}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = announcements.filter((_, i) => i !== idx);
                        setAnnouncements(next);
                        // sync first announcement for legacy views
                        setSiteConfig(prev => ({ ...prev, announcementText: next[0] || "" }));
                      }}
                      className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic mb-4">Şu an aktif duyuru bulunmuyor.</p>
            )}

            {/* Add new announcement form */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newAnnText}
                onChange={(e) => setNewAnnText(e.target.value)}
                placeholder="Yeni bir duyuru mesajı yazın..."
                className="flex-grow px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-slate-50/50 focus:bg-white"
                disabled={!siteConfig.announcementEnabled}
              />
              <button
                type="button"
                disabled={!siteConfig.announcementEnabled || !newAnnText.trim()}
                onClick={() => {
                  const next = [...announcements, newAnnText.trim()];
                  setAnnouncements(next);
                  setNewAnnText("");
                  setSiteConfig(prev => ({ ...prev, announcementText: next[0] || "" }));
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                Ekle
              </button>
            </div>

            {/* Ready-made Announcement Templates shortcuts */}
            <div className="mt-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Hazır Duyuru Taslakları (Listeye Ekle)</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "🔧 Bakım Duyurusu", text: "🔧 Duyuru: Sistemlerimizde yapılacak kısa süreli bakım çalışması nedeniyle bu gece 02:00-04:00 saatleri arasında kesintiler yaşanabilir." },
                  { label: "🌙 Gece Modu", text: "🌙 Yeni Özellik: Sitemize ses efektli Gece/Gündüz modu eklendi! Sağ üstteki butondan hemen deneyebilirsiniz." },
                  { label: "🔒 Güvenlik", text: "🔒 Bilgilendirme: Hassas veya kişisel görselleriniz için şifre koruma ve otomatik silinme özelliklerimizi ücretsiz kullanabilirsiniz." },
                  { label: "🚀 Limitler", text: "🚀 Bilgi: İnanResim üzerinde üye olmadan tek seferde maksimum 20MB dosya boyutuna kadar resim yükleyebilirsiniz!" },
                  { label: "🎉 Bayram", text: "🎉 İnanResim ailesi olarak tüm kullanıcılarımızın bayramını ve tatilini en içten dileklerimizle kutlarız!" }
                ].map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={!siteConfig.announcementEnabled}
                    onClick={() => {
                      const next = [...announcements, tpl.text];
                      setAnnouncements(next);
                      setSiteConfig(prev => ({ ...prev, announcementText: next[0] || "" }));
                    }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 disabled:opacity-50 text-slate-600 hover:text-blue-600 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-4">⚙️ Yükleme & Üyelik Sınırları</h4>
            <p className="text-[11px] text-slate-400 mb-4 -mt-3">Misafir ve üye kullanıcılar için dosya boyutu ve yükleme sayısı limitlerini yapılandırın.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Guest Limits Card */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <h5 className="text-xs font-extrabold text-slate-800 mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Misafir (Üye Olmayan) Limitleri
                </h5>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Maksimum Dosya Boyutu (MB)</label>
                    <input
                      type="number"
                      min="1"
                      value={siteConfig.guestMaxMb ?? 20}
                      onChange={(e) => setSiteConfig({ ...siteConfig, guestMaxMb: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Örn: 20 (Üye olmadan en fazla 20 MB yükleyebilir)</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Maksimum Yükleme Adedi</label>
                    <input
                      type="number"
                      min="1"
                      value={siteConfig.guestMaxUploadCount ?? 5}
                      onChange={(e) => setSiteConfig({ ...siteConfig, guestMaxUploadCount: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Örn: 5 (Misafir kullanıcı toplamda en fazla 5 resim/video yükleyebilir)</span>
                  </div>
                </div>
              </div>

              {/* Registered Limits Card */}
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                <h5 className="text-xs font-extrabold text-blue-900 mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Kayıtlı Üye Limitleri
                </h5>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Maksimum Dosya Boyutu (MB)</label>
                    <input
                      type="number"
                      min="0"
                      value={siteConfig.registeredMaxMb ?? 1000}
                      onChange={(e) => setSiteConfig({ ...siteConfig, registeredMaxMb: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Örn: 1000 (Üyeler için dosya boyutu sınırı. 1000 MB = 1 GB. 0 = Sınırsız)</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Maksimum Yükleme Adedi (0 = Sınırsız)</label>
                    <input
                      type="number"
                      min="0"
                      value={siteConfig.registeredMaxUploadCount ?? 0}
                      onChange={(e) => setSiteConfig({ ...siteConfig, registeredMaxUploadCount: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Örn: 0 (Kayıtlı üyeler için yükleme adedi. 0 = Sınırsız yükleme)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Email Verification Requirement Toggle */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between mb-6">
              <div>
                <h5 className="text-xs font-extrabold text-slate-800">📩 E-Posta Doğrulama Zorunluluğu</h5>
                <p className="text-[10px] text-slate-400 mt-0.5 max-w-[400px]">Yeni üye olan kullanıcıların e-postalarına gelen 6 haneli kodu onaylamadan giriş yapmalarını engeller.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={siteConfig.requireEmailVerification !== false}
                  onChange={(e) => setSiteConfig({ ...siteConfig, requireEmailVerification: e.target.checked })}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-4">Sistem Fonksiyonları & Çalışma Modları</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Maintenance Mode */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                <div>
                  <h5 className="text-xs font-extrabold text-slate-700 dark:text-slate-300">🔧 Bakım Modu (Maintenance Mode)</h5>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[280px]">Aktif edildiğinde sıradan ziyaretçiler güzel bir bakım ekranı ile karşılaşır, sadece yöneticiler siteyi kullanabilir.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={!!siteConfig.maintenanceModeEnabled}
                    onChange={(e) => setSiteConfig({ ...siteConfig, maintenanceModeEnabled: e.target.checked })}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Chat Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                <div>
                  <h5 className="text-xs font-extrabold text-slate-700 dark:text-slate-300">💬 Mini Sohbet Kutusu (Mini Chat)</h5>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[280px]">Sohbet panelini tamamen kapatıp açmanıza olanak tanır. Kapatıldığında sohbet arayüzü gizlenir.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={siteConfig.miniChatEnabled !== false}
                    onChange={(e) => setSiteConfig({ ...siteConfig, miniChatEnabled: e.target.checked })}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-4">İstatistik Sayaçları Başlangıç Değerleri (Seed Offset)</h4>
            <p className="text-[11px] text-slate-400 mb-4 -mt-3">Sitede gösterilen toplam sayaçları zenginleştirmek için offset ekleyebilirsiniz.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Toplam Resim Başlangıç</label>
                <input
                  type="number"
                  value={siteConfig.statsOffset}
                  onChange={(e) => setSiteConfig({ ...siteConfig, statsOffset: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Aktif Üyeler Başlangıç</label>
                <input
                  type="number"
                  value={siteConfig.usersOffset}
                  onChange={(e) => setSiteConfig({ ...siteConfig, usersOffset: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Bugün Yüklenen Başlangıç</label>
                <input
                  type="number"
                  value={siteConfig.todayOffset}
                  onChange={(e) => setSiteConfig({ ...siteConfig, todayOffset: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {saveSuccess ? (
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl">
                <CheckCircle className="w-4 h-4" />
                Değişiklikler başarıyla kaydedildi ve yayına alındı!
              </p>
            ) : (
              <div></div>
            )}

            <button
              id="admin-save-btn"
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isLoading ? "Kaydediliyor..." : "Ayarları Kaydet"}
            </button>
          </div>
        </form>
      )}

      {activeSubTab === "settings" && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6" id="admin-passwords-container">
          {/* Admin Password Card */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 flex flex-col justify-between" id="admin-password-card">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Lock className="w-5 h-5" />
                </span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">
                  👑 Yönetici (Admin) Şifresi
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                Yönetici kontrol panelinin tam yetkili giriş şifresini belirleyin ve güncelleyin.
              </p>
              
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Yeni Yönetici Şifresi</label>
                  <input
                    type="password"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="Yeni yönetici şifreniz (Min 4 karakter)..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
                    required
                  />
                </div>

                {changePasswordError && (
                  <p className="text-xs text-rose-500 font-semibold">{changePasswordError}</p>
                )}

                {changePasswordSuccess && (
                  <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 bg-emerald-50 p-2.5 rounded-xl">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    <span>Yönetici şifresi güncellendi!</span>
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Yönetici Şifresini Kaydet</span>
                </button>
              </form>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
              <span className="font-bold text-slate-500">Varsayılan:</span> admin / 1234
            </div>
          </div>

          {/* Moderator Password Card */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 flex flex-col justify-between" id="mod-password-card">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Lock className="w-5 h-5 text-amber-500" />
                </span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">
                  ⚡ Özel Üye / Moderatör Şifresi
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                Sohbet odasında üyeleri susturma, engelleme ve mesaj temizleme yetkisi veren ayrı Moderatör şifresi.
              </p>
              
              <form onSubmit={handleChangeModPassword} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Yeni Moderatör Şifresi</label>
                  <input
                    type="password"
                    value={newModPassword}
                    onChange={(e) => setNewModPassword(e.target.value)}
                    placeholder="Yeni moderatör şifreniz (Min 4 karakter)..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-semibold"
                    required
                  />
                </div>

                {changeModPasswordError && (
                  <p className="text-xs text-rose-500 font-semibold">{changeModPasswordError}</p>
                )}

                {changeModPasswordSuccess && (
                  <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 bg-emerald-50 p-2.5 rounded-xl">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    <span>Moderatör şifresi güncellendi!</span>
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Moderatör Şifresini Kaydet</span>
                </button>
              </form>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
              <span className="font-bold text-slate-500">Varsayılan:</span> mod123
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "users" && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6" id="admin-users-panel">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-400" />
              Kayıtlı Üye Listesi
            </h3>

            <div className="relative max-w-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Kullanıcı adı veya e-posta ara..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Users Table */}
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
              Kayıtlı üye bulunamadı.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="py-3 px-4">Kullanıcı Adı</th>
                    <th className="py-3 px-4">E-posta</th>
                    <th className="py-3 px-4">Durum</th>
                    <th className="py-3 px-4">Kayıt Tarihi</th>
                    <th className="py-3 px-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors ${u.isBanned ? "bg-rose-50/30" : ""}`}>
                      <td className="py-3.5 px-4 font-extrabold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span>@{u.username}</span>
                          {u.isBanned && (
                            <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" />
                              Engelli
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="flex items-center gap-2">
                          <span>{u.email}</span>
                          {u.emailVerified ? (
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5" title="E-posta Doğrulandı">
                              <CheckCircle className="w-3 h-3" />
                              Onaylı
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-bold" title="E-posta Onaysız">
                              Onaysız
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {u.isBanned ? (
                          <div className="text-[11px] text-rose-600 font-semibold" title={u.banReason}>
                            🚫 {u.banReason ? `Engelli (${u.banReason})` : "Hesap Engellendi"}
                          </div>
                        ) : (
                          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Aktif
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(u.createdAt)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleBanUser(u.id, !!u.isBanned, u.username)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                              u.isBanned
                                ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
                                : "bg-amber-100 hover:bg-amber-200 text-amber-800"
                            }`}
                            title={u.isBanned ? "Kullanıcının Engelini Kaldır" : "Kullanıcıyı Engelle"}
                          >
                            {u.isBanned ? (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                Engeli Kaldır
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                Engelle
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer"
                            title="Kullanıcıyı Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeSubTab === "images" && (
        <div className="space-y-6" id="admin-images-panel">
          {/* Main Card Header & Action Bar */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-blue-600" />
                    Sistemdeki Tüm Yüklenen Görseller
                  </h3>
                  <span className="text-[10px] font-black px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200/60">
                    {imagesList.length} Görsel ({formatBytes(imagesList.reduce((acc, img) => acc + (img.size || 0), 0))})
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Yüklenen tüm medyaları görüntüleyin, seçmeli veya toplu olarak sistemden tamamen silin.
                </p>
              </div>

              {/* Action Buttons: Search & Delete All Button */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={imageSearch}
                    onChange={(e) => setImageSearch(e.target.value)}
                    placeholder="Görsel adı veya ID ara..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {imagesList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteAllConfirmModal(true)}
                    disabled={isBulkDeleting}
                    className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                    title="Sistemdeki Tüm Görselleri Kalıcı Olarak Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                    Tüm Görselleri Sil ({imagesList.length})
                  </button>
                )}
              </div>
            </div>

            {/* Selection & Batch Action Toolbar */}
            {filteredImages.length > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl">
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedImageIds.length > 0 && selectedImageIds.length === filteredImages.length}
                      onChange={toggleSelectAllImages}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Tümünü Seç ({filteredImages.length})</span>
                  </label>

                  {selectedImageIds.length > 0 && (
                    <span className="text-xs text-slate-500 font-medium">
                      • <strong className="text-blue-600 font-bold">{selectedImageIds.length}</strong> görsel seçildi
                    </span>
                  )}
                </div>

                {selectedImageIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleBatchDeleteImages}
                    disabled={isBulkDeleting}
                    className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Seçilenleri Sil ({selectedImageIds.length})
                  </button>
                )}
              </div>
            )}

            {/* Images Grid */}
            {filteredImages.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                Hiç görsel yüklenmemiş veya eşleşen sonuç bulunamadı.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredImages.map((img) => {
                  const isSelected = selectedImageIds.includes(img.id);
                  return (
                    <div
                      key={img.id}
                      className={`border rounded-2xl p-4 flex flex-col transition-all relative ${
                        isSelected
                          ? "border-rose-400 bg-rose-50/30 ring-2 ring-rose-400/30 shadow-md"
                          : "border-slate-100 hover:border-slate-200 hover:shadow-md bg-slate-50/20"
                      }`}
                    >
                      {/* Checkbox badge on top-left */}
                      <div className="absolute top-6 left-6 z-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectImage(img.id)}
                          className="w-5 h-5 text-rose-600 rounded-lg border-2 border-white shadow-md focus:ring-rose-500 cursor-pointer"
                        />
                      </div>

                      {/* Thumbnail */}
                      <div className="aspect-video w-full rounded-xl bg-slate-100 border border-slate-200/60 overflow-hidden relative group">
                        <img
                          src={`/api/images/${img.id}`}
                          alt={img.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <div className="absolute top-2 right-2 bg-slate-900/70 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                          {img.id}
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="mt-3 flex-grow">
                        <h4 className="font-bold text-xs text-slate-800 line-clamp-1" title={img.name}>{img.name}</h4>
                        <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 mt-2.5 text-[11px] text-slate-500 font-medium">
                          <div>Boyut: <span className="font-semibold text-slate-700">{formatBytes(img.size)}</span></div>
                          <div>Gösterim: <span className="font-semibold text-slate-700">{img.views}</span></div>
                          <div className="col-span-2">Yüklenme: <span className="font-semibold text-slate-700">{formatDate(img.uploadedAt)}</span></div>
                          <div>Silinme: <span className="font-semibold text-slate-700">{img.deleteAfter === "never" ? "Asla" : img.deleteAfter}</span></div>
                          <div>
                            Şifre:{" "}
                            <span className={`font-semibold ${img.hasPassword ? "text-red-500" : "text-emerald-500"} inline-flex items-center gap-0.5`}>
                              {img.hasPassword ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                              {img.hasPassword ? "Şifreli" : "Açık"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                        <a
                          href={`/?view=image-detail&id=${img.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg text-center transition-all flex items-center justify-center gap-1"
                        >
                          Detay
                          <ChevronRight className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleDeleteImage(img.id)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all flex items-center justify-center cursor-pointer"
                          title="Görseli Sistemden Kaldır"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Double Confirmation Modal for "Delete All Images" */}
          {showDeleteAllConfirmModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-scale-up border border-slate-100 text-center">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                  <ShieldAlert className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Tüm Görseller Silinsin mi?
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Sistemde kayıtlı olan <strong className="text-rose-600 font-extrabold">{imagesList.length} adet görselin tümü</strong> kalıcı olarak silinecek. Bu işlem geri alınamaz!
                  </p>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 font-medium text-left space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Dikkat:
                  </div>
                  <p>Sunucuda ve veritabanında saklanan tüm resim dosyaları tamamen temizlenecektir.</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteAllConfirmModal(false)}
                    disabled={isBulkDeleting}
                    className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAllImages}
                    disabled={isBulkDeleting}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isBulkDeleting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Siliniyor...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Evet, Hepsini Sil
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === "chat" && (
        <div className="space-y-6" id="admin-chat-moderation-panel">
          {/* Chat Settings Box */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
              <MessageCircle className="w-5 h-5 text-slate-400" />
              Sohbet Genel Ayarları
            </h3>
            <p className="text-xs text-slate-400 mb-6">Sohbet odasının akış hızını ve kurallarını buradan kontrol edebilirsiniz.</p>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">3 Saniye Yavaş Mod (Slow Mode)</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Kullanıcıların peş peşe hızlı mesaj atarak spamlama yapmasını engeller.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={chatSlowMode}
                  onChange={(e) => handleToggleSlowMode(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Clear Chat Panel row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/20 rounded-2xl mt-4 gap-4">
              <div>
                <h4 className="text-xs font-bold text-rose-800 dark:text-rose-400 flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  Sohbet Mesajlarını Temizle / Sıfırla
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Sohbet odasındaki tüm mesaj geçmişini kalıcı olarak siler ve sıfırlar.</p>
              </div>
              <button
                type="button"
                onClick={handleClearChat}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Tüm Mesajları Toplu Sil
              </button>
            </div>
          </div>

          {/* Banned Users List Box */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-slate-400" />
              Yasaklı (Banlı) Kullanıcılar
            </h3>
            <p className="text-xs text-slate-400 mb-6">Küfür, hakaret veya kurallara aykırı davranıştan dolayı sistem tarafından veya manuel olarak yasaklanan kullanıcılar.</p>

            {bannedUsers.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                Şu anda yasaklı herhangi bir kullanıcı bulunmuyor.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="py-3 px-4">Kullanıcı Adı / Rumuz</th>
                      <th className="py-3 px-4">Yasaklanma Sebebi / Uyarı Skoru</th>
                      <th className="py-3 px-4">Kullanıcı ID</th>
                      <th className="py-3 px-4 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {bannedUsers.map((b) => (
                      <tr key={b.userId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-extrabold text-slate-800">
                          {b.username}
                        </td>
                        <td className="py-3.5 px-4 text-rose-600 font-semibold flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Maksimum Uyarı Sınırı Aşıldı (3/3 Uyarı)</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">{b.userId}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleUnbanUser(b.userId)}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            Engeli Kaldır
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Manual Ban Form Box */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-slate-400" />
              Kullanıcıyı Doğrudan Yasakla
            </h3>
            <p className="text-xs text-slate-400 mb-6">Bir kullanıcının ID'sini yazarak onu sohbet odasından süresiz olarak yasaklayabilirsiniz.</p>

            <form onSubmit={handleBanUserDirectly} className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Kullanıcı ID (Gerekli)</label>
                <input
                  type="text"
                  required
                  value={directBanUserId}
                  onChange={(e) => setDirectBanUserId(e.target.value)}
                  placeholder="Örn: guest_12345"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Rumuz / İsim (İsteğe Bağlı)</label>
                <input
                  type="text"
                  value={directBanUsername}
                  onChange={(e) => setDirectBanUsername(e.target.value)}
                  placeholder="Örn: Ahmet"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Doğrudan Yasakla (Ban)
                </button>
              </div>
            </form>
          </div>

          {/* Moderation Log History Box */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-slate-400" />
                  Sohbet Moderasyon Günlükleri (Loglar)
                </h3>
                <p className="text-xs text-slate-400 mt-1">Sohbet odasındaki tüm uyarı, ceza, engelleme ve temizlik işlemlerinin kronolojik kaydı.</p>
              </div>
              <button
                type="button"
                onClick={fetchModerationLogs}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Güncelle
              </button>
            </div>

            {moderationLogs.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                Sistemde kayıtlı henüz herhangi bir moderasyon işlemi günlüğü bulunmuyor.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="py-3 px-4">Tarih</th>
                      <th className="py-3 px-4">İşlem / Etiket</th>
                      <th className="py-3 px-4">Kullanıcı (ID)</th>
                      <th className="py-3 px-4">Detaylar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {moderationLogs.map((log: any) => {
                      const badge = (() => {
                        switch (log.action) {
                          case "WARNING_1":
                            return <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 text-[9px] font-extrabold border border-amber-100/50">1. UYARI</span>;
                          case "MUTE":
                            return <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 text-[9px] font-extrabold border border-orange-100/50">SUSTURMA</span>;
                          case "BAN_AUTO":
                            return <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 text-[9px] font-extrabold border border-rose-100/50">OTOMATİK BAN</span>;
                          case "BAN_MANUAL":
                            return <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 text-[9px] font-extrabold border border-red-100/50">MANUEL BAN</span>;
                          case "UNBAN":
                            return <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 text-[9px] font-extrabold border border-emerald-100/50">YASAK KALKTI</span>;
                          case "CHAT_CLEAR":
                            return <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 text-[9px] font-extrabold border border-purple-100/50">SOHBET SİLİNDİ</span>;
                          case "SLOWMODE_ON":
                            return <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 text-[9px] font-extrabold border border-blue-100/50">SLOWMODE AÇIK</span>;
                          case "SLOWMODE_OFF":
                            return <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-700 dark:bg-slate-950/20 dark:text-slate-400 text-[9px] font-extrabold border border-slate-100/50">SLOWMODE KAPALI</span>;
                          default:
                            return <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-700 dark:bg-slate-950/20 dark:text-slate-400 text-[9px] font-extrabold border border-slate-100/50">{log.action}</span>;
                        }
                      })();

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-400 whitespace-nowrap text-[11px]">
                            {formatDate(log.createdAt)}
                          </td>
                          <td className="py-3 px-4 shrink-0">
                            {badge}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 mr-1.5">{log.username}</span>
                            <span className="font-mono text-[9px] text-slate-400">({log.userId})</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                            {log.details}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === "smtp" && (
        <div className="space-y-6" id="admin-smtp-panel">
          {/* Gmail / SMTP Bilgilendirme Kılavuzu */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-6 space-y-3">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Gmail & Outlook İçin Özel Şifre (Uygulama Şifresi) Gerekir!
            </h4>
            <div className="text-xs text-amber-800 space-y-2 leading-relaxed">
              <p>
                Google (Gmail) ve Microsoft (Outlook/Hotmail) yüksek güvenlik politikaları gereği, bu panele <strong>normal e-posta giriş şifrenizi yazarsanız bağlantı kurulamayacaktır</strong>. E-posta gönderebilmek için özel bir <strong>Uygulama Şifresi (App Password)</strong> almanız gerekir:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 font-semibold pl-1 text-amber-950">
                <li>E-posta gönderen hesabınızın <strong>Google Hesabını Yönetin</strong> sayfasına gidin.</li>
                <li>Sol menüden <strong>Güvenlik</strong> sekmesini açın ve <strong>İki Adımlı Doğrulama</strong>'yı aktif hale getirin.</li>
                <li>Arama kısmına <strong>"Uygulama Şifreleri"</strong> (veya <em>App Passwords</em>) yazıp bu özel sayfaya gidin.</li>
                <li>Bir uygulama adı belirleyip (Örn: <code>İnanResim</code>) <strong>Oluştur</strong> butonuna tıklayın.</li>
                <li>Ekranda sarı kutu içinde beliren <strong>16 haneli özel şifreyi</strong> kopyalayın.</li>
                <li>Kopyaladığınız bu 16 haneli şifreyi aşağıdaki <strong>SMTP Şifresi</strong> alanına boşluksuz olarak yapıştırıp kaydedin.</li>
              </ol>
              <p className="text-[11px] text-amber-700/90 font-medium">
                * Gmail için SMTP Sunucusu (Host): <code>smtp.gmail.com</code> ve SMTP Portu: <code>587</code> olmalıdır.
              </p>
            </div>
          </div>

          {/* SMTP Settings Card */}
          <form onSubmit={handleSaveSmtp} className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  SMTP E-Posta Sunucusu Yapılandırması
                </h3>
                <p className="text-xs text-slate-400 mt-1">Şifre sıfırlama kodlarının gerçek e-postalara gönderilebilmesi için SMTP sunucusu ayarlarınızı yapılandırın.</p>
              </div>
              <button
                type="button"
                onClick={fetchSmtpConfig}
                title="Yenile"
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">SMTP Sunucusu (Host)</label>
                <input
                  type="text"
                  value={smtpConfig.host}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                  placeholder="Örn: mail.ornek.com veya smtp.gmail.com"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-slate-50/30 focus:bg-white transition-all text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">SMTP Portu</label>
                <input
                  type="number"
                  value={smtpConfig.port || ""}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, port: Number(e.target.value) })}
                  placeholder="Örn: 587 veya 465"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-slate-50/30 focus:bg-white transition-all text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">SMTP Kullanıcı Adı</label>
                <input
                  type="text"
                  value={smtpConfig.user}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                  placeholder="Örn: bilgi@ornek.com veya Gmail adresi"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-slate-50/30 focus:bg-white transition-all text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">SMTP Şifresi</label>
                <input
                  type="password"
                  value={smtpConfig.pass}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                  placeholder="E-posta hesabınızın şifresi"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-slate-50/30 focus:bg-white transition-all text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Gönderici Başlığı (From)</label>
                <input
                  type="text"
                  value={smtpConfig.from}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, from: e.target.value })}
                  placeholder='Örn: "İnanResim Destek" <noreply@ornek.com>'
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-slate-50/30 focus:bg-white transition-all text-slate-800"
                />
              </div>
            </div>

            {smtpSaveError && (
              <p className="text-xs text-red-600 font-bold bg-red-50 px-3 py-2 rounded-xl border border-red-100">{smtpSaveError}</p>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {smtpSaveSuccess ? (
                <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl">
                  <CheckCircle className="w-4 h-4" />
                  SMTP ayarları başarıyla kaydedildi!
                </p>
              ) : (
                <div />
              )}

              <button
                type="submit"
                disabled={smtpIsLoading}
                className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {smtpIsLoading ? "Kaydediliyor..." : "SMTP Ayarlarını Kaydet"}
              </button>
            </div>
          </form>

          {/* SMTP Test Connection Card */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Send className="w-4 h-4 text-slate-400" />
              SMTP Bağlantı ve Gönderim Testi
            </h3>
            <p className="text-xs text-slate-400">Yapılandırmış olduğunuz SMTP sunucusunu gerçek bir e-posta göndererek test edin.</p>

            <form onSubmit={handleTestSmtp} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 max-w-2xl">
              <div className="flex-grow">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Alıcı Test E-Posta Adresi</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Örn: test@ornek.com veya kendi e-postanız"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={testIsLoading}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer h-[42px]"
              >
                {testIsLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {testIsLoading ? "Gönderiliyor..." : "Test E-postası Gönder"}
              </button>
            </form>

            {testResult && (
              <div className={`p-4 rounded-2xl border text-xs font-semibold animate-fade-in ${
                testResult.success 
                  ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" 
                  : "bg-red-50/50 border-red-100 text-red-800"
              }`}>
                {testResult.success ? (
                  <div className="flex items-start gap-2.5">
                    <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-950">Bağlantı Başarılı!</p>
                      <p className="mt-1 font-medium text-emerald-800/90 leading-relaxed">{testResult.message}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-bold text-red-950">Bağlantı Hatası!</p>
                      <p className="mt-1 font-medium text-red-850 leading-relaxed">{testResult.message}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === "ads" && (
        <div className="space-y-6" id="admin-ads-panel">
          {/* Ad Contact & Global Settings Box */}
          <form onSubmit={handleSaveConfig} className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-amber-500" />
                  Sitemiz İçin Reklam & Sponsorluk Yönetimi
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Reklam vermek isteyen yayıncılar için iletişim bilgilerini tanımlayın ve sitedeki banner alanlarını canlı yönetin.
                </p>
              </div>

              {/* Global Ads Toggle */}
              <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Reklam Modu</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={siteConfig.adsEnabled !== false}
                    onChange={(e) => setSiteConfig({ ...siteConfig, adsEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            </div>

            {/* Advertisers Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Reklam İletişim E-Posta Adresi</label>
                <input
                  type="email"
                  value={siteConfig.adsContactEmail || ""}
                  onChange={(e) => setSiteConfig({ ...siteConfig, adsContactEmail: e.target.value })}
                  placeholder="reklam@inanresim.com"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Reklam vermek isteyen kişilerin başvuracağı resmi e-posta adresi.</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Reklam İletişim Telegram / WhatsApp</label>
                <input
                  type="text"
                  value={siteConfig.adsContactTelegram || ""}
                  onChange={(e) => setSiteConfig({ ...siteConfig, adsContactTelegram: e.target.value })}
                  placeholder="@inanresim_reklam"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Telegram kullanıcı adı veya iletişim numarası.</span>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Reklamcılar İçin Bilgilendirme Notu</label>
                <textarea
                  rows={2}
                  value={siteConfig.adsContactInfo || ""}
                  onChange={(e) => setSiteConfig({ ...siteConfig, adsContactInfo: e.target.value })}
                  placeholder="Sitemizde günlük 10,000+ tekil ziyaretçiye ulaşan banner ve sponsorluk fırsatları için bizimle iletişime geçin."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {saveSuccess && (
                <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl">
                  ✓ Reklam Ayarları Kaydedildi
                </span>
              )}
              <button
                type="submit"
                className="ml-auto px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Reklam Ayarlarını Kaydet
              </button>
            </div>
          </form>

          {/* Ad Banners List & Management */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Aktif Banner ve Reklam Alanları ({siteConfig.adsList?.length || 0})
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Header, Görsel Sayfası, Sidebar veya Footer alanlarına özel bannerlar tanımlayın.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddBannerModal(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Yeni Reklam Bannerı Ekle
              </button>
            </div>

            {/* Banners List */}
            {(!siteConfig.adsList || siteConfig.adsList.length === 0) ? (
              <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">Henüz Eklenmiş Özel Reklam Bannerı Yok</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  Sitenin üstüne, detay sayfalarına veya alt kısmına sponsorlu görsel reklam veya HTML kodu ekleyebilirsiniz.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddBannerModal(true)}
                  className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 font-bold text-xs rounded-xl hover:bg-blue-100 transition-all cursor-pointer"
                >
                  + İlk Bannerı Oluştur
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {siteConfig.adsList.map((banner) => (
                  <div key={banner.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 flex flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            banner.position === "header" ? "bg-purple-100 text-purple-700" :
                            banner.position === "image-page" ? "bg-blue-100 text-blue-700" :
                            banner.position === "sidebar" ? "bg-emerald-100 text-emerald-700" :
                            "bg-amber-100 text-amber-700"
                          }`}>
                            {banner.position === "header" ? "Üst Header" :
                             banner.position === "image-page" ? "Görsel Detay Sayfası" :
                             banner.position === "sidebar" ? "Yan Panel" : "Alt Footer"}
                          </span>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${banner.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                            {banner.enabled ? "Aktif" : "Pasif"}
                          </span>
                        </div>
                        <h5 className="font-bold text-slate-800 text-xs mt-2">{banner.title}</h5>
                        {banner.targetUrl && (
                          <a href={banner.targetUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5 truncate max-w-[220px]">
                            <ExternalLink className="w-3 h-3" />
                            {banner.targetUrl}
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = siteConfig.adsList?.map(b => b.id === banner.id ? { ...b, enabled: !b.enabled } : b);
                            setSiteConfig({ ...siteConfig, adsList: updated });
                          }}
                          className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                            banner.enabled ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                          }`}
                          title={banner.enabled ? "Pasife Al" : "Aktif Et"}
                        >
                          {banner.enabled ? "Durdur" : "Yayınla"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("Bu reklam alanını silmek istiyor musunuz?")) {
                              const updated = siteConfig.adsList?.filter(b => b.id !== banner.id);
                              setSiteConfig({ ...siteConfig, adsList: updated });
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-xs font-bold transition-all cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {banner.imageUrl && (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-black/5 max-h-24 flex items-center justify-center">
                        <img src={banner.imageUrl} alt={banner.title} className="max-h-24 w-full object-cover" />
                      </div>
                    )}

                    {banner.htmlCode && (
                      <div className="bg-slate-900 text-slate-300 p-2 rounded-xl text-[10px] font-mono overflow-x-auto max-h-16">
                        <code>{banner.htmlCode}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Banner Modal */}
          {showAddBannerModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scale-up border border-slate-100">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-blue-600" />
                    Yeni Reklam Bannerı Ekle
                  </h4>
                  <button onClick={() => setShowAddBannerModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Banner Başlığı / Sponsor İsmi</label>
                    <input
                      type="text"
                      value={newBannerTitle}
                      onChange={(e) => setNewBannerTitle(e.target.value)}
                      placeholder="Örn: X Markası Ana Sayfa Bannerı"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Gösterim Pozisyonu</label>
                    <select
                      value={newBannerPosition}
                      onChange={(e: any) => setNewBannerPosition(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                    >
                      <option value="header">Üst Header (Sitenin En Üstü)</option>
                      <option value="image-page">Görsel Detay Sayfası (Resim İndirme Sayfası)</option>
                      <option value="sidebar">Yan Panel / Ana Sayfa Arası</option>
                      <option value="footer">Alt Footer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Görsel URL'si (İsteğe Bağlı)</label>
                    <input
                      type="text"
                      value={newBannerImgUrl}
                      onChange={(e) => setNewBannerImgUrl(e.target.value)}
                      placeholder="https://example.com/banner.jpg"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Hedef Tıklama Bağlantısı (URL)</label>
                    <input
                      type="text"
                      value={newBannerTargetUrl}
                      onChange={(e) => setNewBannerTargetUrl(e.target.value)}
                      placeholder="https://sponsor-sitesi.com"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Özel HTML / Google AdSense Kodu (İsteğe Bağlı)</label>
                    <textarea
                      rows={2}
                      value={newBannerHtml}
                      onChange={(e) => setNewBannerHtml(e.target.value)}
                      placeholder="<script>...</script> veya <iframe>...</iframe>"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddBannerModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const banner: AdBanner = {
                        id: "ad_" + Date.now().toString(36),
                        title: newBannerTitle.trim() || "Sponsorlu Reklam",
                        imageUrl: newBannerImgUrl.trim(),
                        targetUrl: newBannerTargetUrl.trim(),
                        position: newBannerPosition,
                        htmlCode: newBannerHtml.trim(),
                        enabled: true
                      };
                      const updated = [...(siteConfig.adsList || []), banner];
                      setSiteConfig({ ...siteConfig, adsList: updated });
                      setNewBannerTitle("");
                      setNewBannerImgUrl("");
                      setNewBannerTargetUrl("");
                      setNewBannerHtml("");
                      setShowAddBannerModal(false);
                    }}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md"
                  >
                    Bannerı Ekle
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
