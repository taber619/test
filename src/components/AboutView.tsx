import React from "react";
import { ArrowLeft, Server, ShieldCheck, Zap, Globe, Cpu, CloudLightning, Lock, CheckCircle2, HeartHandshake } from "lucide-react";
import { SiteConfig } from "../types";

interface AboutViewProps {
  onNavigateHome: () => void;
  siteConfig?: SiteConfig | null;
}

export default function AboutView({ onNavigateHome, siteConfig }: AboutViewProps) {
  const domain = siteConfig?.siteDomain || "resimresim.com";
  const name = siteConfig?.siteName || "İnanResim.com";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8 animate-fade-in" id="about-page-container">
      <div className="max-w-4xl mx-auto space-y-10">
        
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
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
              Kurumsal & Altyapı
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
              Hakkımızda & Platform Mimarisi
            </h1>
          </div>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold border border-white/20">
            <Globe className="w-3.5 h-3.5 text-cyan-300" />
            <span>Türkiye'nin Yüksek Hızlı Resim & Medya Barındırma Ağı</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black leading-tight">
            {name} — Sınırsız, Reklamsız ve Ultra Hızlı Görsel Servisi
          </h2>
          <p className="text-sm text-blue-100 leading-relaxed max-w-2xl">
            2026 yılında geliştirilen {domain}, internet kullanıcılarının, forum sahiplerinin ve geliştiricilerin görsel, GIF ve medya dosyalarını tek tıkla yüksek kalitede yükleyip güvenle paylaşmasını sağlayan modern bir bulut medya platformudur.
          </p>
        </div>

        {/* System Specs & Capabilities */}
        <div className="space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-500" />
            Sistem Altyapısı & Sunucu Performansı
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
              <div className="w-10 h-10 bg-cyan-500/10 text-cyan-500 rounded-2xl flex items-center justify-center">
                <CloudLightning className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Global CDN & NVMe Barındırma</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Görselleriniz enterprise NVMe SSD sürücüler üzerinde saklanır ve dünya genelindeki 120+ CDN lokasyonundan anında ziyaretçilerinize sunulur.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Otomatik EXIF & GPS Temizliği</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Yüklediğiniz fotoğraflardaki çekim yeri, cihaz modeli ve kişisel veri içeren EXIF meta bilgileri otomatik olarak temizlenerek gizliliğiniz %100 güvenceye alınır.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
              <div className="w-10 h-10 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">256-Bit SSL & DDoS Koruması</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tüm veri transferi endüstri standardı TLS 1.3 ve 256-Bit SSL şifreleme ile korunur. Sunucularımız 2 Tbit/s DDoS filtreleme kapasitesine sahiptir.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">%99.99 Erişilebilirlik (Uptime)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Yedekli sunucu mimarimiz ve kesintisiz güç kaynaklarımız sayesinde yüklediğiniz resimler yıllar boyunca hiçbir kırık link yaşanmadan aktif kalır.
              </p>
            </div>
          </div>
        </div>

        {/* Guarantees */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
          <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-rose-500" />
            Kullanıcı Taahhütlerimiz
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Fotoğraflarınız asla kalitesizleştirilerek sıkıştırılmaz.</span>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Gizli yüklemeler arama motorları tarafından indekslenmez.</span>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Forumlar için doğrudan BBCode ve HTML kodları hazır sunulur.</span>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">7/24 otomatik zararlı içerik ve spam filtreleme taraması yapılır.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
