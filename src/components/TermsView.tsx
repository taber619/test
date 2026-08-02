import React from "react";
import { ArrowLeft, FileText, Scale, ShieldAlert, CheckCircle, HelpCircle } from "lucide-react";
import { SiteConfig } from "../types";

interface TermsViewProps {
  onNavigateHome: () => void;
  siteConfig?: SiteConfig | null;
}

export default function TermsView({ onNavigateHome, siteConfig }: TermsViewProps) {
  const domain = siteConfig?.siteDomain || "resimresim.com";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8 animate-fade-in" id="terms-page-container">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={onNavigateHome}
            className="p-2.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all cursor-pointer flex items-center justify-center shadow-sm"
            title="Anasayfaya Dön"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800/40">
              Mevzuat & Sözleşme
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
              Kullanım Şartları ve Hizmet Standartları
            </h1>
          </div>
        </div>

        {/* Content Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl space-y-8 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/50 text-indigo-950 dark:text-indigo-200">
            <Scale className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <p className="text-xs font-semibold">
              Bu sitedeki tüm hizmetler, TC 5651 sayılı "İnternet Ortamında Yapılan Yayınların Düzenlenmesi" kanunu gereğince yer sağlayıcı kapsamında sunulmaktadır.
            </p>
          </div>

          {/* Section 1 */}
          <div className="space-y-3">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 font-bold text-xs flex items-center justify-center">1</span>
              Kabul Edilen İçerik Kuralları
            </h2>
            <p>
              {domain} platformunu kullanan tüm ziyaretçiler, yükledikleri her türlü görsel, grafik, hareketli GIF ve medya dosyasının telif haklarına ve yasal düzenlemelere uygun olduğunu taahhüt ederler.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-500 dark:text-slate-400">
              <li>Müstehcen, çocuk istismarı içeren veya illegal nitelikteki materyaller derhal silinir.</li>
              <li>Ayrımcı, nefret söylemi barındıran veya şiddet içeren görsellere izin verilmez.</li>
              <li>Telif hakkı sahibinin yazılı izni olmadan paylaşılan içerikler ihbar üzerine 24 saat içinde kaldırılır.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="space-y-3">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 font-bold text-xs flex items-center justify-center">2</span>
              Kullanıcı Sorumluluğu & Log Kayıtları
            </h2>
            <p>
              Kullanıcılar tarafından sunucuya yüklenen içeriklerin hukuki sorumluluğu tamamen yükleyen kişiye aittir. {domain} yönetimi, yasal makamlardan ve adli merciilerden gelen resmi talepler doğrultusunda kayıtlı IP ve tarih bilgisini paylaşmakla yükümlüdür.
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-3">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 font-bold text-xs flex items-center justify-center">3</span>
              Hizmet Kesintisi & Silinme Politikası
            </h2>
            <p>
              Sistemimiz ücretsiz sunulan görseller için maksimum erişilebilirlik sağlama amacındadır. Ancak mücbir sebepler, donanım arızaları veya yasal silme talepleri neticesinde görsellerin silinmesinden platform sorumlu tutulamaz. Kritik medyalarınız için yedek bulundurmanız önerilir.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-3">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 font-bold text-xs flex items-center justify-center">4</span>
              Telif Hakkı İhlali Bildirimi (DMCA)
            </h2>
            <p>
              Telif hakkı ihlali tespit ettiğiniz görseller için "Kötüye Kullanım Bildir" sayfamızı kullanarak içeriğin silinmesini talep edebilirsiniz. İncelemeler en geç 24 saat içinde tamamlanır.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
