import React, { useEffect, useState } from "react";
import { Image, Users, Sparkles } from "lucide-react";

interface StatsData {
  totalImages: number;
  activeUsers: number;
  uploadedToday: number;
}

export default function StatsCounter() {
  const [stats, setStats] = useState<StatsData>({
    totalImages: 0,
    activeUsers: 1,
    uploadedToday: 0,
  });

  useEffect(() => {
    let sessionId = sessionStorage.getItem("inanresim_session_id");
    if (!sessionId) {
      sessionId = "sess_" + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem("inanresim_session_id", sessionId);
    }

    const fetchStats = () => {
      fetch(`/api/stats?sessionId=${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.totalImages !== undefined) {
            setStats(data);
          }
        })
        .catch((err) => console.log("Stats fetch error", err));
    };

    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatNum = (num: number) => {
    return new Intl.NumberFormat("tr-TR").format(num);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-10 max-w-5xl mx-auto px-4" id="stats-grid">
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
          <Image className="w-6 h-6" />
        </div>
        <div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight" id="stat-total-images">
            {formatNum(stats.totalImages)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Toplam Yüklenen Resim</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight" id="stat-active-users">
            {formatNum(stats.activeUsers)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Aktif Kullanıcılar</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight" id="stat-uploaded-today">
            {formatNum(stats.uploadedToday)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Bugün Yüklenen Resim</div>
        </div>
      </div>
    </div>
  );
}
