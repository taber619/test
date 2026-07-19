import React, { useState } from "react";
import { LogIn, UserPlus, Mail, Lock, User, AlertCircle, CheckCircle } from "lucide-react";
import { ClientUser } from "../types";

interface AuthViewProps {
  onLoginSuccess: (user: ClientUser) => void;
}

export default function AuthView({ onLoginSuccess }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !password || (!isLogin && !username)) {
      setError("Lütfen boş alanları doldurunuz.");
      return;
    }

    setLoading(true);
    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const body = isLogin ? { email, password } : { username, email, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "İşlem başarısız oldu.");
      }

      if (isLogin) {
        setSuccessMsg("Giriş başarılı! Yönlendiriliyorsunuz...");
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 800);
      } else {
        setSuccessMsg("Kayıt işleminiz başarıyla tamamlandı! Giriş yapabilirsiniz.");
        setIsLogin(true);
        setPassword("");
      }
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4 animate-fade-in" id="auth-panel">
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-8">
        {/* Toggle tabs */}
        <div className="flex border-b border-slate-100 pb-3 mb-6 gap-2">
          <button
            onClick={() => {
              setIsLogin(true);
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-center text-sm font-bold rounded-xl transition-all cursor-pointer ${
              isLogin ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:text-slate-800"
            }`}
            id="tab-btn-login"
          >
            Giriş Yap
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-center text-sm font-bold rounded-xl transition-all cursor-pointer ${
              !isLogin ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:text-slate-800"
            }`}
            id="tab-btn-register"
          >
            Kayıt Ol
          </button>
        </div>

        {/* Title & Desc */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">
            {isLogin ? "Tekrar Hoş Geldiniz!" : "Hızlı Resim Üyesi Olun"}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            {isLogin
              ? "Görsellerinizi bulutta süresiz saklamak ve yönetmek için giriş yapın."
              : "Yüklediğiniz resimleri kontrol altında tutun, gelişmiş özellikleri ücretsiz keşfedin."}
          </p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold rounded-xl flex items-start gap-2.5" id="auth-error-msg">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-semibold rounded-xl flex items-start gap-2.5" id="auth-success-msg">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" id="auth-form">
          {!isLogin && (
            <div>
              <label className="block text-xs font-extrabold text-slate-600 uppercase mb-1.5 pl-1">
                Kullanıcı Adı
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="hizli_user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-extrabold text-slate-600 uppercase mb-1.5 pl-1">
              E-posta Adresi
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="email"
                placeholder="ornek@hizliresim.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-600 uppercase mb-1.5 pl-1">
              Şifre
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-blue-100 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm mt-6"
            id="btn-auth-submit"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : isLogin ? (
              <>
                <LogIn className="w-4 h-4" />
                Giriş Yap
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Üye Ol
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            {isLogin ? "Bir hesabınız yok mu?" : "Zaten bir hesabınız var mı?"}{" "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              {isLogin ? "Şimdi Üye Olun" : "Giriş Yapın"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
