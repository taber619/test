import React, { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, QrCode, Share2, Copy, Check, Download, Send, MessageCircle, Twitter, Facebook, ExternalLink } from "lucide-react";

interface QRCodeShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  previewUrl: string;
  directUrl: string;
}

export default function QRCodeShareModal({
  isOpen,
  onClose,
  title,
  previewUrl,
  directUrl,
}: QRCodeShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeShareType, setActiveShareType] = useState<"preview" | "direct">("preview");
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const targetUrl = activeShareType === "preview" ? previewUrl : directUrl;
  const shareText = `${title || "İnanResim Görseli"} - İnanResim ile paylaşıldı:`;

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQRCode = () => {
    if (!qrRef.current) return;
    const svgElement = qrRef.current.querySelector("svg");
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `QR_${title.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const socialLinks = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20",
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${targetUrl}`)}`,
    },
    {
      name: "Telegram",
      icon: Send,
      color: "bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/20",
      url: `https://t.me/share/url?url=${encodeURIComponent(targetUrl)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      name: "X (Twitter)",
      icon: Twitter,
      color: "bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white shadow-slate-900/20",
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(targetUrl)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      name: "Facebook",
      icon: Facebook,
      color: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(targetUrl)}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" id="qr-share-modal">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-6 animate-scale-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">
              QR Kod & Sosyal Paylaşım
            </h3>
            <p className="text-xs text-slate-400 truncate max-w-[240px]">
              {title}
            </p>
          </div>
        </div>

        {/* Share Link Type Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveShareType("preview")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeShareType === "preview"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Önizleme Sayfası QR
          </button>
          <button
            onClick={() => setActiveShareType("direct")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeShareType === "direct"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Doğrudan Link QR
          </button>
        </div>

        {/* QR Code Container */}
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center space-y-4">
          <div ref={qrRef} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
            <QRCodeSVG
              value={targetUrl}
              size={180}
              level="H"
              includeMargin={false}
            />
          </div>

          <button
            onClick={downloadQRCode}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            QR Kodu Görsel Olarak İndir (.PNG)
          </button>
        </div>

        {/* Social Share Buttons Grid */}
        <div className="space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
            Sosyal Medyada Hızlı Paylaş
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {socialLinks.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs shadow-md transition-transform active:scale-95 ${item.color}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Direct Link Copy Input */}
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Paylaşım Bağlantısı
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={targetUrl}
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none font-mono truncate"
            />
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  Kopyalandı
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Kopyala
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
