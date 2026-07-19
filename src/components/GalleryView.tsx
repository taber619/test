import React, { useEffect, useState } from "react";
import { Image, Eye, Trash2, Calendar, FileType, Key, RefreshCw, Grid } from "lucide-react";
import { ClientImage, ClientUser } from "../types";

interface GalleryViewProps {
  currentUser: ClientUser | null;
  onSelectImage: (id: string) => void;
  onDeleteImage: (id: string, deleteToken: string) => Promise<void>;
}

export default function GalleryView({ currentUser, onSelectImage, onDeleteImage }: GalleryViewProps) {
  const [images, setImages] = useState<ClientImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"date" | "views" | "size">("date");

  const fetchUserGallery = () => {
    if (!currentUser) return;
    setLoading(true);
    fetch("/api/user/uploads", {
      headers: {
        Authorization: `Bearer ${currentUser.id}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Yüklemeler alınamadı.");
        return res.json();
      })
      .then((data) => {
        // Map backend objects to full ClientImage schemas
        const origin = window.location.origin;
        const mapped: ClientImage[] = data.map((img: any) => ({
          ...img,
          directUrl: `${origin}/api/images/${img.id}`,
          previewUrl: `${origin}/?view=image-detail&id=${img.id}`,
          bbCode: `[IMG]${origin}/api/images/${img.id}[/IMG]`,
          htmlCode: `<a href="${origin}/?view=image-detail&id=${img.id}"><img src="${origin}/api/images/${img.id}" alt="${img.name}" /></a>`,
          markdownCode: `![${img.name}](${origin}/api/images/${img.id})`,
        }));
        setImages(mapped);
      })
      .catch((err) => {
        console.error("Gallery loading failed:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUserGallery();
  }, [currentUser]);

  const handleDelete = async (id: string, token: string) => {
    if (confirm("Bu görseli sunucudan kalıcı olarak silmek istediğinize emin misiniz?")) {
      await onDeleteImage(id, token);
      fetchUserGallery(); // refresh
    }
  };

  // Sort images
  const sortedImages = [...images].sort((a, b) => {
    if (sortBy === "views") return b.views - a.views;
    if (sortBy === "size") return b.size - a.size;
    return b.uploadedAt - a.uploadedAt; // default date
  });

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 px-4" id="gallery-unauth">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Key className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Galeriye Erişmek İçin Giriş Yapın</h3>
        <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
          Yüklediğiniz resimleri toplu olarak takip etmek, görüntülenme sayılarını izlemek ve yönetmek için ücretsiz üye girişi yapın.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" id="gallery-panel">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Grid className="w-6 h-6 text-blue-600" />
            Görsel Galeriniz
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Hesabınız ile yüklediğiniz tüm görselleri buradan yönetebilirsiniz.
          </p>
        </div>

        {/* Filters and Refresh */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-400 uppercase">Sırala:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="date">En Yeni</option>
            <option value="views">En Çok İzlenen</option>
            <option value="size">En Büyük Boyut</option>
          </select>

          <button
            onClick={fetchUserGallery}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 border border-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Yenile"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20" id="gallery-loader">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-slate-400 text-sm mt-4 font-medium">Görselleriniz yükleniyor...</p>
        </div>
      ) : sortedImages.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-100" id="gallery-empty">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Image className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-700 text-base">Henüz görsel yüklemediniz</h3>
          <p className="text-slate-400 text-xs mt-1">
            Yüklediğiniz resimler burada listelenecektir. Ana sayfaya dönüp ilk yüklemenizi yapabilirsiniz!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" id="gallery-grid">
          {sortedImages.map((img) => (
            <div
              key={img.id}
              className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative"
              id={`gallery-item-${img.id}`}
            >
              {/* Image Preview thumbnail */}
              <div 
                onClick={() => onSelectImage(img.id)}
                className="relative aspect-square bg-slate-50 border-b border-slate-50 cursor-pointer overflow-hidden flex items-center justify-center"
              >
                <img
                  src={img.directUrl}
                  alt={img.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                
                {img.hasPassword && (
                  <div className="absolute top-2.5 left-2.5 bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm" title="Şifreli Görsel">
                    <Key className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <span className="text-xs bg-white text-slate-800 font-bold px-3 py-1.5 rounded-xl shadow">
                    Görüntüle
                  </span>
                </div>
              </div>

              {/* Details card footer */}
              <div className="p-4">
                <h4 
                  onClick={() => onSelectImage(img.id)}
                  className="font-bold text-slate-800 text-sm truncate hover:text-blue-600 cursor-pointer"
                  title={img.name}
                >
                  {img.name}
                </h4>

                <div className="space-y-1.5 mt-3 text-xs text-slate-400 font-medium">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      {formatDate(img.uploadedAt)}
                    </span>
                    <span>{formatSize(img.size)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                    <span className="flex items-center gap-1.5 text-slate-500 font-semibold">
                      <Eye className="w-3.5 h-3.5" />
                      {img.views} İzlenme
                    </span>
                    <button
                      onClick={() => handleDelete(img.id, img.deleteToken || "")}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Görseli Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
