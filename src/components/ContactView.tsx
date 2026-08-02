import React, { useState } from "react";
import { Mail, MessageSquare, Send, CheckCircle2, ArrowLeft, Clock, ShieldCheck, Upload, HelpCircle } from "lucide-react";
import { SiteConfig } from "../types";

interface ContactViewProps {
  onNavigateHome: () => void;
  siteConfig?: SiteConfig | null;
}

export default function ContactView({ onNavigateHome, siteConfig }: ContactViewProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("Genel Sorular / Destek");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const domain = siteConfig?.siteDomain || "resimresim.com";
  const supportEmail = siteConfig?.supportEmail || `destek@${domain}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/contact-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject,
          message: message.trim(),
        }),
      });
      if (res.ok) {
        setIsSubmitted(true);
      } else {
        alert("Mesajınız gönderilirken bir hata oluştu. Lütfen doğrudan e-posta ile ulaşın.");
      }
    } catch (err) {
      alert("Bağlantı hatası. Lütfen internetinizi kontrol edip tekrar deneyiniz.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8 animate-fade-in" id="contact-page-container">
      <div className="max-w-4xl mx-auto space-y-8">
        
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
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800/40">
                7/24 Kesintisiz Destek
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                İletişim & Müşteri Destek Merkezi
              </h1>
            </div>
          </div>

          <button
            onClick={onNavigateHome}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>Resim Yükle</span>
          </button>
        </div>

        {/* Info Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm flex items-center gap-3.5">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Destek E-Posta</span>
              <a href={`mailto:${supportEmail}`} className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400 hover:underline">
                {supportEmail}
              </a>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm flex items-center gap-3.5">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Yanıt Süresi</span>
              <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">
                15 Dk - 2 Saat
              </span>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm flex items-center gap-3.5">
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Destek Hizmeti</span>
              <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">
                7 Gün 24 Saat Aktif
              </span>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl">
          {isSubmitted ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Mesajınız Gönderildi!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Bizimle iletişime geçtiğiniz için teşekkür ederiz. Destek temsilcilerimiz kısa süre içerisinde belirteceğiniz e-posta adresine yanıt iletecektir.
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Adınız / Soyadınız <span className="text-blue-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Adınız"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    E-posta Adresiniz <span className="text-blue-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ornek@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Destek Konusu
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value="Genel Sorular / Destek">Genel Sorular / Destek</option>
                  <option value="PRO VIP Üyelik Destek">PRO VIP Üyelik Destek</option>
                  <option value="Reklam & İş Birliği">Reklam & İş Birliği</option>
                  <option value="Teknik Sorun Bildirimi">Teknik Sorun Bildirimi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mesajınız <span className="text-blue-500">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Sorunuzu, önerinizi veya talebinizi detaylı bir şekilde yazabilirsiniz..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Gönderiliyor...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Mesajı Gönder</span>
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
