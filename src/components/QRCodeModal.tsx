import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { X, Download, Share2, Sparkles, Check, Link } from "lucide-react";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUrl: string;
  title?: string;
}

export default function QRCodeModal({
  isOpen,
  onClose,
  defaultUrl,
  title = "Görsel QR Kod Oluşturucu",
}: QRCodeModalProps) {
  const [url, setUrl] = useState(defaultUrl);
  const [darkColor, setDarkColor] = useState("#000000");
  const [lightColor, setLightColor] = useState("#ffffff");
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setUrl(defaultUrl);
  }, [defaultUrl]);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    QRCode.toCanvas(
      canvasRef.current,
      url,
      {
        width: 256,
        margin: 2,
        color: {
          dark: darkColor,
          light: lightColor,
        },
        errorCorrectionLevel: "H",
      },
      (error) => {
        if (error) console.error("QR Code generation error:", error);
      }
    );
  }, [isOpen, url, darkColor, lightColor]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qrcode-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="qrcode-modal">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden relative">
        
        {/* Header decoration band */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-50 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
            </div>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            id="qrcode-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* URL Input */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
              QR Kod İçeriği (Bağlantı veya Metin)
            </label>
            <div className="relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-24 py-3 font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300"
              />
              <div className="absolute left-3 top-3.5 text-slate-400">
                <Link className="w-3.5 h-3.5" />
              </div>
              <button
                onClick={handleCopyLink}
                className="absolute right-2 top-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer hover:shadow-sm"
              >
                {copied ? (
                  <span className="text-emerald-500 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Kopyalandı
                  </span>
                ) : (
                  "Linki Kopyala"
                )}
              </button>
            </div>
          </div>

          {/* QR Display Area */}
          <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-6 flex flex-col items-center justify-center border border-slate-100 dark:border-slate-850/60 shadow-inner">
            <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-100/50">
              <canvas ref={canvasRef} className="max-w-full rounded-lg" style={{ width: "200px", height: "200px" }} />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-3 text-center uppercase tracking-wider">
              Anında taranabilir yüksek çözünürlüklü QR Kod
            </p>
          </div>

          {/* Color Customization */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                QR Desen Rengi
              </label>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2">
                <input
                  type="color"
                  value={darkColor}
                  onChange={(e) => setDarkColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-slate-200/60 cursor-pointer overflow-hidden outline-none bg-transparent"
                />
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase">
                  {darkColor}
                </span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                QR Arkaplan Rengi
              </label>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2">
                <input
                  type="color"
                  value={lightColor}
                  onChange={(e) => setLightColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-slate-200/60 cursor-pointer overflow-hidden outline-none bg-transparent"
                />
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase">
                  {lightColor}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-50 dark:border-slate-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer text-center"
          >
            Kapat
          </button>
          
          <button
            onClick={handleDownload}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
          >
            <Download className="w-4 h-4" />
            QR Resmi İndir (PNG)
          </button>
        </div>

      </div>
    </div>
  );
}
