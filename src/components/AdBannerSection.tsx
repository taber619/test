import React from "react";
import { Info, ExternalLink, Tag, Sparkles, MoreVertical, ShoppingBag } from "lucide-react";
import { AdBanner } from "../types";

interface AdBannerSectionProps {
  adsList?: AdBanner[];
  adsEnabled?: boolean;
  position: "home-cards" | "home-bottom" | "header" | "footer" | "image-page" | "sidebar";
  onOpenContactModal?: () => void;
  className?: string;
}

export default function AdBannerSection({
  adsList,
  adsEnabled = true,
  position,
  onOpenContactModal,
  className = ""
}: AdBannerSectionProps) {
  if (!adsEnabled || !adsList) return null;

  const activeAds = adsList.filter(ad => ad.enabled && ad.position === position);
  if (activeAds.length === 0) return null;

  // --- HOME CARDS DISPLAY (CS:GO Skin / Product Showcase format) ---
  if (position === "home-cards") {
    return (
      <div className={`w-full max-w-6xl mx-auto my-6 px-4 ${className}`}>
        {/* Section Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                Sponsorlu Ürünler & Fırsatlar
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  REKLAM
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Özel indirimler, oyun skinleri ve sponsorlu mağaza vitrini
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenContactModal && (
              <button
                type="button"
                onClick={onOpenContactModal}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                <span>Buraya Reklam Ver</span>
              </button>
            )}
            <div className="flex items-center text-slate-400 text-xs gap-1" title="Sponsorlu İletim">
              <Info className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Product / Skin Cards Grid (Reference Image Style!) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {activeAds.map((ad) => (
            <div
              key={ad.id}
              className="group relative bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col justify-between overflow-hidden"
            >
              {/* Badge & Options Row */}
              <div className="flex items-start justify-between gap-1 z-10 mb-2">
                {ad.badgeText ? (
                  <span className="inline-block px-2 py-0.5 text-[10px] font-black tracking-wider uppercase bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-800 dark:border-slate-200 rounded-md shadow-2xs font-mono">
                    {ad.badgeText}
                  </span>
                ) : (
                  <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-md">
                    SPONSOR
                  </span>
                )}

                <div className="flex items-center text-slate-300 dark:text-slate-600 group-hover:text-slate-500 transition-colors">
                  <Info className="w-3.5 h-3.5 mr-1" />
                  <MoreVertical className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Product Image */}
              <div className="relative w-full h-32 flex items-center justify-center py-2 px-1">
                {ad.imageUrl ? (
                  <img
                    src={ad.imageUrl}
                    alt={ad.title}
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-center text-slate-400">
                    <ShoppingBag className="w-8 h-8 opacity-40" />
                  </div>
                )}
              </div>

              {/* Product Info & Price (Ref image: ₺48,80 style) */}
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-blue-600 transition-colors">
                  {ad.title}
                </h4>

                <div className="flex items-baseline justify-between mt-1">
                  {ad.price && (
                    <span className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                      {ad.price}
                    </span>
                  )}

                  <a
                    href={ad.targetUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-black text-blue-600 dark:text-blue-400 group-hover:underline ml-auto"
                  >
                    <span>İncele</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Full Card Overlay Link */}
              <a
                href={ad.targetUrl || "#"}
                target="_blank"
                rel="noreferrer"
                aria-label={ad.title}
                className="absolute inset-0 z-20 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- HOME BOTTOM BANNER DISPLAY ---
  if (position === "home-bottom") {
    return (
      <div className={`w-full max-w-6xl mx-auto my-8 px-4 ${className}`}>
        {activeAds.map((ad) => (
          <div
            key={ad.id}
            className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6"
          >
            {/* Background Accent Glow */}
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -top-20 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

            {ad.htmlCode ? (
              <div className="w-full z-10" dangerouslySetInnerHTML={{ __html: ad.htmlCode }} />
            ) : (
              <>
                <div className="flex-1 z-10 text-center md:text-left space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{ad.badgeText || "SPONSORLU BÖLÜM"}</span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {ad.title}
                  </h3>

                  {ad.price && (
                    <p className="text-sm font-semibold text-slate-300">
                      {ad.price}
                    </p>
                  )}
                </div>

                {ad.imageUrl && (
                  <div className="w-full md:w-64 h-36 rounded-2xl overflow-hidden border border-white/10 shadow-lg z-10 flex-shrink-0">
                    <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="z-10 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <a
                    href={ad.targetUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all text-center flex items-center justify-center gap-2 hover:scale-105"
                  >
                    <span>Siteyi Ziyaret Et</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  {onOpenContactModal && (
                    <button
                      type="button"
                      onClick={onOpenContactModal}
                      className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                    >
                      Reklam Ver
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    );
  }

  // --- FOOTER BANNER DISPLAY ---
  if (position === "footer") {
    return (
      <div className={`w-full bg-slate-900 border-t border-slate-800 py-4 px-4 text-white ${className}`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {activeAds.map((ad) => (
            <div key={ad.id} className="w-full flex items-center justify-between gap-4 bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
              <div className="flex items-center gap-3">
                {ad.imageUrl && (
                  <img src={ad.imageUrl} alt={ad.title} className="w-12 h-12 rounded-xl object-cover" />
                )}
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                    {ad.badgeText || "Sponsorlu Reklam"}
                  </span>
                  <h4 className="text-xs font-bold text-white">{ad.title}</h4>
                  {ad.price && <p className="text-[11px] text-slate-300 font-semibold">{ad.price}</p>}
                </div>
              </div>

              <a
                href={ad.targetUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all whitespace-nowrap"
              >
                Tıkla & Gör
              </a>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
