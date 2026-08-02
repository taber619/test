import React from "react";
import { ActiveTab, SiteConfig } from "../types";

interface FooterProps {
  onOpenAdsModal?: () => void;
  onNavigateTab?: (tab: ActiveTab) => void;
  onOpenInfoModal?: (modal: "faq" | "privacy" | "abuse" | "contact") => void;
  siteConfig?: SiteConfig | null;
}

export default function Footer({ onOpenAdsModal, onNavigateTab, onOpenInfoModal, siteConfig }: FooterProps) {
  const domain = siteConfig?.siteDomain || "resimresim.com";
  const name = siteConfig?.siteName || "resimresim.com";

  const showPrivacy = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigateTab) {
      onNavigateTab("privacy");
    } else if (onOpenInfoModal) {
      onOpenInfoModal("privacy");
    }
  };

  const showFaq = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigateTab) {
      onNavigateTab("faq");
    } else if (onOpenInfoModal) {
      onOpenInfoModal("faq");
    }
  };

  const showContact = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigateTab) {
      onNavigateTab("contact");
    } else if (onOpenInfoModal) {
      onOpenInfoModal("contact");
    }
  };

  const showApiDocs = (e: React.MouseEvent) => {
    e.preventDefault();
    alert("API Dokümantasyonu:\nResimlerinizi programatik olarak yüklemek için API servisimiz yakında açılacaktır.");
  };

  return (
    <footer className="flex-none py-6 sm:h-14 bg-slate-900 border-t border-slate-800 px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between text-xs font-medium text-slate-400 gap-4" id="main-footer">
      <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2">
        <button type="button" onClick={showPrivacy} className="hover:text-blue-400 transition-colors cursor-pointer">
          Gizlilik & Kullanım Şartları
        </button>
        <button type="button" onClick={showFaq} className="hover:text-blue-400 transition-colors cursor-pointer">
          Yardım (SSS)
        </button>
        <button type="button" onClick={showContact} className="hover:text-blue-400 transition-colors cursor-pointer">
          İletişim & Destek ({domain})
        </button>
        <a href="#api-doc" onClick={showApiDocs} className="hover:text-blue-400 transition-colors">
          API Dokümantasyonu
        </a>
        {onOpenAdsModal && (
          <button
            type="button"
            onClick={onOpenAdsModal}
            className="text-amber-400 hover:text-amber-300 font-extrabold flex items-center gap-1 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-900/30 transition-all cursor-pointer"
          >
            📢 Sitemize Reklam Verin
          </button>
        )}
      </div>
      <div className="text-center sm:text-right">
        © 2026 <span className="font-bold text-slate-300">{name}</span>. Tüm hakları saklıdır.
      </div>
    </footer>
  );
}

