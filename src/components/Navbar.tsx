import React, { useState, useRef, useEffect } from "react";
import { 
  Image as ImageIcon, 
  LogIn, 
  LogOut, 
  LayoutGrid, 
  User, 
  Sun, 
  Moon, 
  Shield, 
  ChevronDown, 
  Code,
  Sparkles,
  Info
} from "lucide-react";
import { ActiveTab, ClientUser } from "../types";

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: ClientUser | null;
  onLogout: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  currentUser, 
  onLogout, 
  theme, 
  onToggleTheme 
}: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setDropdownOpen(false);
  };

  const handleApiClick = () => {
    alert("✨ İnanResim API Çok Yakında!\nGeliştiriciler için doğrudan resim yükleme ve yönetim API servisimiz çok yakında aktif olacaktır.");
  };

  return (
    <header 
      className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 px-4 sm:px-6 lg:px-12 h-16 flex items-center justify-between transition-all duration-300" 
      id="main-header"
    >
      {/* Brand Logo */}
      <div 
        onClick={() => setActiveTab("home")} 
        className="flex items-center space-x-2.5 cursor-pointer select-none group"
        id="logo-container"
      >
        <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:rotate-6 group-hover:scale-105 shadow-md shadow-blue-500/10">
          <div className="w-4 h-4 bg-white rounded-sm rotate-45 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none">
            inanresim<span className="text-blue-600 dark:text-blue-400">.com</span>
          </span>
          <span className="text-[9px] text-slate-400 font-extrabold tracking-widest uppercase mt-0.5">
            HIZLI RESİM PAYLAŞIMI
          </span>
        </div>
      </div>

      {/* Main Navigation Menu (Desktop & Centered) */}
      <nav className="flex items-center space-x-1 sm:space-x-3 text-sm font-semibold" id="nav-menu">
        <button
          id="nav-btn-home"
          onClick={() => handleMenuClick("home")}
          className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
            activeTab === "home" || activeTab === "url-upload" || activeTab === "image-detail"
              ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/60 hover:text-slate-900 dark:hover:text-slate-100"
          }`}
        >
          Ana Sayfa
        </button>

        {/* Separator */}
        <div className="h-5 w-px bg-slate-200/80 dark:bg-slate-800 mx-1 sm:mx-2"></div>

        {/* Theme Toggle Button */}
        <button
          id="nav-btn-theme-toggle"
          onClick={onToggleTheme}
          title={theme === "light" ? "Gece Moduna Geç" : "Gündüz Moduna Geç"}
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-900/60 rounded-xl transition-all cursor-pointer flex items-center justify-center"
        >
          {theme === "light" ? (
            <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-600" />
          ) : (
            <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400 animate-pulse" />
          )}
        </button>

        {/* User Auth Status Area */}
        {currentUser ? (
          /* Profile Dropdown trigger (Keeps navbar extremely pristine) */
          <div className="relative" ref={dropdownRef}>
            <button
              id="profile-dropdown-trigger"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 pl-2.5 pr-1.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl transition-all cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-inner shadow-white/10 uppercase">
                {currentUser.username.charAt(0)}
              </div>
              <span className="hidden md:inline-block text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[100px]">
                @{currentUser.username}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Premium Profile Dropdown Overlay */}
            {dropdownOpen && (
              <div 
                className="absolute right-0 mt-2.5 w-64 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl p-4 animate-fade-in z-[100]"
                id="profile-dropdown-panel"
              >
                {/* Header User Identity */}
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-md uppercase">
                    {currentUser.username.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
                      {currentUser.username}
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0 animate-pulse" title="Çevrimiçi"></span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold block">Üye Hesabı</span>
                  </div>
                </div>

                {/* Dropdown Menu Items */}
                <div className="space-y-1 mt-3">
                  <button
                    onClick={() => handleMenuClick("gallery")}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                      activeTab === "gallery"
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850"
                    }`}
                  >
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                    Benim Galerim
                  </button>

                  <button
                    onClick={() => handleMenuClick("admin")}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                      activeTab === "admin"
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850"
                    }`}
                  >
                    <Shield className="w-4 h-4 text-indigo-500" />
                    Yönetici Paneli
                  </button>
                </div>

                {/* Logout Action Footer */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-black text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all flex items-center gap-2.5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Çıkış Yap
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Beautiful Unified Guest Controls Capsule */
          <div className="flex items-center bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 p-1.5 rounded-2xl gap-1" id="nav-guest-actions">
            <button
              id="nav-btn-admin-guest"
              onClick={() => handleMenuClick("admin")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer flex items-center gap-2 tracking-wide uppercase ${
                activeTab === "admin"
                  ? "bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/30 dark:border-slate-800/30"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Yönetici</span>
            </button>

            <button
              id="nav-btn-auth"
              onClick={() => handleMenuClick("auth")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer flex items-center gap-2 tracking-wide uppercase ${
                activeTab === "auth"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Giriş / Üye Ol</span>
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}
