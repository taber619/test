import React, { useEffect, useState } from "react";
import { Download, Eye, Calendar, HardDrive, ShieldAlert, Key, Copy, Check, ArrowLeft, ExternalLink, Lock, QrCode } from "lucide-react";
import { ClientImage } from "../types";

interface ImageDetailViewProps {
  imageId: string;
  onBack: () => void;
  onOpenQRCode: (url: string) => void;
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
}

export default function ImageDetailView({ imageId, onBack, onOpenQRCode }: ImageDetailViewProps) {
  const [meta, setMeta] = useState<ImageMeta | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifiedDataUrl, setVerifiedDataUrl] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"direct" | "preview" | "bbcode" | "html" | "markdown">("direct");

  const loadMetadata = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/images/${imageId}/info`)
      .then((res) => {
        if (!res.ok) throw new Error("Görsel bulunamadı.");
        return res.json();
      })
      .then((data) => {
        setMeta(data);
        if (!data.hasPassword) {
          // If not password-protected, the image source is just the standard endpoint
          setVerifiedDataUrl(`/api/images/${imageId}`);
        }
      })
      .catch((err) => {
        setError(err.message || "Görsel yüklenirken bir hata oluştu.");
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
      // Success!
      setVerifiedDataUrl(data.dataUrl);
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
    const sizes = ["B", "KB", "MB"];
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

  if (loading) {
    return (
      <div className="text-center py-24" id="detail-loading-state">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
        <p className="text-slate-400 text-sm mt-4 font-bold">Görsel detayları alınıyor...</p>
      </div>
    );
  }

  if (error && !meta) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4 animate-fade-in" id="detail-error-state">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Görsel Bulunamadı veya Silindi</h3>
        <p className="text-slate-500 text-sm mt-2">
          Aradığınız görsel otomatik silinme süresi dolduğu için veya sahibi tarafından silinmiş olabilir.
        </p>
        <button
          onClick={onBack}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  // Generate codes
  const origin = window.location.origin;
  const directLink = `${origin}/api/images/${imageId}`;
  const previewLink = `${origin}/?view=image-detail&id=${imageId}`;
  const bbCode = `[IMG]${directLink}[/IMG]`;
  const htmlCode = `<a href="${previewLink}"><img src="${directLink}" alt="${meta?.name || 'Görsel'}" /></a>`;
  const markdownCode = `![${meta?.name || 'Görsel'}](${directLink})`;

  const getLinkValue = () => {
    switch (activeTab) {
      case "direct":
        return directLink;
      case "preview":
        return previewLink;
      case "bbcode":
        return bbCode;
      case "html":
        return htmlCode;
      case "markdown":
        return markdownCode;
    }
  };

  // If password is required and not yet verified
  if (meta?.hasPassword && !verifiedDataUrl) {
    return (
      <div className="max-w-md mx-auto my-16 px-4 animate-fade-in" id="detail-lock-screen">
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm text-center">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Bu Görsel Şifrelenmiştir</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            Bu görseli görüntülemek ve paylaşım kodlarını açmak için yükleyicinin belirlediği şifreyi girmelisiniz.
          </p>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleVerifyPassword} className="mt-6 space-y-4">
            <input
              type="password"
              placeholder="Şifreyi giriniz..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-sm bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer text-sm shadow-md shadow-blue-100"
            >
              Doğrula ve Görseli Göster
            </button>
          </form>

          <button
            onClick={onBack}
            className="mt-4 text-xs text-slate-400 font-semibold hover:text-slate-600 cursor-pointer"
          >
            ← İptal Et ve Geri Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 animate-fade-in" id="detail-view-panel">
      {/* Back navigation header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-bold text-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri Dön
        </button>

        <span className="text-xs bg-blue-50 text-blue-600 font-extrabold px-3 py-1 rounded-full">
          Aktif Görsel
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Visual display & info */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm relative flex items-center justify-center min-h-[300px] max-h-[550px]">
            <img
              src={verifiedDataUrl || ""}
              alt={meta?.name}
              className="max-h-[510px] w-auto rounded-2xl object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-4">
            <a
              href={verifiedDataUrl || ""}
              download={meta?.name || "gorsel.jpg"}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-2xl shadow-md shadow-blue-100 transition-all cursor-pointer text-sm"
            >
              <Download className="w-4 h-4" />
              Görseli İndir
            </a>

            <button
              onClick={() => onOpenQRCode(previewLink)}
              className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold py-3 px-5 rounded-2xl transition-all cursor-pointer text-sm border border-indigo-100/50"
            >
              <QrCode className="w-4 h-4" />
              QR Kod Al
            </button>

            <a
              href={verifiedDataUrl || ""}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-5 rounded-2xl transition-all cursor-pointer text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Aç
            </a>
          </div>
        </div>

        {/* Right column: metadata and code links */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Metadata Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h3 className="font-extrabold text-slate-800 text-lg mb-4 truncate" title={meta?.name}>
              {meta?.name}
            </h3>

            <div className="space-y-3.5 text-xs text-slate-500 font-semibold" id="meta-details-list">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Yükleme Tarihi:
                </span>
                <span className="text-slate-800">{formatDate(meta?.uploadedAt || 0)}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-slate-400" />
                  Dosya Boyutu:
                </span>
                <span className="text-slate-800">{formatSize(meta?.size || 0)}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-slate-400" />
                  İzlenme Sayısı:
                </span>
                <span className="text-slate-800 font-black text-blue-600">{meta?.views}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <span className="flex items-center gap-2">
                  <ClockIcon className="w-4 h-4 text-slate-400" />
                  Otomatik Silinme:
                </span>
                <span className="text-slate-800 capitalize">
                  {meta?.deleteAfter === "never" ? "Süresiz" : meta?.deleteAfter}
                </span>
              </div>
            </div>
          </div>

          {/* Share links */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex-1">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Görsel Paylaşım Kodları</span>

            {/* Link Selector Tabs */}
            <div className="flex flex-wrap gap-1 mt-3 border-b border-slate-100 pb-2">
              {[
                { id: "direct", label: "Doğrudan" },
                { id: "preview", label: "Önizleme" },
                { id: "bbcode", label: "BBCode" },
                { id: "html", label: "HTML" },
                { id: "markdown", label: "Markdown" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Links output box */}
            <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 relative min-h-[100px]">
              <pre className="text-xs font-mono text-slate-600 whitespace-pre-wrap break-all pr-12 leading-relaxed max-h-[120px] overflow-y-auto">
                {getLinkValue()}
              </pre>

              <button
                onClick={() => handleCopy(getLinkValue(), activeTab)}
                className="absolute right-3 top-3 p-2 bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-slate-800 hover:shadow-sm transition-all cursor-pointer"
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
      </div>
    </div>
  );
}

// Inline fallback Clock Icon to stay compact and modular without loading too many extra icons
function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
