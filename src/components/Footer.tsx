import React from "react";

interface FooterProps {
  onOpenAdsModal?: () => void;
}

export default function Footer({ onOpenAdsModal }: FooterProps) {
  const showTerms = (e: React.MouseEvent) => {
    e.preventDefault();
    alert("Kullanım Şartları:\n1. T.C. kanunlarına aykırı görseller yüklenemez.\n2. Telif hakkı ihlali barındıran içerikler silinir.");
  };

  const showPrivacy = (e: React.MouseEvent) => {
    e.preventDefault();
    alert("Gizlilik Politikası:\nResimlerinizi korumak bizim önceliğimizdir. Loglar 30 gün içinde anonimleştirilir.");
  };

  const showApiDocs = (e: React.MouseEvent) => {
    e.preventDefault();
    alert("API Dokümantasyonu:\nResimlerinizi programatik olarak yüklemek için API servisimiz yakında açılacaktır.");
  };

  return (
    <footer className="flex-none py-6 sm:h-14 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 gap-4" id="main-footer">
      <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2">
        <a href="#privacy" onClick={showPrivacy} className="hover:text-blue-600 transition-colors">Gizlilik Politikası</a>
        <a href="#rules" onClick={showTerms} className="hover:text-blue-600 transition-colors">Kullanım Şartları</a>
        <a href="mailto:destek@inanresim.com" className="hover:text-blue-600 transition-colors">İletişim</a>
        <a href="#api-doc" onClick={showApiDocs} className="hover:text-blue-600 transition-colors">API Dokümantasyonu</a>
        {onOpenAdsModal && (
          <button
            type="button"
            onClick={onOpenAdsModal}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-extrabold flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200/50 dark:border-amber-900/30 transition-all cursor-pointer"
          >
            📢 Sitemize Reklam Verin
          </button>
        )}
      </div>
      <div className="text-center sm:text-right">
        © 2026 <span className="font-bold text-slate-700 dark:text-slate-300">İnanResim</span>. Tüm hakları saklıdır.
      </div>
    </footer>
  );
}
