import React, { useState } from "react";
import { 
  X, 
  HelpCircle, 
  ShieldCheck, 
  AlertTriangle, 
  Mail, 
  Send, 
  CheckCircle2, 
  Lock, 
  FileText,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import FaqSection from "./FaqSection";
import { SiteConfig } from "../types";

interface InfoModalsProps {
  activeModal: "faq" | "privacy" | "abuse" | "contact" | null;
  onClose: () => void;
  siteConfig?: SiteConfig | null;
  onOpenAuth?: () => void;
  onOpenVipModal?: () => void;
}

export default function InfoModals({
  activeModal,
  onClose,
  siteConfig,
  onOpenAuth,
  onOpenVipModal,
}: InfoModalsProps) {
  const [abuseImageUrl, setAbuseImageUrl] = useState("");
  const [abuseReason, setAbuseReason] = useState("dmca");
  const [abuseEmail, setAbuseEmail] = useState("");
  const [abuseDetails, setAbuseDetails] = useState("");
  const [abuseSubmitting, setAbuseSubmitting] = useState(false);
  const [abuseSubmitted, setAbuseSubmitted] = useState(false);

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactSubject, setContactSubject] = useState("Genel Sorular / Destek");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  if (!activeModal) return null;

  const domain = siteConfig?.siteDomain || "resimresim.com";
  const supportEmail = siteConfig?.supportEmail || `destek@${domain}`;

  const handleAbuseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!abuseImageUrl.trim() || !abuseEmail.trim()) return;

    setAbuseSubmitting(true);
    try {
      const res = await fetch("/api/report-abuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: abuseImageUrl,
          reason: abuseReason,
          email: abuseEmail,
          details: abuseDetails,
        }),
      });
      if (res.ok) {
        setAbuseSubmitted(true);
      } else {
        alert("Bildirim gönderilirken bir hata oluştu. Lütfen doğrudan e-posta ile iletiniz.");
      }
    } catch (err) {
      alert("Bağlantı hatası. Lütfen tekrar deneyiniz.");
    } finally {
      setAbuseSubmitting(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) return;

    setContactSubmitting(true);
    try {
      const res = await fetch("/api/contact-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          subject: contactSubject,
          message: contactMessage,
        }),
      });
      if (res.ok) {
        setContactSubmitted(true);
      } else {
        alert("Mesajınız gönderilirken bir hata oluştu. Lütfen e-posta ile ulaşın.");
      }
    } catch (err) {
      alert("Bağlantı hatası. Lütfen tekrar deneyiniz.");
    } finally {
      setContactSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative animate-scale-up my-auto">
        
        {/* Modal Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            {activeModal === "faq" && (
              <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
                <HelpCircle className="w-5 h-5" />
              </div>
            )}
            {activeModal === "privacy" && (
              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
            )}
            {activeModal === "abuse" && (
              <div className="p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}
            {activeModal === "contact" && (
              <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                <Mail className="w-5 h-5" />
              </div>
            )}

            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                {activeModal === "faq" && "Yardım & Sıkça Sorulan Sorular"}
                {activeModal === "privacy" && "Gizlilik Sözleşmesi & Kullanım Şartları"}
                {activeModal === "abuse" && "Kötüye Kullanım Bildir (DMCA / İhlal)"}
                {activeModal === "contact" && "İletişim & Destek Merkezi"}
              </h3>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {activeModal === "faq" && "Merak ettiğiniz tüm konular ve hızlı çözümler"}
                {activeModal === "privacy" && "Veri güvenliği, KVKK ve çerez politikalarımız"}
                {activeModal === "abuse" && "Telif hakkı veya uygunsuz içerik ihbar paneli"}
                {activeModal === "contact" && "Bizimle 7/24 doğrudan iletişime geçin"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 scrollbar-thin space-y-6">
          
          {/* 1. FAQ MODAL CONTENT */}
          {activeModal === "faq" && (
            <div>
              <FaqSection
                onOpenAuth={() => {
                  onClose();
                  onOpenAuth?.();
                }}
                onOpenVipModal={() => {
                  onClose();
                  onOpenVipModal?.();
                }}
              />
            </div>
          )}

          {/* 2. PRIVACY MODAL CONTENT */}
          {activeModal === "privacy" && (
            <div className="space-y-5 text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-emerald-950 dark:text-emerald-300 text-sm">256-Bit SSL Veri Güvenliği Standardı</h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-400/90 mt-1">
                    Yüklediğiniz tüm resimler, videolar ve bağlantılarınız uçtan uca şifreli sunucu altyapımızda güvenle saklanır.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/40">
                  <h4 className="font-black text-slate-900 dark:text-white text-sm mb-1.5 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" /> 1. Veri Toplama ve Kullanımı
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Sitemizde hesap açarken verdiğiniz e-posta ve kullanıcı adınız dışındaki kişisel verileriniz asla 3. şahıs veya kurumlarla paylaşılmaz. Misafir yüklemelerinde IP adresleri yalnızca spam ve bot koruması (24 saatlik log) amacıyla tutulur.
                  </p>
                </div>

                <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/40">
                  <h4 className="font-black text-slate-900 dark:text-white text-sm mb-1.5 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> 2. Görsel Hakları ve İçerik Sorumluluğu
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Kullanıcılar yükledikleri tüm medyalardan hukuki olarak bizzat sorumludur. T.C. yasalarına aykırı, pornografik, cinsel istismar, telif ihlali veya şiddet barındıran görseller sistem tarafından anında silinir ve ilgili kurumlarla paylaşılabilir.
                  </p>
                </div>

                <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/40">
                  <h4 className="font-black text-slate-900 dark:text-white text-sm mb-1.5 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" /> 3. Çerezler (Cookies)
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Oturumunuzun açık kalması ve tema tercihlerinizin hatırlanması için tarayıcınızda minimum düzeyde yerel çerezler kullanılır. Reklam hedeflemesi veya izinsiz takip yapılmaz.
                  </p>
                </div>
              </div>

              {siteConfig?.privacyPolicyText && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/50 text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-bold block mb-1">Yönetici Özel Beyanı:</span>
                  {siteConfig.privacyPolicyText}
                </div>
              )}
            </div>
          )}

          {/* 3. ABUSE / DMCA REPORT MODAL CONTENT */}
          {activeModal === "abuse" && (
            <div>
              {abuseSubmitted ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-black text-lg text-slate-900 dark:text-white">İhbarınız Alındı!</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    Bildirdiğiniz bağlantı güvenlik ekiplerimiz ve modaratörlerimiz tarafından derhal incelemeye alınmıştır. Gerekli görüldüğü takdirde 24 saat içinde içerik kaldırılacaktır.
                  </p>
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-extrabold text-xs rounded-xl mt-4 cursor-pointer"
                  >
                    Pencereyi Kapat
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAbuseSubmit} className="space-y-4">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      Telif hakkı ihlali (DMCA), kişisel veri ihlali veya yasaya aykırı içerikleri buradan bildirebilirsiniz. Moderatörlerimiz 7/24 inceleme yapmaktadır.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      İhlal Edilen Resim / Video URL'si <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: https://resimresim.com/i/abc123xy"
                      value={abuseImageUrl}
                      onChange={(e) => setAbuseImageUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        İhlal Türü <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={abuseReason}
                        onChange={(e) => setAbuseReason(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                      >
                        <option value="dmca">Telif Hakkı İhlali (DMCA)</option>
                        <option value="nsfw">+18 Cinsel / Müstehcen İçerik</option>
                        <option value="illegal">Yasa Dışı / Şiddet İçeriği</option>
                        <option value="privacy">İzinsiz Kişisel Fotoğraf / İhlal</option>
                        <option value="spam">Spam / Sahtekarlık</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        E-posta Adresiniz <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="ornek@mail.com"
                        value={abuseEmail}
                        onChange={(e) => setAbuseEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Açıklama / Detaylar
                    </label>
                    <textarea
                      rows={3}
                      placeholder="İhlal ile ilgili ek açıklamanızı buraya yazabilirsiniz..."
                      value={abuseDetails}
                      onChange={(e) => setAbuseDetails(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={abuseSubmitting}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {abuseSubmitting ? (
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
          )}

          {/* 4. CONTACT MODAL CONTENT */}
          {activeModal === "contact" && (
            <div>
              {contactSubmitted ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-black text-lg text-slate-900 dark:text-white">Mesajınız Alındı!</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    Bizimle iletişime geçtiğiniz için teşekkür ederiz. Destek ekibimiz en kısa sürede e-posta adresinize geri dönüş yapacaktır.
                  </p>
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-extrabold text-xs rounded-xl mt-4 cursor-pointer"
                  >
                    Pencereyi Kapat
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center gap-3">
                      <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-extrabold block">Resmi Destek E-Posta</span>
                        <a href={`mailto:${supportEmail}`} className="text-xs font-black text-blue-600 dark:text-blue-400 hover:underline">
                          {supportEmail}
                        </a>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-extrabold block">Ortalama Yanıt Süresi</span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                          15 Dakika - 2 Saat
                        </span>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleContactSubmit} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Adınız / Kullanıcı Adınız <span className="text-blue-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Adınız"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          E-posta Adresiniz <span className="text-blue-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="ornek@mail.com"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Konu
                      </label>
                      <select
                        value={contactSubject}
                        onChange={(e) => setContactSubject(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="Genel Sorular / Destek">Genel Sorular / Destek</option>
                        <option value="VIP Üyelik Destek">PRO VIP Üyelik Destek</option>
                        <option value="Reklam & İş Birliği">Reklam & İş Birliği</option>
                        <option value="Teknik Sorun Bildirimi">Teknik Sorun Bildirimi</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Mesajınız <span className="text-blue-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        required
                        placeholder="Sorunuzu veya talebinizi detaylı olarak yazın..."
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      disabled={contactSubmitting}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {contactSubmitting ? (
                        <span>Gönderiliyor...</span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Mesajı Gönder</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
