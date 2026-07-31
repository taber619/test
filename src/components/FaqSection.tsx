import React, { useState } from "react";
import { ChevronDown, HelpCircle, Sparkles, ShieldCheck, Zap, UserCheck, Lock, Search } from "lucide-react";

interface FaqItem {
  id: string;
  question: string;
  answer: React.ReactNode;
  category: "genel" | "yukleme" | "membership" | "gizlilik";
  badge?: string;
  icon: React.ReactNode;
}

interface FaqSectionProps {
  onOpenAuth?: () => void;
  onOpenVipModal?: () => void;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ onOpenAuth, onOpenVipModal }) => {
  const [openId, setOpenId] = useState<string | null>("resimler-ne-kadar-kalir");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const faqList: FaqItem[] = [
    {
      id: "resimler-ne-kadar-kalir",
      question: "Resimlerim ne kadar süre kalır?",
      category: "yukleme",
      badge: "Süre & Saklama",
      icon: <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      answer: (
        <div className="space-y-3 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
          <p>
            İnanResim'de görsellerinizin saklanma süresi yükleme tercihlerinize ve üyelik tipinize göre belirlenir:
          </p>
          <ul className="space-y-2 list-none pl-0">
            <li className="flex items-start gap-2 bg-slate-50 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <span className="font-extrabold text-blue-600 dark:text-blue-400 shrink-0">Ziyaretçiler:</span>
              <span>Yükleme sırasında dilerseniz 1 saat, 1 gün, 1 hafta veya 1 ay gibi otomatik silinme süreleri seçebilirsiniz. Varsayılan yüklemeler düzenli aktivite kaldıkça muhafaza edilir.</span>
            </li>
            <li className="flex items-start gap-2 bg-slate-50 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <span className="font-extrabold text-amber-600 dark:text-amber-400 shrink-0">Ücretsiz Üyeler:</span>
              <span>Kayıtlı üyelerimizin yüklediği görseller hesapları aktif olduğu sürece güvenli sunucularımızda saklanır. Galerim panelinden istediğiniz an kendiniz silebilirsiniz.</span>
            </li>
            <li className="flex items-start gap-2 bg-purple-50 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-200 dark:border-purple-800/50 text-purple-950 dark:text-purple-200">
              <span className="font-extrabold text-purple-600 dark:text-purple-400 shrink-0">PRO VIP Üyeler:</span>
              <span>PRO VIP üyelerimizin yüklediği tüm dosya, resim ve videolar <strong>SÜRESİZ ve KALICI</strong> olarak depolanır. Hiçbir zaman silinme riski taşımaz.</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "uye-olmanin-avantaji-nedir",
      question: "Üye olmanın avantajı nedir?",
      category: "membership",
      badge: "Ücretsiz Avantaj",
      icon: <UserCheck className="w-5 h-5 text-amber-500" />,
      answer: (
        <div className="space-y-3 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
          <p>
            İnanResim'e üye olmak <strong>%100 ücretsizdir</strong> ve sadece birkaç saniyenizi alır. Üye olduğunuzda kazandığınız başlıca ayrıcalıklar:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-2">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/40">
              <div className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                1 GB (1000 MB) Yükleme Limiti
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ziyaretçi limiti 100 MB iken üyeler tek seferde 1 GB dosya yükleyebilir.</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40">
              <div className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                "Galerim" Yönetim Paneli
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Tüm görsellerinizi tek ekranda inceleyebilir, toplu kopyalayabilir veya silebilirsiniz.</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-900/40">
              <div className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-500" />
                Şifreli Koruma & İstatistik
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Görsellerinize parola koyabilir, görüntülenme sayılarını anlık takip edebilirsiniz.</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
              <div className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                Toplu Paylaşım Kodları
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">BBCode, HTML ve Markdown linklerini topluca dışa aktarabilirsiniz.</p>
            </div>
          </div>
          {onOpenAuth && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenAuth}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Hemen Ücretsiz Kayıt Ol
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "pro-vip-nedir",
      question: "PRO VIP üyelik nedir ve ne sunar?",
      category: "membership",
      badge: "VIP Paket",
      icon: <Sparkles className="w-5 h-5 text-purple-500" />,
      answer: (
        <div className="space-y-3 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
          <p>
            PRO VIP üyelik, yüksek hacimli içerik üretenler, forum yöneticileri ve işletmeler için tasarlanmış premium pakettir.
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li>Tek seferde <strong>5 GB (5000 MB)</strong> transfer kapasitesi.</li>
            <li>Görseller için <strong>Süresiz & Kalıcı Depolama</strong> garantisi.</li>
            <li>Görsellerin üzerine özel filigran (Watermark) ve logo ekleme seçeneği.</li>
            <li>VIP sunucu altyapısı ile maksimum indirme ve görüntüleme hızı.</li>
            <li>Reklamsız ve engelsiz doğrudan erişim imkanı.</li>
          </ul>
          {onOpenVipModal && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenVipModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
              >
                PRO VIP Paketleri İncele
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "hangi-formatlar-destekleniyor",
      question: "Hangi dosya formatlarını ve videoları yükleyebilirim?",
      category: "yukleme",
      badge: "Desteklenen Türler",
      icon: <Zap className="w-5 h-5 text-emerald-500" />,
      answer: (
        <div className="space-y-2 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
          <p>
            İnanResim güncel tüm popüler medya formatlarını destekler:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {["JPG", "JPEG", "PNG", "GIF (Hareketli)", "WEBP", "SVG", "BMP", "HEIC", "MP4 Video", "WEBM Video", "MOV Video"].map((fmt) => (
              <span key={fmt} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-lg border border-slate-200 dark:border-slate-700">
                {fmt}
              </span>
            ))}
          </div>
          <p className="pt-2 text-xs text-slate-500 dark:text-slate-400">
            Ayrıca yükleme yapmadan önce entegre Resim Düzenleyici aracımız ile fotoğraflarınızı kırpabilir, döndürebilir ve filtreler uygulayabilirsiniz.
          </p>
        </div>
      ),
    },
    {
      id: "gizlilik-ve-guvenlik",
      question: "Yüklediğim resimlerin gizliliği ve güvenliği nasıl sağlanır?",
      category: "gizlilik",
      badge: "Güvenlik & SSL",
      icon: <Lock className="w-5 h-5 text-indigo-500" />,
      answer: (
        <div className="space-y-2 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
          <p>
            Gizliliğiniz bizim için birinci önceliktir:
          </p>
          <ul className="space-y-1.5 list-disc pl-5 text-xs sm:text-sm">
            <li>Tüm bağlantılar <strong>SSL 256-bit uçtan uca şifreleme</strong> ile korunur.</li>
            <li>Görsellerinize özel şifre (parola) koyabilir, sadece şifreyi bildirdiğiniz kişilerin görmesini sağlayabilirsiniz.</li>
            <li>Yükleme sonrasında size özel tanımlanan <strong>Silme Bağlantısı (Delete Token)</strong> ile resmi dilediğiniz an tek tıkla silebilirsiniz.</li>
            <li>Kişisel verileriniz hiçbir üçüncü taraf kurum veya reklam mecrasıyla paylaşılmaz.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "paylasim-kodlari-nasil-kullanilir",
      question: "Görselleri forumlarda ve sitelerde nasıl paylaşabilirim?",
      category: "genel",
      badge: "Kodlar & Paylaşım",
      icon: <ShieldCheck className="w-5 h-5 text-blue-500" />,
      answer: (
        <div className="space-y-2 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
          <p>
            Yükleme tamamlandıktan hemen sonra platform size otomatik olarak şu hazır formatları sunar:
          </p>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
              <strong className="text-slate-900 dark:text-white">Direkt Bağlantı (Direct Link):</strong> Doğrudan ham resim dosyasına erişim sağlar.
            </div>
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
              <strong className="text-slate-900 dark:text-white">BBCode (Forum Kodu):</strong> XenForo, vBulletin, phpBB vb. forumlarda önizlemeli resim paylaşmak için idealdir.
            </div>
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
              <strong className="text-slate-900 dark:text-white">HTML Kodu:</strong> Web sitelerinize veya blog gönderilerinize gömmek için kullanılır.
            </div>
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
              <strong className="text-slate-900 dark:text-white">Markdown:</strong> GitHub, Discord, Reddit ve Notion belgelendirmelerinde kullanıma uygundur.
            </div>
          </div>
        </div>
      ),
    },
  ];

  const filteredFaqs = faqList.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === "" ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.badge?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleAccordion = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="py-16 sm:py-20 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/80" id="sss-section">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/60 px-3.5 py-1.5 rounded-full border border-blue-100 dark:border-blue-900/40 inline-flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            Sıkça Sorulan Sorular
          </span>
          <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white mt-3.5 tracking-tight leading-snug">
            Aklınıza Takılan Her Şeyi Yanıtladık (SSS)
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-2 max-w-xl mx-auto leading-relaxed">
            İnanResim yükleme süreleri, üyelik ayrıcalıkları ve güvenlik önlemleri hakkında merak ettiğiniz tüm detaylar aşağıdadır.
          </p>

          {/* Search bar & Category filters */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Soru veya konu ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto justify-center">
              {[
                { id: "all", label: "Tümü" },
                { id: "yukleme", label: "Yükleme & Süre" },
                { id: "membership", label: "Üyelik & VIP" },
                { id: "gizlilik", label: "Gizlilik" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Accordion Container */}
        <div className="space-y-3">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => {
              const isOpen = openId === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? "bg-slate-50/80 dark:bg-slate-900/90 border-blue-300 dark:border-blue-700/60 shadow-md ring-1 ring-blue-500/10"
                      : "bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(faq.id)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left gap-4 cursor-pointer focus:outline-none group"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 group-hover:scale-105 transition-transform">
                        {faq.icon}
                      </div>
                      <div className="min-w-0">
                        {faq.badge && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-0.5 block">
                            {faq.badge}
                          </span>
                        )}
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-snug">
                          {faq.question}
                        </h3>
                      </div>
                    </div>

                    <div
                      className={`w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center shrink-0 transition-transform duration-300 ${
                        isOpen ? "rotate-180 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400" : "text-slate-400"
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  {/* Accordion Content Panel */}
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 animate-fade-in">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <HelpCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600 dark:text-slate-400 text-sm font-bold">Aramanıza uygun soru bulunamadı.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Filtreleri Temizle
              </button>
            </div>
          )}
        </div>

        {/* Footer Support Prompt */}
        <div className="mt-10 p-5 rounded-2xl bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Başka bir sorunuz mu var?</h4>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Canlı sohbet odamızdan veya destek ekibimizden anında yardım alabilirsiniz.</p>
          </div>
          <a
            href="#chat-toggle"
            onClick={(e) => {
              e.preventDefault();
              const chatBtn = document.getElementById("chat-toggle-btn");
              if (chatBtn) chatBtn.click();
            }}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs rounded-xl hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
          >
            Canlı Desteğe Sor
          </a>
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
