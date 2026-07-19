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
  ChevronRight
} from "lucide-react";
import { SiteConfig } from "../types";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  createdAt: number;
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  
  // Tab states
  const [activeSubTab, setActiveSubTab] = useState<"settings" | "users" | "images">("settings");
  
  // Loading & Action feedback
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Data states
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    homepageTitle: "",
    homepageSubtitle: "",
    announcementEnabled: false,
    announcementText: "",
    statsOffset: 0,
    usersOffset: 0,
    todayOffset: 0
  });
  
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [imagesList, setImagesList] = useState<AdminImage[]>([]);
  
  // Search/Filter states
  const [userSearch, setUserSearch] = useState("");
  const [imageSearch, setImageSearch] = useState("");

  // Authenticate Admin with simple PIN (default is "admin")
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "admin" || password === "1234") {
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Geçersiz yönetici şifresi! (İpucu: 'admin' deneyin)");
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      if (res.ok) {
        setSiteConfig(data);
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

  useEffect(() => {
    if (isAuthenticated) {
      setIsLoading(true);
      Promise.all([fetchConfig(), fetchUsers(), fetchImages()]).finally(() => {
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
        body: JSON.stringify(siteConfig),
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
        alert("Görsel başarıyla silindi.");
      } else {
        alert("Görsel silinemedi.");
      }
    } catch (e) {
      alert("Hata oluştu.");
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
      <div className="max-w-md mx-auto my-16 px-6 py-10 bg-white border border-slate-200 shadow-xl rounded-3xl text-center" id="admin-login-card">
        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Settings className="w-8 h-8 animate-spin" style={{ animationDuration: "12s" }} />
        </div>
        
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Yönetici Paneli Girişi</h2>
        <p className="text-xs text-slate-400 mt-1.5 mb-8">
          Hızlı Resim sistem yapılandırmasını düzenlemek ve kullanıcıları yönetmek için şifrenizi girin.
        </p>

        <form onSubmit={handleAuth} className="space-y-4" id="admin-login-form">
          <div>
            <label className="block text-left text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Yönetici Şifresi</label>
            <input
              id="admin-pwd-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifreyi girin (Örn: admin)"
              className="w-full px-4 py-3 border border-slate-200 bg-slate-50/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
              required
            />
          </div>

          {authError && (
            <p className="text-xs text-red-500 font-semibold flex items-center justify-center gap-1 bg-red-50 py-2 rounded-lg" id="admin-auth-error">
              <AlertTriangle className="w-3.5 h-3.5" />
              {authError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              id="admin-back-btn"
              type="button"
              onClick={onBack}
              className="flex-1 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all"
            >
              İptal
            </button>
            <button
              id="admin-submit-btn"
              type="submit"
              className="flex-1 py-3 bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-100"
            >
              Giriş Yap
            </button>
          </div>
        </form>
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

        <button
          id="admin-exit-btn"
          onClick={onBack}
          className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
        >
          Ana Sayfaya Dön
        </button>
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
      <div className="flex border-b border-slate-200 gap-1 mb-6" id="admin-subtabs-nav">
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
                <p className="text-[11px] text-slate-400 mt-0.5">Ana sayfanın en üstünde gösterilen genel duyuru şeridini ayarlayın.</p>
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

            <input
              type="text"
              value={siteConfig.announcementText}
              onChange={(e) => setSiteConfig({ ...siteConfig, announcementText: e.target.value })}
              placeholder="Duyuru mesajını girin..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-slate-50/50 focus:bg-white"
              disabled={!siteConfig.announcementEnabled}
            />
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
                    <th className="py-3 px-4">Kayıt Tarihi</th>
                    <th className="py-3 px-4 text-right">Kullanıcı ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold text-slate-800">@{u.username}</td>
                      <td className="py-3.5 px-4 text-slate-600">{u.email}</td>
                      <td className="py-3.5 px-4 text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-[10px] text-slate-400">{u.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeSubTab === "images" && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6" id="admin-images-panel">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-slate-400" />
              Sistemdeki Tüm Görseller
            </h3>

            <div className="relative max-w-sm">
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
          </div>

          {/* Images Grid */}
          {filteredImages.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
              Hiç görsel yüklenmemiş veya eşleşen sonuç bulunamadı.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {filteredImages.map((img) => (
                <div key={img.id} className="border border-slate-100 rounded-2xl p-4 flex flex-col hover:shadow-md transition-all bg-slate-50/20">
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
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
