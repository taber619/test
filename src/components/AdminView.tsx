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
  Globe,
  Crown,
  CreditCard,
  Building2,
  CheckCircle2,
  XCircle,
  Copy,
  Sparkles,
  ShieldCheck,
  KeyRound,
  Bell,
  FileText,
  Tag,
  Bug,
  AlertCircle,
  Terminal,
  Activity,
  Clock,
  HardDrive
} from "lucide-react";
import { SiteConfig, AdBanner, AdRequest, BankAccount, PaymentRequest, PaymentGatewayConfig, AnnouncementItem } from "../types";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  createdAt: number;
  emailVerified?: boolean;
  isBanned?: boolean;
  banReason?: string;
  isVip?: boolean;
  vipExpireAt?: number;
  vipPlan?: "monthly" | "yearly" | null;
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

interface ErrorLogItem {
  id: string;
  timestamp: number;
  type: "upload" | "auth" | "db" | "server" | "email";
  message: string;
  details?: string;
  ip?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  userId?: string;
  statusCode?: number;
}

interface AdminViewProps {
  onBack: () => void;
}

export default function AdminView({ onBack }: AdminViewProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem("inanresim_admin_token") === "true");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  
  // Tab states
  const [activeSubTab, setActiveSubTab] = useState<"settings" | "users" | "images" | "chat" | "smtp" | "ads" | "vip" | "security" | "errors">("settings");
  
  // Error Tracking States
  const [errorLogs, setErrorLogs] = useState<ErrorLogItem[]>([]);
  const [errorLogStats, setErrorLogStats] = useState({
    totalErrors: 0,
    uploadErrors: 0,
    last24hErrors: 0,
    systemStatus: "healthy"
  });
  const [errorLogFilterType, setErrorLogFilterType] = useState<string>("all");
  const [errorLogSearch, setErrorLogSearch] = useState<string>("");
  const [isLoadingErrorLogs, setIsLoadingErrorLogs] = useState<boolean>(false);
  const [selectedErrorDetail, setSelectedErrorDetail] = useState<ErrorLogItem | null>(null);
  const [logClearSuccess, setLogClearSuccess] = useState<string>("");
  
  // Structured Announcements Builder States
  const [structuredAnnouncements, setStructuredAnnouncements] = useState<AnnouncementItem[]>([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annText, setAnnText] = useState("");
  const [annCategory, setAnnCategory] = useState<"info" | "warning" | "campaign" | "maintenance" | "update" | "security">("update");
  const [annPriority, setAnnPriority] = useState<"low" | "normal" | "high">("high");
  const [annActionText, setAnnActionText] = useState("");
  const [annActionUrl, setAnnActionUrl] = useState("");
  const [showAnnModal, setShowAnnModal] = useState(false);
  
  // VIP & Payment states
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [newBankName, setNewBankName] = useState("");
  const [newAccountHolder, setNewAccountHolder] = useState("");
  const [newIban, setNewIban] = useState("");
  const [newBranchCode, setNewBranchCode] = useState("");
  const [newBankDesc, setNewBankDesc] = useState("");
  
  // Ad Management states
  const [newBannerTitle, setNewBannerTitle] = useState("");
  const [newBannerPrice, setNewBannerPrice] = useState("");
  const [newBannerBadgeText, setNewBannerBadgeText] = useState("");
  const [newBannerImgUrl, setNewBannerImgUrl] = useState("");
  const [newBannerTargetUrl, setNewBannerTargetUrl] = useState("");
  const [newBannerPosition, setNewBannerPosition] = useState<"header" | "sidebar" | "footer" | "image-page" | "home-cards" | "home-bottom">("home-cards");
  const [newBannerHtml, setNewBannerHtml] = useState("");
  const [showAddBannerModal, setShowAddBannerModal] = useState(false);
  
  // Ad Requests & Guest Reset states
  const [adRequests, setAdRequests] = useState<AdRequest[]>([]);
  const [resettingGuests, setResettingGuests] = useState(false);
  const [guestResetSuccessMsg, setGuestResetSuccessMsg] = useState("");
  
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
        setStructuredAnnouncements(data.structuredAnnouncements || []);
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

  const fetchAdRequests = async () => {
    try {
      const res = await fetch("/api/admin/ad-requests");
      const data = await res.json();
      if (res.ok && data.requests) {
        setAdRequests(data.requests);
      }
    } catch (e) {
      console.error("Fetch ad requests error", e);
    }
  };

  const handleUpdateAdRequestStatus = async (id: string, status: "new" | "read" | "contacted") => {
    try {
      await fetch(`/api/admin/ad-requests/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setAdRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (err) {
      console.error("Update ad request status error:", err);
    }
  };

  const handleDeleteAdRequest = async (id: string) => {
    if (!confirm("Bu reklam başvurusunu silmek istediğinize emin misiniz?")) return;
    try {
      await fetch(`/api/admin/ad-requests/${id}`, { method: "DELETE" });
      setAdRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error("Delete ad request error:", err);
    }
  };

  const handleResetGuestLimits = async () => {
    if (!confirm("Tüm misafir kullanıcıların yükleme sayılarını şimdi sıfırlamak istediğinize emin misiniz?")) return;
    setResettingGuests(true);
    setGuestResetSuccessMsg("");
    try {
      const res = await fetch("/api/admin/reset-guest-limits", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setGuestResetSuccessMsg("✓ Tüm misafir yükleme limitleri sıfırlandı!");
        setSiteConfig(prev => ({ ...prev, lastGuestResetTime: data.lastGuestResetTime }));
        setTimeout(() => setGuestResetSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error("Reset guest limits error:", err);
    } finally {
      setResettingGuests(false);
    }
  };

  const fetchPaymentRequests = async () => {
    try {
      const res = await fetch("/api/admin/payment-requests");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setPaymentRequests(data);
      }
    } catch (e) {
      console.error("Fetch payment requests error:", e);
    }
  };

  const handleApprovePayment = async (requestId: string) => {
    if (!confirm("Bu ödeme bildirimini onaylamak ve kullanıcıyı PRO VIP üye yapmak istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/admin/payment-requests/${requestId}/approve`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchPaymentRequests();
        fetchUsers();
        window.dispatchEvent(new Event("user_session_updated"));
        alert("✓ Ödeme onaylandı ve kullanıcı PRO VIP yapıldı!");
      } else {
        alert(data.error || "Onaylama başarısız.");
      }
    } catch (err) {
      alert("Hata oluştu.");
    }
  };

  const handleRejectPayment = async (requestId: string) => {
    const reason = prompt("Lütfen red nedenini belirtin:", "Ödeme dekontu/bilgileri doğrulanamadı.");
    if (reason === null) return;
    try {
      const res = await fetch(`/api/admin/payment-requests/${requestId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: reason })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchPaymentRequests();
        alert("Reddedildi.");
      } else {
        alert(data.error || "Reddetme başarısız.");
      }
    } catch (err) {
      alert("Hata oluştu.");
    }
  };

  const handleToggleVipUser = async (userId: string, currentIsVip: boolean) => {
    const nextState = !currentIsVip;
    const plan = nextState ? (prompt("VIP üyelik süresi seçin (monthly / yearly):", "monthly") || "monthly") : "monthly";
    const selectedPlan = plan === "yearly" ? "yearly" : "monthly";

    // Optimistic UI update in admin users list instantly!
    setUsersList(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          isVip: nextState,
          vipPlan: nextState ? selectedPlan : undefined,
          vipExpireAt: nextState ? Date.now() + ((selectedPlan === "yearly" ? 365 : 30) * 86400000) : undefined
        };
      }
      return u;
    }));

    try {
      const res = await fetch(`/api/admin/users/${userId}/vip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVip: nextState, plan: selectedPlan })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchUsers();

        // Check if currently logged in session is modified
        const stored = localStorage.getItem("hizli_resim_user");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.id === userId) {
              const updated = {
                ...parsed,
                isVip: nextState,
                vipPlan: nextState ? selectedPlan : undefined
              };
              localStorage.setItem("hizli_resim_user", JSON.stringify(updated));
            }
          } catch (e) {}
        }
        window.dispatchEvent(new Event("user_session_updated"));
      } else {
        alert(data.error || "İşlem başarısız.");
        fetchUsers();
      }
    } catch (err) {
      alert("Hata oluştu.");
      fetchUsers();
    }
  };

  const handleAddBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim() || !newIban.trim() || !newAccountHolder.trim()) {
      alert("Lütfen Banka Adı, Hesap Sahibi ve IBAN alanlarını doldurun.");
      return;
    }

    const newAcc: BankAccount = {
      id: "bank_" + Date.now(),
      bankName: newBankName.trim(),
      accountHolder: newAccountHolder.trim(),
      iban: newIban.trim().toUpperCase(),
      branchCode: newBranchCode.trim(),
      description: newBankDesc.trim(),
      isActive: true
    };

    const currentBanks = siteConfig.bankAccounts || [];
    const updatedBanks = [...currentBanks, newAcc];
    const updatedConfig = { ...siteConfig, bankAccounts: updatedBanks };
    setSiteConfig(updatedConfig);

    setNewBankName("");
    setNewAccountHolder("");
    setNewIban("");
    setNewBranchCode("");
    setNewBankDesc("");

    try {
      await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig)
      });
      alert("✓ Yeni banka hesabı başarıyla eklendi ve kaydedildi!");
    } catch (e) {
      console.error("Bank account save error:", e);
    }
  };

  const handleDeleteBankAccount = async (bankId: string) => {
    if (!confirm("Bu banka hesabını (IBAN) silmek istediğinize emin misiniz?")) return;
    const updatedBanks = (siteConfig.bankAccounts || []).filter(b => b.id !== bankId);
    const updatedConfig = { ...siteConfig, bankAccounts: updatedBanks };
    setSiteConfig(updatedConfig);

    try {
      await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig)
      });
      alert("✓ Banka hesabı (IBAN) başarıyla silindi ve kaydedildi!");
    } catch (e) {
      console.error("Bank account delete error:", e);
    }
  };

  const fetchErrorLogs = async (type = errorLogFilterType, search = errorLogSearch) => {
    setIsLoadingErrorLogs(true);
    try {
      const queryParams = new URLSearchParams();
      if (type && type !== "all") queryParams.append("type", type);
      if (search && search.trim()) queryParams.append("search", search.trim());

      const res = await fetch(`/api/admin/error-logs?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setErrorLogs(data.logs || []);
          if (data.stats) {
            setErrorLogStats(data.stats);
          }
        }
      }
    } catch (err) {
      console.error("Fetch error logs error:", err);
    } finally {
      setIsLoadingErrorLogs(false);
    }
  };

  const handleClearErrorLogs = async () => {
    if (!window.confirm("Tüm sunucu ve dosya yükleme hata loglarını silmek istediğinizden emin misiniz?")) {
      return;
    }
    try {
      const res = await fetch("/api/admin/error-logs/clear", { method: "POST" });
      if (res.ok) {
        setLogClearSuccess("Tüm hata logları temizlendi.");
        setTimeout(() => setLogClearSuccess(""), 3000);
        fetchErrorLogs();
      }
    } catch (e) {
      console.error("Clear error logs failed:", e);
    }
  };

  const handleCreateTestErrorLog = async () => {
    try {
      const res = await fetch("/api/admin/error-logs/test", { method: "POST" });
      if (res.ok) {
        setLogClearSuccess("Örnek test yükleme hatası oluşturuldu.");
        setTimeout(() => setLogClearSuccess(""), 3000);
        fetchErrorLogs();
      }
    } catch (e) {
      console.error("Test error log creation failed:", e);
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
        fetchSmtpConfig(),
        fetchAdRequests(),
        fetchPaymentRequests(),
        fetchErrorLogs()
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
        body: JSON.stringify({ ...siteConfig, announcements, structuredAnnouncements }),
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

        <button
          id="admin-vip-tab"
          onClick={() => {
            setActiveSubTab("vip");
            fetchPaymentRequests();
          }}
          className={`px-5 py-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === "vip"
              ? "border-amber-500 text-amber-500 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <Crown className="w-4 h-4 text-amber-400" />
          👑 PRO VIP & Ödemeler {siteConfig.vipEnabled === false ? "(KAPALI)" : `(${paymentRequests.filter(p => p.status === "pending").length} Yeni)`}
        </button>

        <button
          id="admin-security-tab"
          onClick={() => setActiveSubTab("security")}
          className={`px-5 py-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === "security"
              ? "border-emerald-500 text-emerald-500 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          🛡️ Güvenlik & Gizlilik
        </button>

        <button
          id="admin-errors-tab"
          onClick={() => {
            setActiveSubTab("errors");
            fetchErrorLogs();
          }}
          className={`px-5 py-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === "errors"
              ? "border-red-500 text-red-500 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <Bug className="w-4 h-4 text-red-500" />
          🚨 Hata Takip Paneli {errorLogStats.last24hErrors > 0 && <span className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-600 rounded-full font-extrabold">{errorLogStats.last24hErrors}</span>}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">🌐 Site Marka / Logo İsmi</label>
              <input
                type="text"
                value={siteConfig.siteName ?? "resimresim.com"}
                onChange={(e) => setSiteConfig({ ...siteConfig, siteName: e.target.value })}
                placeholder="Örn: resimresim.com veya HızlıResim"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Sitenin logo, menü ve başlıklarında görünecek site marka adı.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">🔗 Site Alan Adı / Domain</label>
              <input
                type="text"
                value={siteConfig.siteDomain ?? "resimresim.com"}
                onChange={(e) => setSiteConfig({ ...siteConfig, siteDomain: e.target.value })}
                placeholder="Örn: resimresim.com"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">E-posta ve bağlantılarda kullanılan ana domain adresi.</span>
            </div>
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
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-blue-600" />
                  Yönetici Duyuru Panosu & Hazır Taslaklar
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Sitenin en üstünde gösterilecek duyuruları ekleyin, kategorilendirin ve zengin hazır taslaklardan faydalanın.</p>
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

            {/* List of active structured announcements */}
            {structuredAnnouncements.length > 0 ? (
              <div className="space-y-2.5 mb-5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Yayındaki Gelişmiş Duyurular ({structuredAnnouncements.length})</span>
                {structuredAnnouncements.map((ann) => (
                  <div key={ann.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-2xl">
                    <div className="flex items-start gap-3">
                      <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wide flex items-center gap-1 shrink-0 ${
                        ann.category === 'update' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        ann.category === 'maintenance' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                        ann.category === 'campaign' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        ann.category === 'security' ? 'bg-violet-100 text-violet-700 border border-violet-200' :
                        ann.category === 'warning' ? 'bg-red-100 text-red-700 border border-red-200' :
                        'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {ann.category === 'update' && '🚀 Güncelleme'}
                        {ann.category === 'maintenance' && '🛠️ Bakım'}
                        {ann.category === 'campaign' && '🎁 Kampanya'}
                        {ann.category === 'security' && '🔒 Güvenlik'}
                        {ann.category === 'warning' && '⚠️ Uyarı'}
                        {ann.category === 'info' && 'ℹ️ Bilgi'}
                      </span>
                      <div>
                        {ann.title && <h5 className="text-xs font-black text-slate-800 dark:text-slate-100">{ann.title}</h5>}
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{ann.text}</p>
                        {ann.actionText && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 mt-1">
                            {ann.actionText} → {ann.actionUrl || "#"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const next = structuredAnnouncements.map(item => 
                            item.id === ann.id ? { ...item, enabled: !item.enabled } : item
                          );
                          setStructuredAnnouncements(next);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                          ann.enabled !== false
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-200 text-slate-600 border-slate-300'
                        }`}
                      >
                        {ann.enabled !== false ? 'Aktif' : 'Pasif'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = structuredAnnouncements.filter(item => item.id !== ann.id);
                          setStructuredAnnouncements(next);
                          const textList = next.map(a => a.text);
                          setAnnouncements(textList);
                          setSiteConfig(prev => ({ ...prev, announcementText: textList[0] || "" }));
                        }}
                        className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic mb-4">Şu an yapılandırılmış aktif duyuru bulunmuyor.</p>
            )}

            {/* Ready-made Announcement Templates Builder */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/80 rounded-2xl p-4 mb-4">
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Hazır Duyuru Taslak Kütüphanesi (1-Tıkla Yayınla)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {[
                  {
                    title: "🚀 İnanResim v3.0 Yayında!",
                    text: "Yeni sürümümüz ile PRO VIP Üyelik, Gelişmiş Şifreli Görsel Paylaşımı ve Yüksek Hızlı Sunucular hizmetinizde.",
                    category: "update" as const,
                    priority: "high" as const,
                    actionText: "VIP Özellikleri Gör",
                    actionUrl: "#vip"
                  },
                  {
                    title: "🛠️ Planlı Sistem Bakımı",
                    text: "Sistemlerimizde yapılacak veritabanı optimizasyon çalışması nedeniyle bu gece 02:00-04:00 saatleri arasında kısa süreli kesintiler yaşanabilir.",
                    category: "maintenance" as const,
                    priority: "high" as const,
                    actionText: "Sistem Durumu"
                  },
                  {
                    title: "🎁 PRO VIP Yıllık İndirim Kampanyası!",
                    text: "Sınırsız resim yükleme, doğrudan resim linkleri ve reklamsız deneyim sunan PRO VIP üyelikte %20 dev fırsat başladı!",
                    category: "campaign" as const,
                    priority: "high" as const,
                    actionText: "Hemen VIP Ol",
                    actionUrl: "#vip"
                  },
                  {
                    title: "🔒 Uçtan Uca Şifreleme & KVKK Uyumlu",
                    text: "Yüklediğiniz tüm hassas görseller 256-bit AES standartlarına uygun şifrelenmektedir. Gizliliğiniz %100 koruma altındadır.",
                    category: "security" as const,
                    priority: "normal" as const,
                    actionText: "Gizlilik Politikası"
                  },
                  {
                    title: "💬 7/24 Admin Canlı Destek",
                    text: "Sorularınız veya geri bildirimleriniz için canlı chat panelinden yöneticilerimize anında mesaj gönderebilirsiniz.",
                    category: "info" as const,
                    priority: "low" as const,
                    actionText: "Canlı Destek"
                  },
                  {
                    title: "⚠️ Topluluk & Telif Kuralları Hatırlatması",
                    text: "Telif hakkı ihlali içeren veya yasa dışı görseller sistemimiz tarafından tespit edildiğinde derhal silinmektedir.",
                    category: "warning" as const,
                    priority: "normal" as const,
                    actionText: "Kuralları İncele"
                  }
                ].map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={!siteConfig.announcementEnabled}
                    onClick={() => {
                      const newAnn: AnnouncementItem = {
                        id: `ann_${Date.now()}_${i}`,
                        title: tpl.title,
                        text: tpl.text,
                        category: tpl.category,
                        priority: tpl.priority,
                        actionText: tpl.actionText,
                        actionUrl: tpl.actionUrl,
                        createdAt: Date.now(),
                        enabled: true
                      };
                      const next = [newAnn, ...structuredAnnouncements];
                      setStructuredAnnouncements(next);
                      const textList = next.map(a => a.text);
                      setAnnouncements(textList);
                      setSiteConfig(prev => ({ ...prev, announcementText: textList[0] || "" }));
                    }}
                    className="text-left p-3 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 disabled:opacity-50 rounded-xl transition-all cursor-pointer shadow-sm group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors">{tpl.title}</span>
                      <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{tpl.text}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Structured Announcement Form */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
              <h5 className="text-xs font-black text-slate-800 mb-3 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-600" />
                Özel Duyuru Oluştur
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Duyuru Başlığı</label>
                  <input
                    type="text"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="Örn: Yıllık VIP Kampanyası"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Kategori</label>
                  <select
                    value={annCategory}
                    onChange={(e) => setAnnCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="update">🚀 Sürüm Güncellemesi</option>
                    <option value="maintenance">🛠️ Sistem Bakımı</option>
                    <option value="campaign">🎁 Kampanya / VIP Fırsatı</option>
                    <option value="security">🔒 Güvenlik & Gizlilik</option>
                    <option value="warning">⚠️ Topluluk Uyarısı</option>
                    <option value="info">ℹ️ Genel Bilgilendirme</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Öncelik Seviyesi</label>
                  <select
                    value={annPriority}
                    onChange={(e) => setAnnPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="high">🔥 Yüksek (En Üstte)</option>
                    <option value="normal">⚡ Normal</option>
                    <option value="low">💡 Düşük</option>
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Duyuru İçerik Mesajı (Yayınlanacak Detay Metni)</label>
                <textarea
                  rows={2}
                  value={annText}
                  onChange={(e) => setAnnText(e.target.value)}
                  placeholder="Duyuru detay metnini giriniz..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Buton Metni (Opsiyonel)</label>
                  <input
                    type="text"
                    value={annActionText}
                    onChange={(e) => setAnnActionText(e.target.value)}
                    placeholder="Örn: VIP Üyeliğe Geç"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Yönlendirme Bağlantısı (Opsiyonel)</label>
                  <input
                    type="text"
                    value={annActionUrl}
                    onChange={(e) => setAnnActionUrl(e.target.value)}
                    placeholder="Örn: #vip veya https://..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={!siteConfig.announcementEnabled || !annText.trim()}
                onClick={() => {
                  const newAnn: AnnouncementItem = {
                    id: `ann_${Date.now()}`,
                    title: annTitle.trim() || undefined,
                    text: annText.trim(),
                    category: annCategory,
                    priority: annPriority,
                    actionText: annActionText.trim() || undefined,
                    actionUrl: annActionUrl.trim() || undefined,
                    createdAt: Date.now(),
                    enabled: true
                  };
                  const next = [newAnn, ...structuredAnnouncements];
                  setStructuredAnnouncements(next);
                  const textList = next.map(a => a.text);
                  setAnnouncements(textList);
                  setAnnTitle("");
                  setAnnText("");
                  setAnnActionText("");
                  setAnnActionUrl("");
                  setSiteConfig(prev => ({ ...prev, announcementText: textList[0] || "" }));
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md"
              >
                <Plus className="w-4 h-4" />
                Duyuruyu Yayınla
              </button>
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
                      min="0"
                      value={siteConfig.guestMaxMb === 0 ? "" : (siteConfig.guestMaxMb ?? 20)}
                      onChange={(e) => setSiteConfig({ ...siteConfig, guestMaxMb: e.target.value === "" ? 0 : Number(e.target.value) })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Örn: 20 (Üye olmadan en fazla 20 MB yükleyebilir)</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Maksimum Yükleme Adedi</label>
                    <input
                      type="number"
                      min="0"
                      value={siteConfig.guestMaxUploadCount === 0 ? "" : (siteConfig.guestMaxUploadCount ?? 5)}
                      onChange={(e) => setSiteConfig({ ...siteConfig, guestMaxUploadCount: e.target.value === "" ? 0 : Number(e.target.value) })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Örn: 5 (Misafir kullanıcı toplamda en fazla 5 resim/video yükleyebilir)</span>
                  </div>

                  {/* Guest Reset Controls */}
                  <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-3">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase flex items-center justify-between">
                      <span>⏱️ Otomatik Limit Sıfırlama</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {siteConfig.lastGuestResetTime
                          ? `Son: ${new Date(siteConfig.lastGuestResetTime).toLocaleString("tr-TR")}`
                          : "Henüz Sıfırlanmadı"}
                      </span>
                    </label>

                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">Sıfırlama Modu</span>
                        <select
                          value={siteConfig.guestAutoResetMode || "off"}
                          onChange={(e) => setSiteConfig({ ...siteConfig, guestAutoResetMode: e.target.value as any })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                        >
                          <option value="off">Kapalı (Sadece Manuel Sıfırlama)</option>
                          <option value="daily">Her Gün Belirli Saatte Otomatik Yenile</option>
                          <option value="interval">Belirli Saat Aralığıyla Yenile</option>
                        </select>
                      </div>

                      {siteConfig.guestAutoResetMode === "daily" && (
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block mb-1">Yenilenme Saati (Günde 1 Defa)</span>
                          <select
                            value={siteConfig.guestAutoResetHour ?? 0}
                            onChange={(e) => setSiteConfig({ ...siteConfig, guestAutoResetHour: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                          >
                            {Array.from({ length: 24 }).map((_, h) => (
                              <option key={h} value={h}>
                                Her Gün {h < 10 ? `0${h}` : h}:00 Saatinde Limitleri Sıfırla
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {siteConfig.guestAutoResetMode === "interval" && (
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block mb-1">Yenilenme Sıklığı</span>
                          <select
                            value={siteConfig.guestResetIntervalHours ?? 24}
                            onChange={(e) => setSiteConfig({ ...siteConfig, guestResetIntervalHours: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                          >
                            <option value={1}>Her 1 Saatte Bir</option>
                            <option value={6}>Her 6 Saatte Bir</option>
                            <option value={12}>Her 12 Saatte Bir</option>
                            <option value={24}>Her 24 Saatte Bir (Günde 1)</option>
                            <option value={48}>Her 48 Saatte Bir (2 Günde 1)</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Instant Manual Reset Button */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleResetGuestLimits}
                        disabled={resettingGuests}
                        className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${resettingGuests ? "animate-spin" : ""}`} />
                        {resettingGuests ? "Sıfırlanıyor..." : "Tüm Misafir Sayaçlarını Şimdi Sıfırla"}
                      </button>
                    </div>
                    {guestResetSuccessMsg && (
                      <p className="text-[11px] text-emerald-600 font-bold text-center bg-emerald-50 py-1.5 rounded-lg border border-emerald-100">
                        {guestResetSuccessMsg}
                      </p>
                    )}
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
                      value={siteConfig.registeredMaxMb === 0 ? "" : (siteConfig.registeredMaxMb ?? 1000)}
                      onChange={(e) => setSiteConfig({ ...siteConfig, registeredMaxMb: e.target.value === "" ? 0 : Number(e.target.value) })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Örn: 1000 (Üyeler için dosya boyutu sınırı. 1000 MB = 1 GB. 0 = Sınırsız)</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Maksimum Yükleme Adedi (0 = Sınırsız)</label>
                    <input
                      type="number"
                      min="0"
                      value={siteConfig.registeredMaxUploadCount === 0 ? "" : (siteConfig.registeredMaxUploadCount ?? 15)}
                      onChange={(e) => setSiteConfig({ ...siteConfig, registeredMaxUploadCount: e.target.value === "" ? 0 : Number(e.target.value) })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Örn: 15 (Standart kayıtlı üyeler için maksimum yükleme adedi)</span>
                  </div>
                </div>
              </div>

              {/* PRO VIP Limits Card */}
              <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-2xl">
                <h5 className="text-xs font-extrabold text-amber-900 mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  👑 PRO VIP Üye Limitleri
                </h5>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">VIP Maksimum Dosya Boyutu (MB)</label>
                    <input
                      type="number"
                      min="0"
                      value={siteConfig.vipMaxMb === 0 ? "" : (siteConfig.vipMaxMb ?? 5000)}
                      onChange={(e) => setSiteConfig({ ...siteConfig, vipMaxMb: e.target.value === "" ? 0 : Number(e.target.value) })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Örn: 5000 (VIP üyeler için dosya/video boyutu sınırı. 5000 MB = 5 GB)</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">VIP Maksimum Yükleme Adedi (0 = Sınırsız)</label>
                    <input
                      type="number"
                      min="0"
                      value={siteConfig.vipMaxUploadCount === 0 ? "" : (siteConfig.vipMaxUploadCount ?? 50)}
                      onChange={(e) => setSiteConfig({ ...siteConfig, vipMaxUploadCount: e.target.value === "" ? 0 : Number(e.target.value) })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Örn: 50 (PRO VIP üyeler için maksimum yükleme adedi)</span>
                  </div>
                  <div className="p-2.5 bg-amber-100/60 border border-amber-200 rounded-xl">
                    <p className="text-[11px] font-extrabold text-amber-900 flex items-center gap-1">
                      <span>👑 Kalıcı Depolama:</span>
                      <span className="text-amber-700">VIP Üyelere Özel Süresiz Saklama Aktif</span>
                    </p>
                    <p className="text-[10px] text-amber-800/80 mt-0.5">Standart üyelerin içerikleri süresiz saklanamaz, VIP üyeler süresiz (kalıcı) seçeneğini kullanabilir.</p>
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
                    <th className="py-3 px-4">Üyelik Tipi</th>
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
                          {u.isVip && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                              <Crown className="w-3 h-3 text-amber-400" />
                              PRO VIP
                            </span>
                          )}
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
                        {u.isVip ? (
                          <div className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
                            <Crown className="w-3.5 h-3.5" />
                            <span>PRO VIP ({u.vipPlan === "yearly" ? "Yıllık" : "Aylık"})</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Standart Üye</span>
                        )}
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
                            onClick={() => handleToggleVipUser(u.id, !!u.isVip)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                              u.isVip
                                ? "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md"
                                : "bg-slate-800 text-amber-400 border border-amber-500/30 hover:bg-slate-700"
                            }`}
                            title={u.isVip ? "VIP Statüsünü Kaldır" : "Kullanıcıyı VIP Yap"}
                          >
                            <Crown className="w-3.5 h-3.5" />
                            {u.isVip ? "VIP İptal Et" : "VIP Yap"}
                          </button>

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

          {/* Gelen Reklam Başvuruları Listesi */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  Gelen Reklam & Sponsorluk Talepleri ({adRequests.length})
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sitedeki "Reklam Verin / İletişime Geçin" formundan iletilen reklam başvuruları burada listelenir.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchAdRequests}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Yenile
              </button>
            </div>

            {adRequests.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">Henüz Bekleyen Reklam Başvurusu Yok</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Kullanıcılar "Reklam Verme" formundan bilgi ilettiklerinde burada anlık olarak görüntülenecektir.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {adRequests.map((reqItem) => (
                  <div
                    key={reqItem.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      reqItem.status === "new"
                        ? "bg-amber-50/60 border-amber-200 shadow-xs"
                        : reqItem.status === "contacted"
                        ? "bg-emerald-50/40 border-emerald-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">{reqItem.senderName}</span>
                        <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          {reqItem.senderEmail}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          reqItem.status === "new"
                            ? "bg-amber-500 text-white animate-pulse"
                            : reqItem.status === "contacted"
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}>
                          {reqItem.status === "new" ? "Yeni Başvuru" : reqItem.status === "contacted" ? "İletişim Kuruldu" : "Incelendi"}
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-400 font-medium">
                        {new Date(reqItem.createdAt).toLocaleString("tr-TR")}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-100 leading-relaxed font-sans whitespace-pre-wrap">
                      {reqItem.senderMessage}
                    </p>

                    <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-100">
                      <a
                        href={`mailto:${reqItem.senderEmail}?subject=İnanResim Reklam Başvurusu Hakkında`}
                        onClick={() => handleUpdateAdRequestStatus(reqItem.id, "contacted")}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        E-Posta Yanıtla
                      </a>

                      {reqItem.status === "new" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateAdRequestStatus(reqItem.id, "read")}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                        >
                          Okundu İşaretle
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteAdRequest(reqItem.id)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-200 transition-all cursor-pointer"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ad Banners List & Management */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Aktif Banner ve Reklam Vitrini ({siteConfig.adsList?.length || 0})
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ana Sayfa Ürün Kartları (CS:GO skin vb.), Ana Sayfa Altı, Header, Footer veya Detay Sayfalarına özel reklamlar ekleyin.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddBannerModal(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Yeni Reklam / Ürün Ekle
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
                  + İlk Reklamı Oluştur
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {siteConfig.adsList.map((banner) => (
                  <div key={banner.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 flex flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            banner.position === "home-cards" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                            banner.position === "home-bottom" ? "bg-indigo-100 text-indigo-700 border border-indigo-200" :
                            banner.position === "header" ? "bg-purple-100 text-purple-700" :
                            banner.position === "image-page" ? "bg-blue-100 text-blue-700" :
                            banner.position === "sidebar" ? "bg-emerald-100 text-emerald-700" :
                            "bg-slate-200 text-slate-700"
                          }`}>
                            {banner.position === "home-cards" ? "🛒 Ana Sayfa Ürün Kartı" :
                             banner.position === "home-bottom" ? "📢 Ana Sayfa Alt Banner" :
                             banner.position === "header" ? "Üst Header" :
                             banner.position === "image-page" ? "Görsel Detay" :
                             banner.position === "sidebar" ? "Yan Panel" : "Alt Footer"}
                          </span>

                          {banner.badgeText && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-900 text-white uppercase font-mono">
                              {banner.badgeText}
                            </span>
                          )}

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${banner.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                            {banner.enabled ? "Aktif" : "Pasif"}
                          </span>
                        </div>
                        
                        <div className="flex items-baseline gap-2 mt-2">
                          <h5 className="font-bold text-slate-800 text-xs">{banner.title}</h5>
                          {banner.price && (
                            <span className="text-xs font-black text-slate-900 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                              {banner.price}
                            </span>
                          )}
                        </div>

                        {banner.targetUrl && (
                          <a href={banner.targetUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 mt-1 truncate max-w-[220px]">
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
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white max-h-28 p-2 flex items-center justify-center">
                        <img src={banner.imageUrl} alt={banner.title} className="max-h-24 max-w-full object-contain" />
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
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scale-up border border-slate-100 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-blue-600" />
                    Yeni Reklam / Sponsor Ürünü Ekle
                  </h4>
                  <button onClick={() => setShowAddBannerModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Preset Quick Fill Templates */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    ⚡ Hızlı Örnek Şablon Seç (CS:GO / Skin Pazarı)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setNewBannerTitle("AWP | Atheris (Field-Tested)");
                        setNewBannerPrice("₺48,80");
                        setNewBannerBadgeText("PRICE DROP");
                        setNewBannerPosition("home-cards");
                        setNewBannerImgUrl("https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&q=80");
                        setNewBannerTargetUrl("https://cs.money");
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer shadow-2xs"
                    >
                      🎯 AWP Atheris (₺48,80)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewBannerTitle("Hydra Gloves | Emerald (FT)");
                        setNewBannerPrice("₺1.450,00");
                        setNewBannerBadgeText("PRICE DROP");
                        setNewBannerPosition("home-cards");
                        setNewBannerImgUrl("https://images.unsplash.com/photo-1563089145-599997674d42?w=500&q=80");
                        setNewBannerTargetUrl("https://cs.money");
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer shadow-2xs"
                    >
                      🧤 Eldiven (₺1.450)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewBannerTitle("CS.MONEY Skin Takas & Pazaryeri");
                        setNewBannerPrice("%20 İndirimli Fiyatlar");
                        setNewBannerBadgeText("SPONSORLU BÖLÜM");
                        setNewBannerPosition("home-bottom");
                        setNewBannerImgUrl("https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&q=80");
                        setNewBannerTargetUrl("https://cs.money");
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-indigo-700 cursor-pointer shadow-2xs"
                    >
                      📢 Alt Banner Şablonu
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Gösterim Alanı (Pozisyon)</label>
                    <select
                      value={newBannerPosition}
                      onChange={(e: any) => setNewBannerPosition(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white font-bold text-slate-800"
                    >
                      <option value="home-cards">🛒 Ana Sayfa Ürün/Skin Kartları Grid (Referans Görseller)</option>
                      <option value="home-bottom">📢 Ana Sayfa Alt Banner (Alt Tarafta)</option>
                      <option value="header">⬆️ Üst Header Banner (Sitenin En Üstü)</option>
                      <option value="footer">⬇️ Alt Footer Banner (Tüm Sayfaların En Altı)</option>
                      <option value="image-page">🖼️ Görsel Detay Sayfası (Resim İndirme)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Başlık / Ürün Adı</label>
                    <input
                      type="text"
                      value={newBannerTitle}
                      onChange={(e) => setNewBannerTitle(e.target.value)}
                      placeholder="Örn: AWP | Atheris (Field-Tested)"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Fiyat / Alt Metin</label>
                      <input
                        type="text"
                        value={newBannerPrice}
                        onChange={(e) => setNewBannerPrice(e.target.value)}
                        placeholder="Örn: ₺48,80 veya %20 İndirim"
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Rozet Etiketi (Badge)</label>
                      <input
                        type="text"
                        value={newBannerBadgeText}
                        onChange={(e) => setNewBannerBadgeText(e.target.value)}
                        placeholder="Örn: PRICE DROP, HOT, İNDİRİM"
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono uppercase font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Görsel URL veya Dosya Seç</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newBannerImgUrl}
                        onChange={(e) => setNewBannerImgUrl(e.target.value)}
                        placeholder="https://example.com/item.png"
                        className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-xs"
                      />
                      <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-all shrink-0">
                        <span>Yükle</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                if (evt.target?.result) {
                                  setNewBannerImgUrl(evt.target.result as string);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
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

                  {/* Live Card Preview */}
                  {(newBannerTitle || newBannerImgUrl || newBannerPrice) && (
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        👁️ Canlı Önizleme (Kart Tipi)
                      </span>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl max-w-xs mx-auto">
                        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold border border-slate-800 rounded uppercase">
                              {newBannerBadgeText || "PRICE DROP"}
                            </span>
                          </div>
                          {newBannerImgUrl && (
                            <img src={newBannerImgUrl} alt="Preview" className="h-20 w-full object-contain mx-auto my-1" />
                          )}
                          <p className="text-xs font-bold text-slate-800 truncate">{newBannerTitle || "Ürün Başlığı"}</p>
                          <p className="text-sm font-black text-slate-900 mt-0.5">{newBannerPrice || "₺48,80"}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddBannerModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const banner: AdBanner = {
                        id: "ad_" + Date.now().toString(36),
                        title: newBannerTitle.trim() || "Sponsorlu Reklam",
                        price: newBannerPrice.trim(),
                        badgeText: newBannerBadgeText.trim(),
                        imageUrl: newBannerImgUrl.trim(),
                        targetUrl: newBannerTargetUrl.trim(),
                        position: newBannerPosition,
                        htmlCode: newBannerHtml.trim(),
                        enabled: true
                      };
                      const updated = [...(siteConfig.adsList || []), banner];
                      setSiteConfig({ ...siteConfig, adsList: updated });
                      setNewBannerTitle("");
                      setNewBannerPrice("");
                      setNewBannerBadgeText("");
                      setNewBannerImgUrl("");
                      setNewBannerTargetUrl("");
                      setNewBannerHtml("");
                      setShowAddBannerModal(false);
                    }}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                  >
                    Reklamı Yayınla
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIP Subtab Panel */}
      {activeSubTab === "vip" && (
        <div className="space-y-8" id="admin-vip-panel">
          
          {/* PRO VIP System Enable/Disable Toggle Banner */}
          <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
            siteConfig.vipEnabled !== false
              ? "bg-slate-900 border-amber-500/40 text-white"
              : "bg-slate-950 border-rose-500/30 text-slate-300"
          }`}>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <Crown className={`w-7 h-7 ${siteConfig.vipEnabled !== false ? "text-amber-400 animate-pulse" : "text-slate-600"}`} />
                <h3 className="text-lg font-black tracking-tight text-white">
                  PRO VIP Üyelik Sistemi
                </h3>
                <span className={`px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  siteConfig.vipEnabled !== false
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                }`}>
                  {siteConfig.vipEnabled !== false ? "● AKTİF (SİSTEM AÇIK)" : "○ DEVRE DIŞI (KAPALI)"}
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                {siteConfig.vipEnabled !== false
                  ? "PRO VIP üyeliği aktif. Ziyaretçiler VIP paketlerini ve satın alma seçeneklerini görebilir."
                  : "PRO VIP üyeliği kapalı. Sitedeki VIP rozetleri, yükseltme butonları ve ödeme ekranları ziyaretçilere gizlenir."}
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
              <div className="text-right">
                <span className="block text-xs font-black text-white">VIP Sistem Durumu</span>
                <span className="text-[10px] text-slate-400 font-bold">{siteConfig.vipEnabled !== false ? "Kapatmak için tıklayın" : "Açmak için tıklayın"}</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={siteConfig.vipEnabled !== false}
                  onChange={async (e) => {
                    const isChecked = e.target.checked;
                    const updated = { ...siteConfig, vipEnabled: isChecked };
                    setSiteConfig(updated);
                    try {
                      await fetch("/api/admin/config", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(updated)
                      });
                    } catch (err) {
                      console.error("Failed to auto-save VIP toggle:", err);
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>

          {/* 1. VIP PRICING & AUTO-CALCULATOR PANEL */}
          <form onSubmit={handleSaveConfig} className="bg-slate-900 border border-amber-500/30 shadow-xl rounded-3xl p-6 sm:p-8 space-y-6 text-slate-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-amber-400 uppercase tracking-wide flex items-center gap-2">
                  <Crown className="w-6 h-6 text-amber-400" />
                  PRO VIP Üyelik Paketleri & Otomatik Fiyat Hesaplama
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Aylık paket ücretini değiştirdiğinizde, yıllık paket fiyatı belirlediğiniz indirim oranına göre otomatik olarak hesaplanır.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saveSuccess ? "✓ Kaydedildi!" : "VIP Ayarlarını Kaydet"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-extrabold text-slate-300 mb-2">
                  Aylık Paket Ücreti (₺ / Ay)
                </label>
                <input
                  type="number"
                  min="0"
                  value={siteConfig.vipMonthlyPrice === 0 ? "" : (siteConfig.vipMonthlyPrice ?? 99)}
                  onChange={(e) => {
                    const val = e.target.value === "" ? 0 : Number(e.target.value);
                    const disc = siteConfig.vipAnnualDiscountPercent ?? 20;
                    const autoAnnual = Math.round(val * 12 * (1 - disc / 100));
                    setSiteConfig({
                      ...siteConfig,
                      vipMonthlyPrice: val,
                      vipAnnualPrice: autoAnnual
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm font-black text-white focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-300 mb-2">
                  Yıllık Paket İndirim Oranı (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={siteConfig.vipAnnualDiscountPercent === 0 ? "" : (siteConfig.vipAnnualDiscountPercent ?? 20)}
                  onChange={(e) => {
                    const disc = e.target.value === "" ? 0 : Number(e.target.value);
                    const val = siteConfig.vipMonthlyPrice ?? 99;
                    const autoAnnual = Math.round(val * 12 * (1 - disc / 100));
                    setSiteConfig({
                      ...siteConfig,
                      vipAnnualDiscountPercent: disc,
                      vipAnnualPrice: autoAnnual
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm font-black text-amber-400 focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>

              {/* Realtime Auto-Calculated Annual Price Display */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/40 flex flex-col justify-center">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">OTOMATİK HESAPLANAN YILLIK FİYAT</span>
                <div className="text-2xl font-black text-white mt-1">
                  ₺{siteConfig.vipAnnualPrice ?? Math.round((siteConfig.vipMonthlyPrice ?? 99) * 12 * 0.8)} <span className="text-xs text-slate-400 font-medium">/ yıl</span>
                </div>
                <p className="text-[11px] text-emerald-400 font-medium mt-1">
                  Aylık ₺{Math.round((siteConfig.vipAnnualPrice ?? 950) / 12)}'ye geliyor (%{siteConfig.vipAnnualDiscountPercent ?? 20} Tasarruf)
                </p>
              </div>
            </div>
          </form>

          {/* 1.5. PAYTR & SANAL POS ENTEGRASYON PANELERİ */}
          <form onSubmit={handleSaveConfig} className="bg-slate-900 border border-blue-500/30 shadow-xl rounded-3xl p-6 sm:p-8 space-y-6 text-slate-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-blue-400 uppercase tracking-wide flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-blue-400" />
                  💳 PayTR Sanal POS & Otomatik Kart Ödemesi Entegrasyonu
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  PayTR.com Sanal POS hesabınızı bağlayarak kredi/banka kartı ödemelerini otomatik alabilir ve VIP üyelikleri anında aktifleştirebilirsiniz.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saveSuccess ? "✓ Kaydedildi!" : "PayTR Ayarlarını Kaydet"}
              </button>
            </div>

            <div className="space-y-6">
              {/* Enable / Disable Gateway & Provider Select */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <div>
                    <label className="text-xs font-black text-white block">Sanal POS Ödeme Altyapısı Statüsü</label>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {siteConfig.paymentGatewayConfig?.enabled ? "🟢 PayTR Aktif (Kart Ödemeleri Açık)" : "🔴 Pasif (Yalnızca Havale/EFT Kabul Edilir)"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = siteConfig.paymentGatewayConfig || { enabled: false, provider: "paytr" };
                      setSiteConfig({
                        ...siteConfig,
                        paymentGatewayConfig: {
                          ...cur,
                          enabled: !cur.enabled
                        }
                      });
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${siteConfig.paymentGatewayConfig?.enabled ? "bg-emerald-500" : "bg-slate-700"}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${siteConfig.paymentGatewayConfig?.enabled ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-2">
                    Ödeme Sağlayıcı Seçimi
                  </label>
                  <select
                    value={siteConfig.paymentGatewayConfig?.provider || "paytr"}
                    onChange={(e) => {
                      const p = e.target.value as any;
                      setSiteConfig({
                        ...siteConfig,
                        paymentGatewayConfig: {
                          ...(siteConfig.paymentGatewayConfig || { enabled: true }),
                          provider: p
                        }
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="paytr">💳 PayTR Sanal POS (Türkiye - Tavsiye Edilen)</option>
                    <option value="shopier">🛍️ Shopier (Alternatif)</option>
                    <option value="iyzico">🔷 İyzico Sanal POS</option>
                    <option value="stripe">🌐 Stripe (Uluslararası)</option>
                    <option value="custom">🏦 Manuel Kart / Havale Bildirimi</option>
                  </select>
                </div>
              </div>

              {/* API Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-1.5">
                    Mağaza No (Merchant ID)
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: 123456"
                    value={siteConfig.paymentGatewayConfig?.merchantId || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSiteConfig({
                        ...siteConfig,
                        paymentGatewayConfig: {
                          ...(siteConfig.paymentGatewayConfig || { enabled: true, provider: "paytr" }),
                          merchantId: v
                        }
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-blue-400 focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">PayTR Mağaza Paneli -&gt; Bilgi menüsünden alınır.</span>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-1.5">
                    API Key (Mağaza Parola)
                  </label>
                  <input
                    type="password"
                    placeholder="PayTR API Key"
                    value={siteConfig.paymentGatewayConfig?.apiKey || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSiteConfig({
                        ...siteConfig,
                        paymentGatewayConfig: {
                          ...(siteConfig.paymentGatewayConfig || { enabled: true, provider: "paytr" }),
                          apiKey: v
                        }
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-blue-400 focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">PayTR tarafındaki API Anahtarı</span>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-1.5">
                    API Secret (Gizli Anahtar)
                  </label>
                  <input
                    type="password"
                    placeholder="PayTR API Secret"
                    value={siteConfig.paymentGatewayConfig?.apiSecret || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSiteConfig({
                        ...siteConfig,
                        paymentGatewayConfig: {
                          ...(siteConfig.paymentGatewayConfig || { enabled: true, provider: "paytr" }),
                          apiSecret: v
                        }
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-blue-400 focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">PayTR Mağaza Gizli Anahtarı (Salt)</span>
                </div>
              </div>

              {/* PayTR Callback Webhook URL Box */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-blue-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    PayTR Bildirim URL (Callback / Webhook URL)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const callbackUrl = `${window.location.protocol}//${window.location.host}/api/paytr/callback`;
                      navigator.clipboard.writeText(callbackUrl);
                      alert("PayTR Bildirim URL'si panoya kopyalandı:\n" + callbackUrl);
                    }}
                    className="text-[11px] font-bold text-blue-400 hover:text-blue-300 bg-blue-950/80 border border-blue-800/80 px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                  >
                    📋 URL'yi Kopyala
                  </button>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400 break-all select-all">
                  {typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}/api/paytr/callback` : "https://siteniz.com/api/paytr/callback"}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ⚠️ <strong>Önemli:</strong> PayTR mağaza panelinize girip <strong>Ayarlar -&gt; Bildirim URL (Callback URL)</strong> kısmına yukarıdaki adresi yapıştırmalısınız. Ödeme tamamlandığında PayTR bu adrese bildirim gönderir ve VIP üyeliği sistem anında aktifleştirir.
                </p>
              </div>

              {/* Step by Step PayTR Setup Guide */}
              <div className="p-5 bg-blue-950/30 border border-blue-900/60 rounded-2xl space-y-3">
                <h4 className="text-xs font-black text-blue-300 uppercase tracking-wider flex items-center gap-2">
                  <span>📖 PayTR Başvuru &amp; Bağlama Rehberi (Adım Adım)</span>
                </h4>
                <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>
                    <strong>PayTR'ye Başvurun:</strong> <a href="https://www.paytr.com" target="_blank" rel="noreferrer" className="text-blue-400 underline font-bold">paytr.com</a> adresine giderek Sanal POS başvurusu yapın (Şahıs şirketi veya kurumsal firma önerilir).
                  </li>
                  <li>
                    <strong>Mağaza Bilgilerinizi Alın:</strong> PayTR onayının ardından PayTR Mağaza Paneline giriş yapın. Sol menüden <strong>Bilgi</strong> sekmesine tıklayın.
                  </li>
                  <li>
                    <strong>Anahtarları Yapıştırın:</strong> Ekranda görünen <code>Mağaza No (Merchant ID)</code>, <code>API Key</code> ve <code>API Secret</code> değerlerini yukarıdaki form alanlarına kopyalayıp yapıştırın.
                  </li>
                  <li>
                    <strong>Bildirim URL'sini Tanımlayın:</strong> PayTR panelinde <strong>Ayarlar -&gt; Bildirim URL</strong> kısmına yukarıda verilen <code>https://.../api/paytr/callback</code> adresini kaydedin.
                  </li>
                  <li>
                    <strong>Tamamlandı:</strong> "PayTR Ayarlarını Kaydet" butonuna basın. Artık müşteriler kart ile VIP üyelik aldıklarında 3D Secure güvencesiyle öder ve üyeliği saniyeler içinde otomatik başlar!
                  </li>
                </ol>
              </div>
            </div>
          </form>

          {/* 2. BANK ACCOUNTS & HAVALE MANAGEMENT */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-400" />
                  Banka IBAN Hesapları (Havale / EFT İçin)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Müşterilerin havale yapacağı Ziraat, Garanti, Akbank vb. IBAN hesaplarını yönetin.
                </p>
              </div>
            </div>

            {/* Existing Banks List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(siteConfig.bankAccounts || []).map((b) => (
                <div key={b.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-black text-amber-400 uppercase">{b.bankName}</span>
                    <p className="text-xs font-bold text-white">{b.accountHolder}</p>
                    <p className="text-xs font-mono text-slate-300 bg-slate-900 px-2 py-1 rounded border border-slate-800">{b.iban}</p>
                    {b.branchCode && <p className="text-[10px] text-slate-500">Şube: {b.branchCode}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteBankAccount(b.id)}
                    className="p-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/50 rounded-xl transition-all cursor-pointer"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Bank Account Form */}
            <form onSubmit={handleAddBankAccount} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Yeni Banka Hesabı Ekle</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Banka Adı (Örn: Ziraat Bankası)"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  placeholder="Hesap Sahibi Adı Soyadı"
                  value={newAccountHolder}
                  onChange={(e) => setNewAccountHolder(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                  value={newIban}
                  onChange={(e) => setNewIban(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Açıklama / Şube Kodu (İsteğe bağlı)"
                  value={newBankDesc}
                  onChange={(e) => setNewBankDesc(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Banka Ekle
                </button>
              </div>
            </form>
          </div>

          {/* 3. PAYMENT REQUESTS QUEUE */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  Gelen VIP Ödeme ve Havale Bildirimleri ({paymentRequests.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gelen kart ve havale ödemelerini inceleyin, tek tıkla onaylayarak VIP üyeliği aktifleştirin.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchPaymentRequests}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Yenile
              </button>
            </div>

            {paymentRequests.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                Henüz ödeme bildirimi bulunmuyor.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="py-3 px-4">Kullanıcı</th>
                      <th className="py-3 px-4">Paket & Tutar</th>
                      <th className="py-3 px-4">Ödeme Yöntemi</th>
                      <th className="py-3 px-4">Gönderen / Banka</th>
                      <th className="py-3 px-4">Tarih</th>
                      <th className="py-3 px-4">Durum</th>
                      <th className="py-3 px-4 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs">
                    {paymentRequests.map((pr) => (
                      <tr key={pr.id} className="hover:bg-slate-950/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">
                          <div>
                            <p>@{pr.username}</p>
                            <p className="text-[10px] text-slate-500 font-normal">{pr.userEmail}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-black text-amber-400">
                          <div>
                            <p>₺{pr.amount}</p>
                            <span className="text-[10px] text-slate-400 font-medium uppercase">{pr.plan === "yearly" ? "Yıllık" : "Aylık"}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border ${
                            pr.paymentMethod === "card" 
                              ? "bg-blue-950 text-blue-400 border-blue-800" 
                              : "bg-amber-950 text-amber-400 border-amber-800"
                          }`}>
                            {pr.paymentMethod === "card" ? "💳 Kredi/Banka Kartı" : "🏦 Havale / EFT"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          <div>
                            <p className="font-bold">{pr.senderName || pr.bankName || "-"}</p>
                            {pr.cardNumberMasked && <p className="text-[10px] font-mono text-slate-500">{pr.cardNumberMasked}</p>}
                            {pr.receiptNumber && <p className="text-[10px] text-slate-500">Ref: {pr.receiptNumber}</p>}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                          {new Date(pr.createdAt).toLocaleString("tr-TR")}
                        </td>
                        <td className="py-3.5 px-4">
                          {pr.status === "approved" && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-1 rounded-xl flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" /> Onaylandı
                            </span>
                          )}
                          {pr.status === "pending" && (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2.5 py-1 rounded-xl flex items-center gap-1 w-fit animate-pulse">
                              ⏳ Onay Bekliyor
                            </span>
                          )}
                          {pr.status === "rejected" && (
                            <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 border border-rose-800/60 px-2.5 py-1 rounded-xl flex items-center gap-1 w-fit">
                              <XCircle className="w-3 h-3" /> Reddedildi
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {pr.status === "pending" ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleApprovePayment(pr.id)}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Onayla
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectPayment(pr.id)}
                                className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                              >
                                Reddet
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-600 font-medium">Tamamlandı</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* SUBTAB: SECURITY & PRIVACY */}
      {activeSubTab === "security" && (
        <div className="space-y-6">
          <form onSubmit={handleSaveConfig} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  Güvenlik & KVKK Gizlilik Yapılandırması
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Uçtan uca şifreleme, çerez ve KVKK bildirimi, hotlink koruması ve güvenlik politikalarını yönetin.
                </p>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shrink-0"
              >
                <Save className="w-4 h-4" />
                Güvenlik Ayarlarını Kaydet
              </button>
            </div>

            {/* Status overview cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Şifreleme Standartı</span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">256-Bit AES Uçtan Uca</span>
                </div>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">KVKK & Çerez Uyumlu</span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                    {siteConfig.securityKvkkNoticeEnabled !== false ? "Etkin (Aktif)" : "Devre Dışı"}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-2xl flex items-center gap-3">
                <div className="p-2.5 bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-xl">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hotlink Bağlantı Kalkanı</span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                    {siteConfig.securityHotlinkProtection !== false ? "Korumalı" : "Korumasız"}
                  </span>
                </div>
              </div>
            </div>

            {/* Security Toggles Grid */}
            <div className="space-y-4 mb-8">
              <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                🛡️ Sistem Güvenlik ve Gizlilik Modları
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Toggle 1: KVKK Notice */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-500" />
                      KVKK & Çerez Bildirimi
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Site ziyaretçilerine alt kısımda KVKK bilgilendirmesi ve çerez onay bildirim bandı gösterir.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={siteConfig.securityKvkkNoticeEnabled !== false}
                      onChange={(e) => setSiteConfig({ ...siteConfig, securityKvkkNoticeEnabled: e.target.checked })}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Toggle 2: Hotlink Protection */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-violet-500" />
                      Görsel Hotlink Koruma Modu
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      İzinsiz harici web sitelerinin görsellerinizi doğrudan çekmesini ve bant genişliğinizi tüketmesini önler.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={siteConfig.securityHotlinkProtection !== false}
                      onChange={(e) => setSiteConfig({ ...siteConfig, securityHotlinkProtection: e.target.checked })}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Toggle 3: Default Watermark */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Varsayılan Görsel Filigranı (Watermark)
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Yüklenen kamuya açık resimlere telif koruması amacıyla şeffaf "İnanResim" filigranı uygular.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={!!siteConfig.securityWatermarkDefault}
                      onChange={(e) => setSiteConfig({ ...siteConfig, securityWatermarkDefault: e.target.checked })}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Toggle 4: Force HTTPS & Security Headers */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-emerald-500" />
                      Sıkı HTTP Güvenlik Başlıkları (HSTS / Anti-XSS)
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      XSS, Sniffing ve Clickjacking saldırılarına karşı tarayıcı düzeyinde kalkan sağlar.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={siteConfig.securityForceHttpsHeaders !== false}
                      onChange={(e) => setSiteConfig({ ...siteConfig, securityForceHttpsHeaders: e.target.checked })}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Privacy Policy & Terms Editor */}
            <div className="space-y-6 border-t border-slate-100 dark:border-slate-800 pt-6">
              <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-500" />
                Gizlilik Sözleşmesi & Kullanım Şartları Metinleri
              </h4>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  🔒 Gizlilik Politikası (Privacy Policy) Metni
                </label>
                <textarea
                  rows={4}
                  value={siteConfig.privacyPolicyText || "İnanResim Gizlilik Politikası: Kullanıcı verileri ve yüklenen görselleriniz 256-bit şifreleme standartlarına tabidir. İzniniz olmadan asla 3. şahıslarla paylaşılmaz."}
                  onChange={(e) => setSiteConfig({ ...siteConfig, privacyPolicyText: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  📜 Kullanım Şartları (Terms of Service) Metni
                </label>
                <textarea
                  rows={4}
                  value={siteConfig.termsOfServiceText || "İnanResim Kullanım Şartları: Yasalara aykırı, telif hakkı ihlali içeren veya zararlı içerik yüklemek kesinlikle yasaktır. İhlal eden hesaplar kısıtlanacaktır."}
                  onChange={(e) => setSiteConfig({ ...siteConfig, termsOfServiceText: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ERROR TRACKING PANEL SUBTAB */}
      {activeSubTab === "errors" && (
        <div className="space-y-6">
          {/* Header & Quick Action Buttons */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Bug className="w-5 h-5 text-red-500" />
                  Hata Takip Paneli (Sunucu & Dosya Yükleme Logları)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Son dosya yükleme başarısızlıkları, Multer limit aşımları, engelli kullanıcı erişimleri ve sunucu tarafı hata kayıtlarını gerçek zamanlı takip edin.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => fetchErrorLogs()}
                  disabled={isLoadingErrorLogs}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingErrorLogs ? "animate-spin" : ""}`} />
                  Yenile
                </button>

                <button
                  type="button"
                  onClick={handleCreateTestErrorLog}
                  className="px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-600" />
                  Test Hatası Simüle Et
                </button>

                <button
                  type="button"
                  onClick={handleClearErrorLogs}
                  disabled={errorLogs.length === 0}
                  className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Logları Temizle
                </button>
              </div>
            </div>

            {logClearSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                {logClearSuccess}
              </div>
            )}
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Toplam Kayıtlı Hata</p>
                <h4 className="text-2xl font-black text-slate-900 mt-1">{errorLogStats.totalErrors}</h4>
              </div>
              <div className="w-11 h-11 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center border border-red-100">
                <Bug className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Yükleme Hataları</p>
                <h4 className="text-2xl font-black text-slate-900 mt-1">{errorLogStats.uploadErrors}</h4>
              </div>
              <div className="w-11 h-11 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center border border-amber-100">
                <HardDrive className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Son 24 Saat Hataları</p>
                <h4 className="text-2xl font-black text-slate-900 mt-1">{errorLogStats.last24hErrors}</h4>
              </div>
              <div className="w-11 h-11 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-100">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sistem Sağlık Durumu</p>
                <h4 className="text-sm font-black mt-1 flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {errorLogStats.systemStatus === "healthy" ? "Normal & Kararlı" : "Dikkat İnceleme"}
                </h4>
              </div>
              <div className="w-11 h-11 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center border border-emerald-100">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filter & Search Controls */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Hata mesajı, dosya adı, IP veya detay ara..."
                value={errorLogSearch}
                onChange={(e) => {
                  setErrorLogSearch(e.target.value);
                  fetchErrorLogs(errorLogFilterType, e.target.value);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {[
                { id: "all", label: "Tüm Hatalar" },
                { id: "upload", label: "Dosya Yükleme" },
                { id: "auth", label: "Kullanıcı / Yetki" },
                { id: "db", label: "Veritabanı" },
                { id: "server", label: "Sunucu" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setErrorLogFilterType(f.id);
                    fetchErrorLogs(f.id, errorLogSearch);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    errorLogFilterType === f.id
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Logs List */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden">
            {isLoadingErrorLogs ? (
              <div className="p-12 text-center text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
                Hata logları yükleniyor...
              </div>
            ) : errorLogs.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-800">Kayıtlı Hata Bulunmuyor</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Seçilen kriterlere uygun herhangi bir dosya yükleme veya sunucu hatası kaydı mevcut değil.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {errorLogs.map((log) => {
                  return (
                    <div key={log.id} className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                            log.type === "upload" 
                              ? "bg-red-100 text-red-700 border border-red-200"
                              : log.type === "auth"
                              ? "bg-amber-100 text-amber-700 border border-amber-200"
                              : log.type === "db"
                              ? "bg-purple-100 text-purple-700 border border-purple-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}>
                            {log.type === "upload" ? "Dosya Yükleme" : log.type === "auth" ? "Yetkilendirme" : log.type === "db" ? "Veritabanı" : "Sunucu"}
                          </span>

                          {log.statusCode && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-mono font-bold">
                              HTTP {log.statusCode}
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(log.timestamp).toLocaleString("tr-TR")}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-800 break-words flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          {log.message}
                        </h4>

                        {log.details && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 font-mono bg-slate-50 p-2 rounded-xl border border-slate-100">
                            {log.details}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                          {log.fileName && (
                            <span className="font-semibold text-slate-600 flex items-center gap-1">
                              📁 Dosya: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-800">{log.fileName}</code>
                            </span>
                          )}
                          {log.fileSize ? (
                            <span>
                              Boyut: <strong>{(log.fileSize / (1024 * 1024)).toFixed(2)} MB</strong>
                            </span>
                          ) : null}
                          {log.ip && (
                            <span className="font-mono text-slate-500">
                              IP: {log.ip}
                            </span>
                          )}
                          {log.userId && (
                            <span className="text-blue-600 font-semibold">
                              Üye ID: {log.userId}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          type="button"
                          onClick={() => setSelectedErrorDetail(log)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          Detay Göster
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal for viewing full error detail */}
          {selectedErrorDetail && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-red-500" />
                    Hata Log Detayları [{selectedErrorDetail.id}]
                  </h3>
                  <button
                    onClick={() => setSelectedErrorDetail(null)}
                    className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto font-sans">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Zaman Stamp</span>
                      <span className="font-bold text-slate-800">{new Date(selectedErrorDetail.timestamp).toLocaleString("tr-TR")}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Hata Türü</span>
                      <span className="font-extrabold text-red-600 uppercase">{selectedErrorDetail.type}</span>
                    </div>

                    {selectedErrorDetail.fileName && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Dosya Adı & Boyutu</span>
                        <span className="font-bold text-slate-800 font-mono">{selectedErrorDetail.fileName}</span>
                        {selectedErrorDetail.fileSize ? <span className="text-slate-500 text-[11px] ml-2">({(selectedErrorDetail.fileSize / (1024 * 1024)).toFixed(2)} MB)</span> : null}
                      </div>
                    )}

                    {selectedErrorDetail.ip && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">İstemci IP</span>
                        <span className="font-mono text-slate-800">{selectedErrorDetail.ip}</span>
                      </div>
                    )}

                    {selectedErrorDetail.statusCode && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">HTTP Durum Kodu</span>
                        <span className="font-mono font-bold text-slate-800">{selectedErrorDetail.statusCode}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Hata Başlığı / Mesajı</label>
                    <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-bold">
                      {selectedErrorDetail.message}
                    </div>
                  </div>

                  {selectedErrorDetail.details && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Detaylı Stack Trace / Log Metni</label>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedErrorDetail.details || "");
                            alert("Hata detayları panoya kopyalandı!");
                          }}
                          className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          Kopyala
                        </button>
                      </div>
                      <pre className="p-4 bg-slate-900 text-emerald-400 rounded-2xl text-[11px] font-mono overflow-x-auto whitespace-pre-wrap max-h-60 leading-relaxed border border-slate-800">
                        {selectedErrorDetail.details}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setSelectedErrorDetail(null)}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Kapat
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
