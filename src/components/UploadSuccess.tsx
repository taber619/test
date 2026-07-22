import React, { useState } from "react";
import { Copy, Check, Trash2, ArrowLeft, Eye, Shield, Lock, Calendar, Video, Image } from "lucide-react";
import { ClientImage } from "../types";

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
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            🎉 Yükleme Tamamlandı!
          </h2>
          <p className="text-sm text-slate-500 mt-1">Dosyalarınız başarıyla buluta yüklendi ve paylaşıma hazır.</p>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-100 transition-all duration-200 cursor-pointer"
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

          const getLinkValue = () => {
            switch (currentTab) {
              case "direct":
                return img.directUrl;
              case "preview":
                return img.previewUrl;
              case "bbcode":
                return img.bbCode;
              case "html":
                return img.htmlCode;
              case "markdown":
                return img.markdownCode;
            }
          };

          return (
            <div
              key={img.id}
              className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow grid grid-cols-1 lg:grid-cols-12 gap-6"
              id={`uploaded-card-${img.id}`}
            >
              {/* Thumbnail and Info */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 group">
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
                  ) : (
                    <img
                      src={img.directUrl}
                      alt={img.name}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a
                      href={img.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-white rounded-xl text-slate-800 hover:scale-105 transition-transform"
                      title="Önizleme Sayfası"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    {img.mimeType?.startsWith("video/") ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-blue-50 text-blue-600 border border-blue-100">
                        <Video className="w-3 h-3" />
                        Video
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <Image className="w-3 h-3" />
                        Görsel
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-800 truncate text-sm" title={img.name}>
                    {img.name}
                  </h4>
                  <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 text-xs text-slate-400 font-medium">
                    <span>Boyut: {formatSize(img.size)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Silinme: {img.deleteAfter === "never" ? "Süresiz" : `${img.deleteAfter}`}
                    </span>
                  </div>
                </div>

                {/* Password Setting & Deletion Action */}
                <div className="border-t border-slate-100 pt-4 mt-1 space-y-3">
                  {/* Password Protection */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-2">
                      <Shield className="w-3.5 h-3.5 text-indigo-500" />
                      Dosyayı Şifreyle Koru
                    </label>
                    {lockedStatus[img.id] || img.hasPassword ? (
                      <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-100">
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
                          className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-bold bg-red-50 hover:bg-red-100 py-1.5 px-3 rounded-lg border border-red-100 transition-colors cursor-pointer"
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
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Paylaşım Kodları</span>
                  {/* Tabs */}
                  <div className="flex flex-wrap gap-1.5 mt-3 border-b border-slate-100 pb-2">
                    {[
                      { id: "direct", label: "Doğrudan Link" },
                      { id: "preview", label: "Önizleme Sayfası" },
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
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Link Output Block */}
                  <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 relative">
                    <pre className="text-xs font-mono text-slate-600 whitespace-pre-wrap break-all pr-12 max-h-[140px] overflow-y-auto leading-relaxed">
                      {getLinkValue()}
                    </pre>

                    <button
                      onClick={() => handleCopy(getLinkValue(), `${img.id}-${currentTab}`)}
                      className="absolute right-3 top-3 p-2 bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-slate-800 hover:shadow-sm active:scale-95 transition-all cursor-pointer"
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

                <div className="mt-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-50 flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>İpucu:</strong> Doğrudan linki web sitelerinizde, e-posta imzalarında veya forumlarda doğrudan görsel kaynağı olarak kullanabilirsiniz.
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
