import React, { useState } from "react";
import { LogIn, UserPlus, Mail, Lock, User, AlertCircle, CheckCircle, Key, ArrowLeft, RefreshCw } from "lucide-react";
import { ClientUser } from "../types";

interface AuthViewProps {
  onLoginSuccess: (user: ClientUser) => void;
}

export default function AuthView({ onLoginSuccess }: AuthViewProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [simulatedCodeAlert, setSimulatedCodeAlert] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !password || (mode === "register" && !username)) {
      setError("Lütfen tüm alanları doldurunuz.");
      return;
    }

    setLoading(true);
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = mode === "login" ? { email, password } : { username, email, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Giriş veya kayıt işlemi başarısız oldu.");
      }

      if (mode === "login") {
        setSuccessMsg("Giriş başarılı! Yönlendiriliyorsunuz...");
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 800);
      } else {
        setSuccessMsg("Hesabınız başarıyla oluşturuldu! Şimdi giriş yapabilirsiniz.");
        setMode("login");
        setPassword("");
      }
    } catch (err: any) {
      setError(err.message || "Bir bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSimulatedCodeAlert(null);

    if (!email) {
      setError("Lütfen e-posta adresinizi giriniz.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Şifre sıfırlama talebi gönderilemedi.");
      }

      setSuccessMsg(data.message);
      if (data.debugCode) {
        setSimulatedCodeAlert(data.debugCode);
      }
      setTimeout(() => {
        setMode("reset");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Bir bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !resetCode || !newPassword) {
      setError("Lütfen tüm alanları doldurunuz.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code: resetCode,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Şifre sıfırlama işlemi başarısız oldu.");
      }

      setSuccessMsg(data.message);
      setSimulatedCodeAlert(null);
      setResetCode("");
      setNewPassword("");
      setTimeout(() => {
        setMode("login");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Bir bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto my-12 px-4 animate-fade-in" id="auth-panel">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-[32px] shadow-xl p-6 sm:p-8 transition-colors duration-300">
        
        {/* Back navigation buttons for forgot / reset modes */}
        {(mode === "forgot" || mode === "reset") && (
          <button
            onClick={() => {
              setMode("login");
              setError(null);
              setSuccessMsg(null);
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mb-6 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Giriş Ekranına Dön
          </button>
        )}

        {/* Modern Sliding Segmented Control Pill */}
        {(mode === "login" || mode === "register") && (
          <div className="bg-slate-100/80 dark:bg-slate-950/40 p-1.5 rounded-[20px] flex gap-1.5 mb-8" id="auth-tab-switch">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 text-center text-xs font-black uppercase tracking-wider rounded-[14px] transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === "login"
                  ? "bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/20 dark:border-slate-800/20" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
              id="tab-btn-login"
            >
              <LogIn className="w-3.5 h-3.5" />
              Giriş Yap
            </button>
            
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 text-center text-xs font-black uppercase tracking-wider rounded-[14px] transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === "register"
                  ? "bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/20 dark:border-slate-800/20" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
              id="tab-btn-register"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Kayıt Ol
            </button>
          </div>
        )}

        {/* Dynamic Descriptive Content */}
        <div className="text-center mb-8">
          <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
            {mode === "login" && "Tekrar Hoş Geldiniz!"}
            {mode === "register" && "Hesap Oluşturun"}
            {mode === "forgot" && "Şifremi Unuttum"}
            {mode === "reset" && "Şifreyi Sıfırla"}
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
            {mode === "login" && "Bulut galerinizde görsellerinizi güvenle saklamak ve yönetmek için hesabınıza erişin."}
            {mode === "register" && "Ücretsiz üye olarak sınırsız silinmeyen yüklemeler ve görsel geçmişi ayrıcalıklarından yararlanın."}
            {mode === "forgot" && "Kayıtlı e-posta adresinizi girin, şifrenizi sıfırlamanız için 6 haneli doğrulama kodu gönderelim."}
            {mode === "reset" && "E-posta adresinize gelen 6 haneli kodu ve kullanmak istediğiniz yeni şifrenizi girin."}
          </p>
        </div>

        {/* Simulated Code Alert Toast (Extremely useful for simulation testing in app builder environment) */}
        {simulatedCodeAlert && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/25 border-2 border-amber-300 dark:border-amber-800 rounded-2xl text-amber-900 dark:text-amber-200 text-xs font-bold shadow-md animate-pulse" id="simulated-code-toast">
            <div className="flex items-center gap-2 mb-1.5 text-amber-800 dark:text-amber-400">
              <Key className="w-4 h-4" />
              <span className="font-extrabold uppercase tracking-wide text-[10px]">Test Ortamı Bildirimi</span>
            </div>
            <p className="leading-relaxed">
              E-posta gönderimi simüle edildi! Sıfırlama kodunuz: <span className="font-mono bg-amber-100 dark:bg-amber-900/50 px-2 py-1 rounded text-sm text-amber-900 dark:text-amber-200 font-extrabold select-all tracking-wider">{simulatedCodeAlert}</span>
            </p>
          </div>
        )}

        {/* State Banners */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/25 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-2xl flex items-start gap-3 shadow-sm animate-fade-in" id="auth-error-msg">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-rose-500" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950/25 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-2xl flex items-start gap-3 shadow-sm animate-fade-in" id="auth-success-msg">
            <CheckCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-emerald-500" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Dynamic Forms */}
        {/* --- LOGIN & REGISTER FORMS --- */}
        {(mode === "login" || mode === "register") && (
          <form onSubmit={handleSubmit} className="space-y-5" id="auth-form">
            {mode === "register" && (
              <div className="animate-fade-in">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 pl-1">
                  Kullanıcı Adı
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="inan_user"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-950/50 text-slate-800 dark:text-white border border-slate-200/50 dark:border-slate-800/80 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 transition-all shadow-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 pl-1">
                E-posta Adresi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  placeholder="ornek@inanresim.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-950/50 text-slate-800 dark:text-white border border-slate-200/50 dark:border-slate-800/80 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 pl-1">
                Güvenli Şifre
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-950/50 text-slate-800 dark:text-white border border-slate-200/50 dark:border-slate-800/80 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 transition-all shadow-sm"
                />
              </div>
              
              {mode === "login" && (
                <div className="flex justify-end pt-2 pl-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] font-bold text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    Şifremi Unuttum?
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold text-xs uppercase tracking-wider py-4 px-4 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-8"
              id="btn-auth-submit"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : mode === "login" ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Giriş Yap
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Kayıt Ol ve Katıl
                </>
              )}
            </button>
          </form>
        )}

        {/* --- FORGOT PASSWORD FORM --- */}
        {mode === "forgot" && (
          <form onSubmit={handleForgotPassword} className="space-y-5 animate-fade-in">
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 pl-1">
                E-posta Adresi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  placeholder="ornek@inanresim.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-950/50 text-slate-800 dark:text-white border border-slate-200/50 dark:border-slate-800/80 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 transition-all shadow-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider py-4 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Sıfırlama Kodu Gönder
                </>
              )}
            </button>
          </form>
        )}

        {/* --- RESET PASSWORD FORM --- */}
        {mode === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-5 animate-fade-in">
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 pl-1">
                E-posta Adresi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  disabled
                  value={email}
                  className="w-full text-xs font-bold bg-slate-100 dark:bg-slate-900 text-slate-500 border border-slate-200/50 dark:border-slate-800/80 rounded-xl pl-11 pr-4 py-3.5 cursor-not-allowed shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 pl-1">
                6 Haneli Doğrulama Kodu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full text-xs font-extrabold bg-slate-50 dark:bg-slate-950/50 text-slate-800 dark:text-white border border-slate-200/50 dark:border-slate-800/80 rounded-xl pl-11 pr-4 py-3.5 tracking-widest focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 pl-1">
                Yeni Güvenli Şifre
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-950/50 text-slate-800 dark:text-white border border-slate-200/50 dark:border-slate-800/80 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 transition-all shadow-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold text-xs uppercase tracking-wider py-4 px-4 rounded-xl shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Şifreyi Güncelle
                </>
              )}
            </button>
          </form>
        )}

        {/* --- FOOTER SWITCH MODE --- */}
        {(mode === "login" || mode === "register") && (
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
              {mode === "login" ? "Bir hesabınız yok mu?" : "Zaten üye misiniz?"}{" "}
              <button
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-blue-600 dark:text-blue-400 font-extrabold hover:underline cursor-pointer ml-1"
              >
                {mode === "login" ? "Şimdi Üye Olun" : "Hemen Giriş Yapın"}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
