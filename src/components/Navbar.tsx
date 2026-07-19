import React from "react";
import { Image as ImageIcon, LogIn, LogOut, LayoutGrid, Upload, HelpCircle, User } from "lucide-react";
import { ActiveTab, ClientUser } from "../types";

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: ClientUser | null;
  onLogout: () => void;
}

export default function Navbar({ activeTab, setActiveTab, currentUser, onLogout }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 lg:px-12 h-16 flex items-center justify-between" id="main-header">
      {/* Logo */}
      <div 
        onClick={() => setActiveTab("home")} 
        className="flex items-center space-x-2.5 cursor-pointer select-none group"
        id="logo-container"
      >
        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center transition-colors group-hover:bg-blue-700">
          <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
        </div>
        <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
          hizliresim<span className="text-blue-600">.com</span>
        </span>
      </div>

      {/* Navigation Menu */}
      <nav className="flex items-center space-x-6 sm:space-x-8 text-sm font-medium" id="nav-menu">
        <button
          id="nav-btn-home"
          onClick={() => setActiveTab("home")}
          className={`pb-1 mt-0.5 border-b-2 transition-all duration-200 text-sm font-medium cursor-pointer ${
            activeTab === "home" || activeTab === "url-upload"
              ? "text-blue-600 border-blue-600"
              : "text-slate-500 border-transparent hover:text-slate-900"
          }`}
        >
          Ana Sayfa
        </button>

        <button
          id="nav-btn-api"
          onClick={() => alert("Hızlı Resim API çok yakında aktif olacaktır!")}
          className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer font-medium text-sm hidden sm:block"
        >
          API
        </button>

        {currentUser ? (
          <>
            <button
              id="nav-btn-gallery"
              onClick={() => setActiveTab("gallery")}
              className={`pb-1 mt-0.5 border-b-2 transition-all duration-200 text-sm font-medium cursor-pointer ${
                activeTab === "gallery"
                  ? "text-blue-600 border-blue-600"
                  : "text-slate-500 border-transparent hover:text-slate-900"
              }`}
            >
              Galeri
            </button>

            <div className="h-4 w-px bg-slate-200"></div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">@{currentUser.username}</span>
              <button
                id="nav-btn-logout"
                onClick={onLogout}
                title="Çıkış Yap"
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
            
            <button
              id="nav-btn-auth"
              onClick={() => setActiveTab("auth")}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors cursor-pointer"
            >
              Giriş Yap / Üye Ol
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
