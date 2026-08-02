import React from "react";
import { ShieldCheck, Lock, FileText, Sparkles, ArrowLeft, CheckCircle2, Server, Eye, Upload } from "lucide-react";
import { SiteConfig } from "../types";

interface PrivacyViewProps {
  onNavigateHome: () => void;
  siteConfig?: SiteConfig | null;
}

export default function PrivacyView({ onNavigateHome, siteConfig }: PrivacyViewProps) {
  const domain = siteConfig?.siteDomain || "resimresim.com";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8 animate-fade-in" id="privacy-page-container">
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
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                Resmi Kullanıcı Sözleşmesi
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                Gizlilik Politikası, KVKK & Kullanım Şartları
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

        {/* Highlight Banner */}
        <div className="p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 rounded-3xl text-white shadow-xl flex items-start gap-4">
          <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shrink-0">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight">
              256-Bit SSL Veri Güvenliği Standardı & Tam Gizlilik Güvencesi
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 mt-1 leading-relaxed">
              İnanResim ({domain}) üzerinde yüklenen tüm medya içerikleri ve kullanıcı verileri uçtan uca yüksek güvenlik protokolleri ile korunmaktadır.
            </p>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          
          {/* Section 1 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-3">
            <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-blue-500" />
              1. Veri Toplama, Saklama ve Kullanım Koşulları
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              İnanResim platformu, ziyaretçilerine ve üyelerine en hızlı resim barındırma hizmetini sunmayı amaçlar. Hizmet kalitemizi sürdürmek adına toplanan veriler şunlardır:
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 list-disc pl-5">
              <li><strong>Hesap Bilgileri:</strong> Üyelik oluştururken beyan ettiğiniz e-posta adresiniz ve kullanıcı adınız yalnızca oturum açma ve destek işlemlerinde kullanılır.</li>
              <li><strong>IP Adresleri & Trafik Logları:</strong> Anonim ziyaretçi yüklemelerinde siber saldırıları, bot kullanımını ve spam yüklemelerini önlemek adına IP adresleri 24 saatlik güvenlik loglarında muhafaza edilir.</li>
              <li><strong>EXIF Veri Temizliği:</strong> Fotoğraflarınız yüklenirken cihaz türü, çekim saati ve GPS konum verileri gizliliğinizi korumak amacıyla otomatik olarak temizlenir.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-3">
            <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              2. İçerik Sorumluluğu & T.C. Yasalarına Uygunluk
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Kullanıcılar İnanResim sunucularına yükledikleri tüm resim ve videoların hukuki sorumluluğunu bizzat üstlenir. Aşağıdaki içeriklerin yüklenmesi kesinlikle yasaktır:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/40 text-xs font-extrabold text-rose-900 dark:text-rose-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                Telif Hakkı İhlali Barındıran İçerikler
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/40 text-xs font-extrabold text-rose-900 dark:text-rose-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                Cinsel İstismar & +18 Aşırı Müstehcenlik
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/40 text-xs font-extrabold text-rose-900 dark:text-rose-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                Nefret Söylemi & Şiddet / Tehdit Materyali
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/40 text-xs font-extrabold text-rose-900 dark:text-rose-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                Zararlı Yazılım & Kimlik Avı (Phishing)
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 pt-2">
              Kurallara aykırı materyal tespit edildiğinde resmi makamların yasal talepleri doğrultusunda gerekli adli işlemler başlatılır.
            </p>
          </div>

          {/* Section 3 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-3">
            <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2.5">
              <Server className="w-5 h-5 text-purple-500" />
              3. Otomatik Silinme, Şifreleme ve Silme Bağlantıları
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Kullanıcılarımızın görsel kontrolü tamamen kendi ellerindedir:
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 list-disc pl-5">
              <li><strong>Silme Bağlantısı (Delete Token):</strong> Her yükleme sonrasında size özel üretilen benzersiz silme bağlantısı ile görselinizi dilediğiniz zaman tek tıkla yok edebilirsiniz.</li>
              <li><strong>Zamanlayıcı Silinme:</strong> Yükleme sırasında 1 saat, 1 gün veya 1 ay opsiyonlarını seçtiğinizde resminiz süresi dolduğunda disklerimizden kalıcı olarak temizlenir.</li>
              <li><strong>PRO VIP Saklama Garantisi:</strong> PRO VIP üyelerimizin içerikleri SÜRESİZ olarak muhafaza edilir.</li>
            </ul>
          </div>

          {/* Custom Admin Privacy Notice */}
          {siteConfig?.privacyPolicyText && (
            <div className="p-5 bg-blue-50 dark:bg-blue-950/30 rounded-3xl border border-blue-200 dark:border-blue-900/50 space-y-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <span className="font-extrabold text-blue-600 dark:text-blue-400 block uppercase tracking-wider">
                Yönetici Tarafından Eklenen Özel Şartlar:
              </span>
              <p>{siteConfig.privacyPolicyText}</p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
