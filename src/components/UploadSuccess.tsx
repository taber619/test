import React, { useState } from "react";
import { Copy, Check, Trash2, ArrowLeft, Eye, Shield, Lock, Calendar, Video, Image, QrCode, Archive, FileText } from "lucide-react";
import { ClientImage } from "../types";
import QRCodeShareModal from "./QRCodeShareModal";

interface UploadSuccessProps {
  uploadedImages: ClientImage[];
  onReset: () => void;
  onDeleteImage: (id: string, deleteToken: string) => Promise<void>;
  onSetPassword: (id: string, password: string) => Promise<boolean>;
}

export default function UploadSuccess({
  uploadedImages,
  onReset,
  onDeleteImage,
  onSetPassword,
}: UploadSuccessProps) {
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [lockedStatus, setLockedStatus] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<Record<string, "direct" | "preview" | "bbcode" | "html" | "markdown">>({});
  const [qrModalImage, setQrModalImage] = useState<ClientImage | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(key);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  const submitPassword = async (id: string) => {
    const pwd = passwords[id] || "";
    if (!pwd) return;
    const success = await onSetPassword(id, pwd);
    if (success) {
      setLockedStatus((prev) => ({ ...prev, [id]: true }));
      alert("Görsel başarıyla şifrelendi! Artık bu şifre olmadan görüntülenemez.");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in" id="upload-success-panel">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            🎉 Yükleme Tamamlandı!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Dosyalarınız başarıyla buluta yüklendi ve paylaşıma hazır.</p>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all duration-200 cursor-pointer"
          id="btn-new-upload"
        >
          <ArrowLeft className="w-4 h-4" />
          Yeni Dosya Yükle
        </button>
      </div>

      <div className="space-y-8" id="uploaded-images-list">
        {uploadedImages.map((img) => {
          const currentTab = activeTab[img.id] || "direct";
          const isCopied = (type: string) => copiedIndex === `${img.id}-${type}`;

          const origin = typeof window !== "undefined" ? window.location.origin : "";
          const directUrl = img.directUrl || `${origin}/api/images/${img.id}`;
          const previewUrl = img.previewUrl || `${origin}/i/${img.id}`;
          const isVideo = img.mimeType?.startsWith("video/");
          const bbCode = img.bbCode || (isVideo ? `[VIDEO]${directUrl}[/VIDEO]` : `[IMG]${directUrl}[/IMG]`);
          const htmlCode = img.htmlCode || (isVideo 
            ? `<video src="${directUrl}" controls width="100%"></video>` 
            : `<a href="${previewUrl}"><img src="${directUrl}" alt="${img.name}" /></a>`);
          const markdownCode = img.markdownCode || (isVideo 
            ? `[${img.name}](${directUrl})` 
            : `![${img.name}](${directUrl})`);

          const getLinkValue = () => {
            switch (currentTab) {
              case "direct":
                return directUrl;
              case "preview":
                return previewUrl;
              case "bbcode":
                return bbCode;
              case "html":
                return htmlCode;
              case "markdown":
                return markdownCode;
              default:
                return directUrl;
            }
          };

          return (
            <div
              key={img.id}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow grid grid-cols-1 lg:grid-cols-12 gap-6"
              id={`uploaded-card-${img.id}`}
            >
              {/* Thumbnail and Info */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 group flex items-center justify-center">
                  {img.mimeType?.startsWith("video/") ? (
                    <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-xl">
                      <video
                        src={img.directUrl}
                        className="w-full h-full object-contain"
                        muted
                        playsInline
                      />
                      {img.watermarkText && (
                        <div 
                          className="absolute pointer-events-none select-none font-extrabold tracking-wide px-2 py-0.5 rounded-md bg-black/20 backdrop-blur-[0.5px] z-10"
                          style={{
                            opacity: img.watermarkOpacity !== undefined ? img.watermarkOpacity : 0.6,
                            color: img.watermarkColor || "#ffffff",
                            fontSize: img.watermarkSize ? `${Math.max(9, Math.round(180 * img.watermarkSize))}px` : "11px",
                            textShadow: "0px 1px 3px rgba(0,0,0,0.9)",
                            ...(() => {
                              const pos = img.watermarkPosition || "bottom-right";
                              if (pos === "bottom-left") return { bottom: "10px", left: "10px" };
                              if (pos === "top-right") return { top: "10px", right: "10px" };
                              if (pos === "top-left") return { top: "10px", left: "10px" };
                              if (pos === "center") return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
                              return { bottom: "10px", right: "10px" }; // bottom-right
                            })()
                          }}
                        >
                          {img.watermarkText}
                        </div>
                      )}
                    </div>
                  ) : img.mimeType?.startsWith("image/") ? (
                    <img
                      src={img.directUrl}
                      alt={img.name}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
                      <Archive className="w-10 h-10 text-amber-400 mb-2 animate-bounce" />
                      <span className="text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-lg">
                        {img.name.split('.').pop()?.toUpperCase() || "DOSYA"}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a
                      href={img.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-white dark:bg-slate-800 rounded-xl text-slate-800 dark:text-white hover:scale-105 transition-transform"
                      title="Önizleme Sayfası"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    {img.mimeType?.startsWith("video/") ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                        <Video className="w-3 h-3" />
                        Video
                      </span>
                    ) : img.mimeType?.startsWith("image/") ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                        <Image className="w-3 h-3" />
                        Görsel
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
                        <Archive className="w-3 h-3" />
                        Dosya / Arşiv
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-white truncate text-sm" title={img.name}>
                    {img.name}
                  </h4>
                  <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
                    <span>Boyut: {formatSize(img.size)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Silinme: {img.deleteAfter === "never" ? "Süresiz" : `${img.deleteAfter}`}
                    </span>
                  </div>
                </div>

                {/* Password Setting & Deletion Action */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-1 space-y-3">
                  {/* Password Protection */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
                      <Shield className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                      Dosyayı Şifreyle Koru
                    </label>
                    {lockedStatus[img.id] || img.hasPassword ? (
                      <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 py-1.5 px-3 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                        <Lock className="w-3.5 h-3.5" />
                        Bu dosya şifre ile koruma altında!
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder="Şifre belirle..."
                          value={passwords[img.id] || ""}
                          onChange={(e) => setPasswords((prev) => ({ ...prev, [img.id]: e.target.value }))}
                          className="flex-1 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 dark:text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => submitPassword(img.id)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Koru
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Manual Delete Button */}
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        if (confirm("Bu dosyayı sunucudan kalıcı olarak silmek istediğinize emin misiniz?")) {
                          onDeleteImage(img.id, img.deleteToken || "");
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 py-1.5 px-3 rounded-lg border border-red-100 dark:border-red-900/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Dosyayı Şimdi Sil
                    </button>
                  </div>
                </div>
              </div>

              {/* Shared Code Links Block */}
              <div className="lg:col-span-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Paylaşım Kodları</span>
                    <button
                      type="button"
                      onClick={() => setQrModalImage(img)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>QR Kod & Sosyal Paylaş</span>
                    </button>
                  </div>
                  {/* Tabs */}
                  <div className="flex flex-wrap gap-1.5 mt-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                    {[
                      { id: "direct", label: "Doğrudan Bağlantı (Direk Link) ⭐" },
                      { id: "preview", label: "İndirme / Detay Sayfası Linki" },
                      { id: "bbcode", label: "BBCode (Forum)" },
                      { id: "html", label: "HTML Embed" },
                      { id: "markdown", label: "Markdown" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab((prev) => ({ ...prev, [img.id]: tab.id as any }))}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          currentTab === tab.id
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Link Output Block */}
                  <div className="mt-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 relative">
                    <pre className="text-xs font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-all pr-12 max-h-[140px] overflow-y-auto leading-relaxed">
                      {getLinkValue()}
                    </pre>

                    <button
                      onClick={() => handleCopy(getLinkValue(), `${img.id}-${currentTab}`)}
                      className="absolute right-3 top-3 p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:shadow-sm active:scale-95 transition-all cursor-pointer"
                      title="Linki Kopyala"
                    >
                      {isCopied(currentTab) ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-50 dark:border-blue-900/30 flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 shrink-0" />
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <strong className="text-slate-800 dark:text-white">İpucu:</strong> Karşı tarafa veya arkadaşlarınıza link gönderirken <strong>İndirme Sayfası Linkini</strong> kullanırsanız, linki açtıklarında şık bir arayüz ile karşılaşırlar ve <strong>"Dosyayı İndir"</strong> butonuna basarak indirebilirler.
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {qrModalImage && (
        <QRCodeShareModal
          isOpen={!!qrModalImage}
          onClose={() => setQrModalImage(null)}
          imageUrl={`${window.location.origin}/i/${qrModalImage.id}`}
          previewUrl={`${window.location.origin}/i/${qrModalImage.id}`}
          title={qrModalImage.name}
        />
      )}
    </div>
  );
}
