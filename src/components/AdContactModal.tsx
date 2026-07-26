import React, { useState } from "react";
import { Megaphone, Mail, Send, X, CheckCircle2, MessageSquare, DollarSign } from "lucide-react";
import { SiteConfig } from "../types";

interface AdContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteConfig?: SiteConfig;
}

export default function AdContactModal({ isOpen, onClose, siteConfig }: AdContactModalProps) {
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderMessage, setSenderMessage] = useState("");
  const [sentSuccess, setSentSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderEmail || !senderMessage) return;
    setIsSending(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/ad-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName,
          senderEmail,
          senderMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || "Reklam talebiniz gönderilemedi. Lütfen tekrar deneyin.");
        setIsSending(false);
        return;
      }

      setIsSending(false);
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        setSenderName("");
        setSenderEmail("");
        setSenderMessage("");
        onClose();
      }, 3000);
    } catch (err) {
      console.error("Ad contact submit error:", err);
      setErrorMsg("Ağ hatası oluştu. Lütfen tekrar deneyin.");
      setIsSending(false);
    }
  };

  const email = siteConfig?.adsContactEmail || "reklam@inanresim.com";
  const telegram = siteConfig?.adsContactTelegram || "@inanresim_reklam";
  const infoText = siteConfig?.adsContactInfo || "Sitemizde günlük binlerce tekil ziyaretçiye ulaşan banner ve özel sponsorluk fırsatları için bizimle iletişime geçin.";

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" id="ad-contact-modal">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-6 animate-scale-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-0.5 rounded-full">
              Sponsorluk & Yayıncılık
            </span>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight mt-0.5">
              Sitemize Reklam Verin
            </h3>
          </div>
        </div>

        {/* Description & Contact Badges */}
        <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {infoText}
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            {email && (
              <a
                href={`mailto:${email}`}
                className="flex-1 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-2 hover:border-blue-500 transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">E-Posta İletişim</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate block group-hover:text-blue-600">
                    {email}
                  </span>
                </div>
              </a>
            )}

            {telegram && (
              <a
                href={telegram.startsWith("http") ? telegram : `https://t.me/${telegram.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-2 hover:border-indigo-500 transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Telegram / Destek</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate block group-hover:text-indigo-600">
                    {telegram}
                  </span>
                </div>
              </a>
            )}
          </div>
        </div>

        {/* Form or Success State */}
        {sentSuccess ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-5 rounded-2xl text-center space-y-2 animate-fade-in">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h4 className="font-extrabold text-xs text-emerald-900 dark:text-emerald-200 uppercase tracking-wide">
              Reklam Talebiniz İletildi!
            </h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              İletişim bilgileriniz yönetici ekibimize iletildi. En kısa sürede sizinle iletişime geçilecektir.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl border border-red-200 dark:border-red-800">
                {errorMsg}
              </div>
            )}
            <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Hızlı Reklam Başvuru Formu
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Adınız / Kurum İsmi</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz veya Şirket A.Ş."
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">E-Posta Adresiniz</label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="ornek@sirket.com"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Reklam Detayı / Talebiniz</label>
              <textarea
                rows={3}
                value={senderMessage}
                onChange={(e) => setSenderMessage(e.target.value)}
                placeholder="Hangi banner alanıyla ilgilendiğinizi veya özel reklam talebinizi yazabilirsiniz..."
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {isSending ? "Gönderiliyor..." : "Reklam Talebini İlet"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
