import React, { useState } from "react";
import { AlertTriangle, Send, CheckCircle2, ArrowLeft, ShieldAlert, FileText, Upload } from "lucide-react";

interface AbuseReportViewProps {
  onNavigateHome: () => void;
}

export default function AbuseReportView({ onNavigateHome }: AbuseReportViewProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [reason, setReason] = useState("dmca");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim() || !email.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/report-abuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: imageUrl.trim(),
          reason,
          email: email.trim(),
          details: details.trim(),
        }),
      });
      if (res.ok) {
        setIsSubmitted(true);
      } else {
        alert("Bildirim gönderilirken bir hata oluştu. Lütfen tekrar deneyiniz.");
      }
    } catch (err) {
      alert("Bağlantı hatası. Lütfen internet bağlantınızı kontrol edip tekrar deneyiniz.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8 animate-fade-in" id="abuse-page-container">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="p-2.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all cursor-pointer flex items-center justify-center shadow-sm"
              title="Anasayfaya Dön"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800/40">
                DMCA & İhlal Bildirim Merkezi
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                Kötüye Kullanım & Telif Hakkı Bildir
              </h1>
            </div>
          </div>

          <button
            onClick={onNavigateHome}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>Anasayfaya Dön</span>
          </button>
        </div>

        {/* Informational Banner */}
        <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-3xl text-amber-900 dark:text-amber-200 flex items-start gap-3.5">
          <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm leading-relaxed space-y-1">
            <h3 className="font-extrabold text-amber-950 dark:text-amber-100">
              İnanResim Telif Hakkı & Güvenlik Politikası
            </h3>
            <p className="text-amber-800/90 dark:text-amber-200/80">
              Sitemizde telif hakkınızı ihlal eden, kişisel gizliliğe aykırı veya yasa dışı olan görselleri hızlıca bildirebilirsiniz. Güvenlik ve moderatör ekiplerimiz gelen bildirimleri 7/24 esasına göre 1 ila 12 saat içerisinde sonuçlandırır.
            </p>
          </div>
        </div>

        {/* Main Content Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl">
          {isSubmitted ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                İhbarınız Başarıyla Alındı!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Bildirdiğiniz görsel veya medya adresi inceleme sırasına alınmıştır. Hak ihlali tespiti durumunda içerik derhal erişime kapatılacaktır.
              </p>
              <div className="pt-4">
                <button
                  onClick={onNavigateHome}
                  className="px-6 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-extrabold text-xs rounded-2xl shadow-lg transition-all cursor-pointer"
                >
                  Anasayfaya Dön
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  İhlal Edilen Resim / Video Bağlantısı (URL) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://resimresim.com/i/ornek123"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    İhlal Kategorisi <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-rose-500 outline-none cursor-pointer"
                  >
                    <option value="dmca">Telif Hakkı İhlali (DMCA / Hak Sahibi)</option>
                    <option value="nsfw">+18 Müstehcen / Cinsel İçerik</option>
                    <option value="illegal">Yasa Dışı İçerik / Şiddet</option>
                    <option value="privacy">İzinsiz Fotoğraf / Kişisel Veri İhlali</option>
                    <option value="spam">Spam / Sahtekarlık</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    İletişim E-posta Adresiniz <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="hak-sahibi@ornek.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Açıklama / Beyan Detayları
                </label>
                <textarea
                  rows={4}
                  placeholder="Hak sahipliğinize ilişkin kısa bilgi veya ihlal detaylarını buraya ekleyebilirsiniz..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Gönderiliyor...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>İhbarı Gönder & Bildir</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
