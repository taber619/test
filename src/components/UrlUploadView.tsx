import React, { useState } from "react";
import { Link, ArrowLeft, AlertCircle, Shield, Sparkles } from "lucide-react";

interface UrlUploadViewProps {
  onBack: () => void;
  onUploadSuccess: (uploadedImg: any) => void;
  userId?: string;
}

export default function UrlUploadView({ onBack, onUploadSuccess, userId }: UrlUploadViewProps) {
  const [url, setUrl] = useState("");
  const [deleteAfter, setDeleteAfter] = useState("never");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!url) {
      setErrorMsg("Lütfen geçerli bir resim veya video URL'si giriniz.");
      return;
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      setErrorMsg("URL 'http://' veya 'https://' ile başlamalıdır.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          deleteAfter,
          password: password || undefined,
          userId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Görsel indirilemedi.");
      }

      onUploadSuccess(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Dosya indirilirken hata oluştu. URL'nin doğrudan bir resme veya videoya yönlendirdiğinden emin olun.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 animate-fade-in" id="url-upload-panel">
      {/* Header back navigation */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-bold text-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Yükleme Ekranına Dön
        </button>

        <span className="text-xs bg-blue-50 text-blue-600 font-extrabold px-3 py-1 rounded-full">
          Gelişmiş URL Modu
        </span>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Link className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">İnternetten Resim veya Video Yükle</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
            Web üzerindeki herhangi bir görsel veya video adresini yapıştırarak hızlıca kendi sunucunuza aktarın.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs font-semibold rounded-2xl border border-red-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" id="url-upload-form">
          {/* URL Input */}
          <div>
            <label className="block text-xs font-extrabold text-slate-600 uppercase mb-2 pl-0.5">
              Görsel veya Video Linki (URL)
            </label>
            <input
              type="url"
              placeholder="https://example.com/images/nature.png"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              className="w-full text-sm bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Settings Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
            {/* Delete After selector */}
            <div>
              <label className="block text-xs font-extrabold text-slate-600 uppercase mb-2 pl-0.5">
                Otomatik Silinme Süresi
              </label>
              <select
                value={deleteAfter}
                onChange={(e) => setDeleteAfter(e.target.value)}
                disabled={loading}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="never">Süresiz (Kalıcı)</option>
                <option value="1h">1 Saat Sonra Sil</option>
                <option value="1d">1 Gün Sonra Sil</option>
                <option value="1w">1 Hafta Sonra Sil</option>
                <option value="1m">1 Ay Sonra Sil</option>
              </select>
            </div>

            {/* Password input */}
            <div>
              <label className="block text-xs font-extrabold text-slate-600 uppercase flex items-center gap-1 mb-2 pl-0.5">
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
                Şifre Koruması (Opsiyonel)
              </label>
              <input
                type="password"
                placeholder="Dosyayı kilitlemek için şifre..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-blue-100 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Görsel İndiriliyor...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Saniyeler İçinde Aktar ve Yükle
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
