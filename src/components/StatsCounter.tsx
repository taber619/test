import React, { useEffect, useState } from "react";
import { Image, Users, Sparkles } from "lucide-react";

interface StatsData {
  totalImages: number;
  activeUsers: number;
  uploadedToday: number;
}

export default function StatsCounter() {
  const [stats, setStats] = useState<StatsData>({
    totalImages: 1385420,
    activeUsers: 4210,
    uploadedToday: 342,
  });

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.totalImages) {
          setStats(data);
        }
      })
      .catch((err) => console.log("Stats fetch error, using default seeds", err));
  }, []);

  const formatNum = (num: number) => {
    return new Intl.NumberFormat("tr-TR").format(num);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-10 max-w-5xl mx-auto px-4" id="stats-grid">
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
          <Image className="w-6 h-6" />
        </div>
        <div>
          <div className="text-2xl font-black text-slate-800 tracking-tight" id="stat-total-images">
            {formatNum(stats.totalImages)}
          </div>
          <div className="text-xs text-slate-500 font-medium">Toplam Yüklenen Resim</div>
        </div>
      </div>

      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <div className="text-2xl font-black text-slate-800 tracking-tight" id="stat-active-users">
            {formatNum(stats.activeUsers)}
          </div>
          <div className="text-xs text-slate-500 font-medium">Aktif Kullanıcılar</div>
        </div>
      </div>

      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <div className="text-2xl font-black text-slate-800 tracking-tight" id="stat-uploaded-today">
            {formatNum(stats.uploadedToday)}
          </div>
          <div className="text-xs text-slate-500 font-medium">Bugün Yüklenen Resim</div>
        </div>
      </div>
    </div>
  );
}
