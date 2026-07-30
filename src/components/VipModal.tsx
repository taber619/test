import React, { useState } from "react";
import { 
  Crown, 
  Check, 
  X, 
  CreditCard, 
  Building2, 
  Copy, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  HardDrive, 
  Clock, 
  Upload, 
  Sparkles,
  Lock,
  ArrowRight
} from "lucide-react";
import { ClientUser, SiteConfig, BankAccount, PaymentRequest } from "../types";

interface VipModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ClientUser | null;
  siteConfig: SiteConfig | null;
  onUserUpdated?: (updatedUser: ClientUser) => void;
  onOpenAuthModal?: () => void;
  onVipSuccess?: () => void;
}

export default function VipModal({
  isOpen,
  onClose,
  currentUser,
  siteConfig,
  onUserUpdated,
  onOpenAuthModal
}: VipModalProps) {
  if (!isOpen) return null;

  const [billingPlan, setBillingPlan] = useState<"monthly" | "yearly">("yearly");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "havale">("card");
  const [copiedIban, setCopiedIban] = useState<string | null>(null);

  // Card form states
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardProcessing, setCardProcessing] = useState(false);
  const [cardError, setCardError] = useState("");
  const [cardSuccess, setCardSuccess] = useState("");

  // Havale form states
  const [senderName, setSenderName] = useState(currentUser?.username || "");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [receiptImgUrl, setReceiptImgUrl] = useState("");
  const [havaleProcessing, setHavaleProcessing] = useState(false);
  const [havaleError, setHavaleError] = useState("");
  const [havaleSuccess, setHavaleSuccess] = useState("");

  // Dynamic pricing calculation
  const monthlyPrice = siteConfig?.vipMonthlyPrice ?? 99;
  const discountPercent = siteConfig?.vipAnnualDiscountPercent ?? 20;
  const annualPrice = siteConfig?.vipAnnualPrice ?? Math.round(monthlyPrice * 12 * (1 - discountPercent / 100));
  const monthlyEquivalent = Math.round(annualPrice / 12);

  const activePrice = billingPlan === "yearly" ? annualPrice : monthlyPrice;
  const bankAccounts: BankAccount[] = siteConfig?.bankAccounts || [];

  const handleCopyIban = (iban: string) => {
    navigator.clipboard.writeText(iban);
    setCopiedIban(iban);
    setTimeout(() => setCopiedIban(null), 2500);
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 16) val = val.slice(0, 16);
    // Format into 4-digit groups
    const formatted = val.match(/.{1,4}/g)?.join(" ") || val;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 4) val = val.slice(0, 4);
    if (val.length >= 3) {
      val = val.slice(0, 2) + "/" + val.slice(2);
    }
    setCardExpiry(val);
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
    setCardCvc(val);
  };

  const handleCardPay = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardError("");
    setCardSuccess("");

    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    if (!cardHolder.trim() || cardNumber.replace(/\s/g, "").length < 16 || !cardExpiry || cardCvc.length < 3) {
      setCardError("Lütfen tüm kart bilgilerini eksiksiz ve doğru formatta giriniz.");
      return;
    }

    setCardProcessing(true);
    try {
      const res = await fetch("/api/vip/pay-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          username: currentUser.username,
          userEmail: currentUser.email,
          plan: billingPlan,
          cardNumber,
          cardHolder,
          cardExpiry,
          cardCvc
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ödeme işlemi başarısız.");
      }

      setCardSuccess(data.message || "VIP Üyeliğiniz aktifleştirildi!");
      if (onUserUpdated && currentUser) {
        onUserUpdated({
          ...currentUser,
          isVip: true,
          vipPlan: billingPlan,
          vipExpireAt: Date.now() + (billingPlan === "yearly" ? 365 : 30) * 86400000
        });
      }
    } catch (err: any) {
      setCardError(err.message || "Bağlantı hatası oluştu.");
    } finally {
      setCardProcessing(false);
    }
  };

  const handleHavaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHavaleError("");
    setHavaleSuccess("");

    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    if (!senderName.trim()) {
      setHavaleError("Lütfen Havale/EFT gönderen adını ve soyadını giriniz.");
      return;
    }

    const selectedBank = bankAccounts.find(b => b.id === selectedBankId);

    setHavaleProcessing(true);
    try {
      const res = await fetch("/api/vip/request-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          username: currentUser.username,
          userEmail: currentUser.email,
          plan: billingPlan,
          amount: activePrice,
          paymentMethod: "havale",
          senderName,
          selectedBankId,
          bankName: selectedBank ? selectedBank.bankName : "Banka Havalesi",
          transferNote,
          receiptNumber,
          receiptImgUrl
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Bildirim gönderilemedi.");
      }

      setHavaleSuccess("Havale bildiriminiz yöneticilere iletildi! İşleminiz kontrol edilip VIP üyeliğiniz kısa süre içinde aktifleştirilecektir.");
    } catch (err: any) {
      setHavaleError(err.message || "Bağlantı hatası oluştu.");
    } finally {
      setHavaleProcessing(false);
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Dekont görseli maksimum 5MB olabilir.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptImgUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden my-auto text-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Glow Header Background */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-amber-500/20 via-amber-600/5 to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="relative p-5 sm:p-6 pb-4 border-b border-slate-800 flex items-center justify-between flex-none">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Crown className="w-6 h-6 text-amber-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  İnanResim <span className="text-amber-400">PRO VIP</span> Üyelik
                </h2>
                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Sınırsız Güç
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Yüksek depolama, reklamsız deneyim ve ultra hızlı sunucu ayrıcalıklarına sahip olun.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">

          {/* VIP System Disabled Warning Banner */}
          {siteConfig?.vipEnabled === false && (
            <div className="bg-rose-950/60 border border-rose-500/50 p-4 rounded-2xl flex items-start gap-3 text-rose-300 shadow-lg animate-fade-in">
              <Lock className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-xs text-rose-100 uppercase tracking-wider">PRO VIP Üyelik Sistemi Geçici Olarak Kapalıdır</h4>
                <p className="text-xs text-rose-300/90 font-medium leading-relaxed mt-1">
                  Yöneticilerimiz tarafından VIP üyelik alımları geçici olarak durdurulmuştur. Şu an için yeni üyelik işlemi gerçekleştirilememektedir.
                </p>
              </div>
            </div>
          )}

          {/* User Active VIP Badge Banner */}
          {currentUser?.isVip && (
            <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border border-amber-500/50 p-4 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-500/30">
                  <Crown className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-300">Hesabınız Şu An Active PRO VIP Statüsündedir!</h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Yenilenme / Bitiş Tarihi:{" "}
                    <span className="font-semibold text-white">
                      {currentUser.vipExpireAt ? new Date(currentUser.vipExpireAt).toLocaleDateString("tr-TR") : "Süresiz"}
                    </span>
                  </p>
                </div>
              </div>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Aktif Üyelik
              </span>
            </div>
          )}

          {/* Billing Switcher (Aylık vs Yıllık - Auto Price Calculator) */}
          <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 flex items-center max-w-md mx-auto">
            <button
              onClick={() => setBillingPlan("monthly")}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                billingPlan === "monthly"
                  ? "bg-slate-800 text-white shadow-md border border-slate-700"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Aylık Paket</span>
              <span className="text-[11px] font-semibold opacity-75">₺{monthlyPrice}/ay</span>
            </button>

            <button
              onClick={() => setBillingPlan("yearly")}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 relative ${
                billingPlan === "yearly"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/20"
                  : "text-amber-400 hover:text-amber-300"
              }`}
            >
              <span>Yıllık Paket</span>
              <span className="bg-slate-950/80 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                %{discountPercent} İNDİRİM
              </span>
            </button>
          </div>

          {/* Pricing Highlight Box */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                  {billingPlan === "yearly" ? "YILLIK VIP AVANTAJI (%20 İNDİRİMLİ)" : "AYLIK ABRONMAN PAKETİ"}
                </span>
              </div>
              <h3 className="text-2xl font-black text-white">
                {billingPlan === "yearly" ? "PRO VIP Yıllık Üyelik" : "PRO VIP Aylık Üyelik"}
              </h3>
              <p className="text-xs text-slate-400">
                {billingPlan === "yearly" 
                  ? `Yıllık ödeme ile ayda sadece ₺${monthlyEquivalent} ödeyin. Yıllık ₺${annualPrice} faturalandırılır.` 
                  : `İstediğiniz zaman iptal edebileceğiniz esnek aylık üyelik.`}
              </p>
            </div>

            <div className="text-center sm:text-right bg-slate-900/90 border border-slate-800 p-4 rounded-2xl min-w-[200px]">
              <div className="text-3xl font-black text-white tracking-tight flex items-baseline justify-center sm:justify-end gap-1">
                <span>₺{activePrice}</span>
                <span className="text-xs font-semibold text-slate-400">
                  {billingPlan === "yearly" ? "/yıl" : "/ay"}
                </span>
              </div>
              {billingPlan === "yearly" && (
                <p className="text-[11px] text-emerald-400 font-bold mt-1">
                  Aylık ₺{monthlyEquivalent} (₺{(monthlyPrice * 12) - annualPrice} Tasarruf!)
                </p>
              )}
            </div>
          </div>

          {/* Features Grid Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-amber-400">
                <HardDrive className="w-4 h-4" />
                <span className="text-xs font-extrabold uppercase tracking-wider">Dosya Limiti</span>
              </div>
              <p className="text-sm font-black text-white">5 GB (5000 MB)</p>
              <p className="text-[11px] text-slate-400">Standart üyelerin 5 katı devasa dosya ve video yükleme kapasitesi</p>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-amber-400">
                <Zap className="w-4 h-4" />
                <span className="text-xs font-extrabold uppercase tracking-wider">Reklam Durumu</span>
              </div>
              <p className="text-sm font-black text-white">%100 Reklamsız</p>
              <p className="text-[11px] text-slate-400">Hiçbir banner veya sponsorlu reklam görmezsiniz</p>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-amber-400">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-extrabold uppercase tracking-wider">Saklama Süresi</span>
              </div>
              <p className="text-sm font-black text-amber-400">Süresiz (VIP Özel Kalıcı Saklama)</p>
              <p className="text-[11px] text-slate-400">Standart üyelerin aksine fotoğraflarınız ve videolarınız asla silinmez</p>
            </div>
          </div>

          {/* REAL PAYMENT METHOD SELECTION TABS */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                %100 Gerçek Güvenli Ödeme Yöntemi Seçin
              </h3>
              <span className="text-[11px] text-slate-400 font-semibold">256-bit SSL Korumalı</span>
            </div>

            {/* Method Selectors */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center gap-3 ${
                  paymentMethod === "card"
                    ? "bg-blue-950/40 border-blue-500 text-white shadow-lg shadow-blue-500/10"
                    : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                }`}
              >
                <div className={`p-2 rounded-xl ${paymentMethod === "card" ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-400"}`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-bold">Kredi / Banka Kartı</h4>
                  <p className="text-[10px] text-slate-400">Anında 3D Secure Doğrulama</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("havale")}
                className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center gap-3 ${
                  paymentMethod === "havale"
                    ? "bg-amber-950/40 border-amber-500 text-white shadow-lg shadow-amber-500/10"
                    : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                }`}
              >
                <div className={`p-2 rounded-xl ${paymentMethod === "havale" ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400"}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-bold">Banka Havalesi / EFT</h4>
                  <p className="text-[10px] text-slate-400">IBAN Hesabına Anında Bildirim</p>
                </div>
              </button>
            </div>

            {/* METHOD 1: CREDIT CARD FORM */}
            {paymentMethod === "card" && (
              <form onSubmit={handleCardPay} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Kart Bilgileriniz</span>
                  <div className="flex items-center gap-1.5 opacity-80">
                    <span className="text-[10px] font-extrabold bg-slate-800 px-2 py-0.5 rounded text-slate-300">VISA</span>
                    <span className="text-[10px] font-extrabold bg-slate-800 px-2 py-0.5 rounded text-slate-300">MASTERCARD</span>
                    <span className="text-[10px] font-extrabold bg-slate-800 px-2 py-0.5 rounded text-slate-300">TROY</span>
                  </div>
                </div>

                {cardError && (
                  <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-xs text-red-300 font-medium">
                    {cardError}
                  </div>
                )}

                {cardSuccess && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-none" />
                    {cardSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Kart Üzerindeki Ad Soyad</label>
                  <input
                    type="text"
                    required
                    placeholder="Ahmet Yılmaz"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Kart Numarası</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="5500 0000 0000 0000"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all font-mono tracking-wider"
                    />
                    <Lock className="w-4 h-4 text-slate-600 absolute right-3 top-3" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Son Kullanma Tarihi</label>
                    <input
                      type="text"
                      required
                      placeholder="AA/YY"
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all font-mono text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">CVC / CVV</label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      placeholder="123"
                      value={cardCvc}
                      onChange={handleCvcChange}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all font-mono text-center"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={cardProcessing || siteConfig?.vipEnabled === false}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {cardProcessing ? (
                    <span>3D Secure İşleniyor...</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>💳 ₺{activePrice} Öde ve PRO VIP Ol</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* METHOD 2: HAVALE / EFT FORM */}
            {paymentMethod === "havale" && (
              <div className="space-y-4">
                {/* Bank Account Cards */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 block">
                    Banka IBAN Hesaplarımız (Lütfen ödemeyi yaptıktan sonra bildirimi doldurunuz):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {bankAccounts.map((acc) => (
                      <div key={acc.id} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-amber-400">{acc.bankName}</span>
                          <span className="text-[10px] text-slate-400">{acc.branchCode}</span>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-300 font-semibold">{acc.accountHolder}</p>
                          <div className="flex items-center justify-between mt-1 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800 font-mono text-xs text-white">
                            <span>{acc.iban}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyIban(acc.iban)}
                              className="text-amber-400 hover:text-amber-300 p-1 cursor-pointer"
                              title="IBAN Kopyala"
                            >
                              {copiedIban === acc.iban ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        {acc.description && <p className="text-[10px] text-slate-500">{acc.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Havale Notification Form */}
                <form onSubmit={handleHavaleSubmit} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3.5">
                  <h4 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">Havale / EFT Ödeme Bildirimi Formu</h4>

                  {havaleError && (
                    <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-xs text-red-300 font-medium">
                      {havaleError}
                    </div>
                  )}

                  {havaleSuccess && (
                    <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-none" />
                      {havaleSuccess}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Gönderen Ad Soyad</label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Ahmet Yılmaz"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Ödeme Yapılan Banka</label>
                      <select
                        value={selectedBankId}
                        onChange={(e) => setSelectedBankId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition-all"
                      >
                        <option value="">Banka Seçiniz...</option>
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.id}>{b.bankName} - {b.accountHolder}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Dekont / İşlem Referans No (İsteğe Bağlı)</label>
                      <input
                        type="text"
                        placeholder="Örn: REF-981240"
                        value={receiptNumber}
                        onChange={(e) => setReceiptNumber(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Dekont Fotoğrafı / Ekran Görüntüsü</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Transfer Notu / Ek Bilgi</label>
                    <input
                      type="text"
                      placeholder="Örn: Garanti Bankasından Saat 15:30'da gönderdim."
                      value={transferNote}
                      onChange={(e) => setTransferNote(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={havaleProcessing || siteConfig?.vipEnabled === false}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  >
                    {havaleProcessing ? "Bildirim İletiliyor..." : "📩 Havale / EFT Bildirimini Gönder"}
                  </button>
                </form>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-none">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>7/24 Kesintisiz VIP Müşteri Desteği</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all cursor-pointer"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
}
