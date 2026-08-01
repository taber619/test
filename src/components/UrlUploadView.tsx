import React, { useState } from "react";
import { Link, ArrowLeft, AlertCircle, Shield, Sparkles } from "lucide-react";

interface UrlUploadViewProps {
  onBack: () => void;
  onUploadSuccess: (uploadedImg: any) => void;
  userId?: string;
  currentUser?: any | null;
  siteConfig?: any | null;
  onOpenVipModal?: () => void;
}

export default function UrlUploadView({ onBack, onUploadSuccess, userId, currentUser, siteConfig, onOpenVipModal }: UrlUploadViewProps) {
  const isVip = currentUser && (currentUser.isVip || currentUser.role === "admin");
  const [url, setUrl] = useState("");
  const [deleteAfter, setDeleteAfter] = useState(isVip ? "never" : "1m");
  const [password, setPassword] = useState("");
  const [addWatermark, setAddWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState("© HızlıResim");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.5);
  const [watermarkColor, setWatermarkColor] = useState("#ffffff");
  const [watermarkPosition, setWatermarkPosition] = useState<"bottom-right" | "bottom-left" | "top-right" | "top-left" | "center">("bottom-right");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!termsAccepted) {
      setErrorMsg("Yüklemeye devam etmek için Kullanım Koşulları ve Yasal Beyanı kabul etmelisiniz.");
      return;
    }

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
      let guestToken = localStorage.getItem("inanresim_guest_token");
      if (!guestToken) {
        guestToken = "gst_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
        localStorage.setItem("inanresim_guest_token", guestToken);
      }

      const res = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          deleteAfter,
          password: password || undefined,
          userId,
          guestToken,
          watermarkText: addWatermark ? watermarkText : undefined,
          watermarkOpacity: addWatermark ? watermarkOpacity : undefined,
          watermarkColor: addWatermark ? watermarkColor : undefined,
          watermarkPosition: addWatermark ? watermarkPosition : undefined,
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
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-bold text-sm cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Yükleme Ekranına Dön
        </button>

        <span className="text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-extrabold px-3 py-1 rounded-full border border-blue-100 dark:border-blue-900/40">
          Gelişmiş URL Modu
        </span>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Link className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">İnternetten Resim veya Video Yükle</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Web üzerindeki herhangi bir görsel veya video adresini yapıştırarak hızlıca kendi sunucunuza aktarın.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded-2xl border border-red-100 dark:border-red-900/40 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" id="url-upload-form">
          {/* URL Input */}
          <div>
            <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase mb-2 pl-0.5">
              Görsel veya Video Linki (URL)
            </label>
            <input
              type="url"
              placeholder="https://example.com/images/nature.png"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 dark:text-white rounded-xl px-4 py-3.5 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Settings Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
            {/* Delete After selector */}
            <div>
              <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase mb-2 pl-0.5">
                Otomatik Silinme Süresi
              </label>
              <select
                value={deleteAfter}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "never" && !isVip) {
                    setErrorMsg("👑 Süresiz (kalıcı) saklama yalnızca PRO VIP üyelere özeldir! Standart üyeler için fotoğraflar ve tüm medyalar maksimum 1 ay saklanabilir.");
                    setDeleteAfter("1m");
                    if (onOpenVipModal) onOpenVipModal();
                  } else {
                    setDeleteAfter(val);
                  }
                }}
                disabled={loading}
                className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="never">
                  {isVip ? "Süresiz (Kalıcı Saklama — PRO VIP)" : "🔒 Süresiz (Kalıcı Saklama) — 👑 Yalnızca PRO VIP Üyelere Özel"}
                </option>
                <option value="1m">1 Ay Sonra Sil (Maksimum Standart Süre)</option>
                <option value="1w">1 Hafta Sonra Sil</option>
                <option value="1d">1 Gün Sonra Sil</option>
                <option value="1h">1 Saat Sonra Sil</option>
              </select>
              {!isVip && siteConfig?.vipEnabled !== false && (
                <button
                  type="button"
                  onClick={onOpenVipModal}
                  className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold mt-1.5 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  👑 Süresiz kalıcı saklama için PRO VIP üye olun
                </button>
              )}
            </div>

            {/* Password input */}
            <div>
              <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase flex items-center gap-1 mb-2 pl-0.5">
                <Shield className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                Şifre Koruması (Opsiyonel)
              </label>
              <input
                type="password"
                placeholder="Dosyayı kilitlemek için şifre..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filigran / Watermark Section */}
          <div className="bg-slate-50 dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                Görsel ve Video Üzerine Filigran (Watermark)
              </label>
              <input
                type="checkbox"
                checked={addWatermark}
                onChange={(e) => setAddWatermark(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {addWatermark && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Filigran Metni</label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-semibold text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Konum</label>
                  <select
                    value={watermarkPosition}
                    onChange={(e) => setWatermarkPosition(e.target.value as any)}
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-bold text-slate-700 dark:text-slate-200"
                  >
                    <option value="bottom-right">Sağ Alt</option>
                    <option value="bottom-left">Sol Alt</option>
                    <option value="top-right">Sağ Üst</option>
                    <option value="top-left">Sol Üst</option>
                    <option value="center">Orta</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Terms Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer group text-left">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  if (e.target.checked && errorMsg?.includes("Kullanım Koşulları")) {
                    setErrorMsg(null);
                  }
                }}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500 cursor-pointer shrink-0"
              />
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 leading-tight">
                Yüklediğim içeriğin <strong className="text-slate-800 dark:text-slate-100 font-bold">T.C. yasalarına, telif haklarına</strong> ve <strong className="text-slate-800 dark:text-slate-100 font-bold">topluluk kurallarına</strong> (+18 cinsel içerik barındırmayan) uygun olduğunu beyan eder, <span className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Kullanım Koşullarını</span> kabul ederim.
              </span>
            </label>
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
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
