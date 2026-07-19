import React from "react";

export default function Footer() {
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
    <footer className="flex-none py-6 sm:h-14 bg-white border-t border-slate-200 px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between text-xs font-medium text-slate-500 gap-4" id="main-footer">
      <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2">
        <a href="#privacy" onClick={showPrivacy} className="hover:text-blue-600 transition-colors">Gizlilik Politikası</a>
        <a href="#rules" onClick={showTerms} className="hover:text-blue-600 transition-colors">Kullanım Şartları</a>
        <a href="mailto:destek@inanresim.com" className="hover:text-blue-600 transition-colors">İletişim</a>
        <a href="#api-doc" onClick={showApiDocs} className="hover:text-blue-600 transition-colors">API Dokümantasyonu</a>
      </div>
      <div className="text-center sm:text-right">
        © 2026 <span className="font-bold text-slate-700">İnanResim</span>. Tüm hakları saklıdır.
      </div>
    </footer>
  );
}
