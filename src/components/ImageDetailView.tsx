import React, { useEffect, useState } from "react";
import { 
  DownloadCloud, 
  Download, 
  Eye, 
  Calendar, 
  HardDrive, 
  ShieldAlert, 
  ShieldCheck, 
  Copy, 
  Check, 
  ArrowLeft, 
  ExternalLink, 
  Lock, 
  QrCode, 
  Archive, 
  ListOrdered, 
  CheckCircle2, 
  Share2, 
  FileText, 
  Zap, 
  RefreshCw, 
  HelpCircle,
  Clock,
  Sparkles
} from "lucide-react";
import { ClientImage } from "../types";
import QRCodeShareModal from "./QRCodeShareModal";

interface ImageDetailViewProps {
  imageId: string;
  onBack: () => void;
}

interface ImageMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: number;
  deleteAfter: string;
  views: number;
  hasPassword: boolean;
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkColor?: string;
  watermarkSize?: number;
  watermarkPosition?: string;
}

export default function ImageDetailView({ imageId, onBack }: ImageDetailViewProps) {
  const [meta, setMeta] = useState<ImageMeta | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifiedDataUrl, setVerifiedDataUrl] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "direct" | "bbcode" | "html" | "markdown">("direct");
  const [showQrModal, setShowQrModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const loadMetadata = () => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    fetch(`/api/images/${imageId}/info`, { signal: controller.signal })
      .then((res) => {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("Görsel veya dosya bulunamadı.");
        return res.json();
      })
      .then((data) => {
        setMeta(data);
        if (!data.hasPassword) {
          setVerifiedDataUrl(`/api/images/${imageId}`);
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          setError("Sunucu yanıtı zaman aşımına uğradı. Lütfen sayfayı yenileyip tekrar deneyin.");
        } else {
          setError(err.message || "Dosya detayları yüklenirken bir hata oluştu.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadMetadata();
  }, [imageId]);

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`/api/images/${imageId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Şifre doğrulanamadı.");
      }
      setVerifiedDataUrl(data.dataUrl || data.directUrl || `/api/images/${imageId}?pw=${encodeURIComponent(password)}`);
    } catch (err: any) {
      setError(err.message || "Hatalı şifre!");
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(type);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const triggerDownload = () => {
    setIsDownloading(true);
    setDownloadSuccess(true);

    const baseUrl = verifiedDataUrl || `/api/images/${imageId}`;
    const downloadUrl = baseUrl.includes("?") 
      ? `${baseUrl}&dl=1` 
      : `${baseUrl}?dl=1`;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = meta?.name || "dosya";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsDownloading(false);
    }, 1500);
    setTimeout(() => {
      setDownloadSuccess(false);
    }, 4000);
  };

  if (loading) {
    return (
      <div className="text-center py-28" id="detail-loading-state">
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-600 border-t-transparent mx-auto"></div>
        <p className="text-slate-400 text-sm mt-4 font-bold">Güvenli Dosya İndirme Sayfası Hazırlanıyor...</p>
      </div>
    );
  }

  if (error && !meta) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4 animate-fade-in" id="detail-error-state">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Dosya Bulunamadı veya Silindi</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
          Aradığınız dosya otomatik silinme süresi dolduğu için veya sahibi tarafından silinmiş olabilir.
        </p>
        <button
          onClick={onBack}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  const isVideo = meta?.mimeType?.startsWith("video/");
  const isImage = meta?.mimeType?.startsWith("image/");

  const origin = window.location.origin;
  const directLink = `${origin}/api/images/${imageId}`;
  const previewLink = `${origin}/i/${imageId}`;
  const shortLink = `${origin}/i/${imageId}`;
  const bbCode = isVideo ? `[VIDEO]${directLink}[/VIDEO]` : `[IMG]${directLink}[/IMG]`;
  const htmlCode = isVideo 
    ? `<video src="${directLink}" controls width="100%"></video>` 
    : `<a href="${previewLink}"><img src="${directLink}" alt="${meta?.name || 'Görsel'}" /></a>`;
  const markdownCode = isVideo 
    ? `[${meta?.name || 'Video'}](${directLink})` 
    : `![${meta?.name || 'Görsel'}](${directLink})`;

  const getLinkValue = () => {
    switch (activeTab) {
      case "direct":
        return directLink;
      case "preview":
        return shortLink;
      case "bbcode":
        return bbCode;
      case "html":
        return htmlCode;
      case "markdown":
        return markdownCode;
    }
  };

  // Password Screen
  if (meta?.hasPassword && !verifiedDataUrl) {
    return (
      <div className="max-w-md mx-auto my-16 px-4 animate-fade-in" id="detail-lock-screen">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center relative overflow-hidden">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 dark:border-blue-900/40">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
            Şifre Korumalı Dosya
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
            Bu dosyayı indirmek ve görüntülemek için yükleyici tarafından belirlenen şifreyi girmelisiniz.
          </p>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold rounded-xl border border-red-500/20">
              {error}
            </div>
          )}

          <form onSubmit={handleVerifyPassword} className="mt-6 space-y-4">
            <input
              type="password"
              placeholder="Dosya şifresini giriniz..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl transition-all cursor-pointer text-sm shadow-lg shadow-blue-500/25"
            >
              Şifreyi Doğrula ve İndir
            </button>
          </form>

          <button
            onClick={onBack}
            className="mt-5 text-xs text-slate-400 font-semibold hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
          >
            ← Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in" id="file-download-portal">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-sm cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ana Sayfaya Dön</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3.5 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/40 shadow-sm">
          <ShieldCheck className="w-4 h-4" />
          <span>Güvenli SSL Bulut İndirme Sunucusu</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Main Download Portal Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* File Header Info */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                {isVideo ? (
                  <Zap className="w-6 h-6" />
                ) : isImage ? (
                  <Sparkles className="w-6 h-6" />
                ) : (
                  <Archive className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight truncate" title={meta?.name}>
                  {meta?.name}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5 flex items-center gap-2">
                  <span>{formatSize(meta?.size || 0)}</span>
                  <span>•</span>
                  <span>{formatDate(meta?.uploadedAt || 0)}</span>
                  <span>•</span>
                  <span className="text-blue-600 dark:text-blue-400 font-extrabold">{meta?.views} indirme/görüntülenme</span>
                </p>
              </div>
            </div>

            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl border border-slate-200 dark:border-slate-700">
              {isImage ? "Görsel Dosyası" : isVideo ? "Video Medyası" : "Arşiv / Dosya"}
            </span>
          </div>

          {/* Preview Box */}
          <div className="mb-8 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 p-4 flex items-center justify-center min-h-[220px] max-h-[480px] overflow-hidden relative">
            {isVideo ? (
              <video
                src={verifiedDataUrl || ""}
                controls
                className="max-h-[440px] w-full rounded-xl object-contain"
              />
            ) : isImage ? (
              <img
                src={verifiedDataUrl || ""}
                alt={meta?.name}
                className="max-h-[440px] w-auto rounded-xl object-contain shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="text-center py-8">
                <Archive className="w-16 h-16 text-blue-500 mx-auto mb-3 animate-pulse" />
                <h4 className="text-base font-black text-slate-800 dark:text-white">{meta?.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{formatSize(meta?.size || 0)} • Yüksek Hızlı Dosya İndirme</p>
              </div>
            )}
          </div>

          {/* Prominent Blue Download Button Section (Exact match to sample image request) */}
          <div className="flex flex-col items-center justify-center py-4 space-y-4">
            <button
              type="button"
              onClick={triggerDownload}
              disabled={isDownloading}
              className="w-full sm:w-auto min-w-[280px] sm:min-w-[360px] bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 sm:py-5 px-8 sm:px-12 rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/40 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-3 sm:gap-4 text-lg sm:text-xl group"
              id="btn-main-download"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <DownloadCloud className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="tracking-wide">
                {isDownloading ? "İndirme Başlatılıyor..." : "Dosyayı indir"}
              </span>
            </button>

            {downloadSuccess && (
              <div className="flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/40 animate-bounce">
                <CheckCircle2 className="w-4 h-4" />
                <span>İndirme başlatıldı! Dosyanız cihazınıza kaydediliyor.</span>
              </div>
            )}

            {/* Direct Mirror Download Option */}
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>İndirme otomatik başlamadıysa:</span>
              <a
                href={verifiedDataUrl || ""}
                download={meta?.name || "dosya"}
                className="text-blue-600 dark:text-blue-400 font-extrabold hover:underline flex items-center gap-1"
              >
                <span>Doğrudan İndirme Bağlantısı</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* "Dosya Nasıl İndirilir?" Card (Direct match to reference image) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-black shrink-0 border border-blue-100 dark:border-blue-900/40">
              <ListOrdered className="w-5 h-5" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white tracking-tight">
              Dosya Nasıl İndirilir?
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-start gap-3.5">
              <span className="w-7 h-7 bg-blue-600 text-white font-black text-xs rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                1
              </span>
              <div>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">"Dosyayı İndir" Butonuna Basın</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Yukarıda yer alan mavi renkli <strong>Dosyayı indir</strong> butonuna tıklayarak indirme işlemini başlatın.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-start gap-3.5">
              <span className="w-7 h-7 bg-blue-600 text-white font-black text-xs rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                2
              </span>
              <div>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">Otomatik İndirme Onayı</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Cihazınız veya tarayıcınız indirme konumu seçmenizi isteyebilir. Onay verdikten sonra indirme doğrudan başlar.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-start gap-3.5">
              <span className="w-7 h-7 bg-blue-600 text-white font-black text-xs rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                3
              </span>
              <div>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">Yüksek Hızlı & SSL Güvenlikli</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Dosyanız virüs taramasından geçmiş SSL şifreli yüksek hızlı bulut sunucularımızdan doğrudan aktarılır.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-start gap-3.5">
              <span className="w-7 h-7 bg-blue-600 text-white font-black text-xs rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                4
              </span>
              <div>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">Sorun Mu Yaşıyorsunuz?</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  İndirme başlamadıysa sayfayı yenileyip tekrar deneyebilir veya <strong>"Doğrudan İndirme Bağlantısı"</strong> alanına tıklayabilirsiniz.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Share Links & Embedding Codes Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Dosya Paylaşım & Bağlantı Kodları</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Forumlar, web siteleri ve sosyal medya için paylaşım linkleri.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer hover:scale-105"
            >
              <QrCode className="w-4 h-4" />
              <span>QR Kod & Paylaş</span>
            </button>
          </div>

          {/* Link Selector Tabs */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {[
              { id: "direct", label: "Doğrudan Bağlantı (Direk Link) ⭐" },
              { id: "preview", label: "İndirme Sayfası Linki" },
              { id: "bbcode", label: "Forum (BBCode)" },
              { id: "html", label: "HTML Kodu" },
              { id: "markdown", label: "Markdown" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Links Output Box */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 relative min-h-[90px] flex items-center justify-between gap-4">
            <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all pr-12 leading-relaxed max-h-[100px] overflow-y-auto">
              {getLinkValue()}
            </pre>

            <button
              onClick={() => handleCopy(getLinkValue(), activeTab)}
              className="absolute right-3 top-3.5 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-sm transition-all cursor-pointer"
              title="Kopyala"
            >
              {copiedIndex === activeTab ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {showQrModal && meta && (
        <QRCodeShareModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          imageUrl={`${origin}/api/images/${meta.id}`}
          previewUrl={`${origin}/d/${meta.id}`}
          title={meta.name}
        />
      )}
    </div>
  );
}
