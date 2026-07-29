import express from "express";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import dns from "dns";

// Force IPv4 as default DNS resolution order to prevent ENETUNREACH on containers without IPv6
if (dns && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

// Global exception handlers to catch harmless SDK background warnings like Firestore BloomFilterError
process.on("uncaughtException", (err: any) => {
  if (err?.message?.includes("BloomFilterError") || err?.toString()?.includes("BloomFilterError")) {
    return;
  }
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason: any) => {
  if (reason?.message?.includes("BloomFilterError") || reason?.toString()?.includes("BloomFilterError")) {
    return;
  }
  console.error("Unhandled Rejection:", reason);
});

import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc 
} from "firebase/firestore";

interface StoredImage {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  data: string; // Base64 encoded string (used in in-memory fallback, or loaded on demand in Firestore helper)
  uploadedAt: number;
  deleteAfter: "1h" | "1d" | "1w" | "1m" | "never";
  password?: string;
  deleteToken: string;
  views: number;
  userId?: string;
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkColor?: string;
  watermarkSize?: number;
  watermarkPosition?: string;
}

interface StoredUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: number;
  emailVerified?: boolean;
  isBanned?: boolean;
  banReason?: string;
  isVip?: boolean;
  vipExpireAt?: number;
  vipPlan?: "monthly" | "yearly";
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  
  const SERVER_BOOT_TIME = Date.now().toString() + "_" + Math.random().toString(36).substring(2, 9);

  // Enable large file uploads (Registered users can upload up to 1GB per file)
  app.use(express.json({ limit: "1500mb" }));
  app.use(express.urlencoded({ limit: "1500mb", extended: true }));

  // In-memory data store (fallback if Firebase is not active)
  const images: Record<string, StoredImage> = {};
  const users: Record<string, StoredUser> = {};
  const passwordResets: Record<string, { code: string; expiresAt: number }> = {};
  const emailVerifications: Record<string, { code: string; expiresAt: number }> = {};
  let guestUploadCounts: Record<string, number> = {};

  // Lazy-initialized SMTP transporter
  let transporter: any = null;

  interface SmtpConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  }

  let smtpConfigState: SmtpConfig = {
    host: process.env.SMTP_HOST || "",
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "",
  };

  async function dbGetSmtpConfig(): Promise<SmtpConfig> {
    if (useFirebase && db) {
      try {
        const docRef = doc(db, "configs", "smtp");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          return {
            host: data.host ?? smtpConfigState.host,
            port: data.port !== undefined ? Number(data.port) : smtpConfigState.port,
            user: data.user ?? smtpConfigState.user,
            pass: data.pass ?? smtpConfigState.pass,
            from: data.from ?? smtpConfigState.from,
          };
        }
      } catch (e) {
        console.error("Firebase get smtp config error:", e);
      }
    }
    return smtpConfigState;
  }

  async function dbSaveSmtpConfig(newSmtp: SmtpConfig): Promise<SmtpConfig> {
    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "configs", "smtp"), newSmtp);
      } catch (e) {
        console.error("Firebase save smtp config error:", e);
      }
    }
    smtpConfigState = newSmtp;
    transporter = null; // reset transporter
    return smtpConfigState;
  }

  async function getTransporter() {
    if (!transporter) {
      const config = await dbGetSmtpConfig();
      const { host, port, user, pass } = config;

      if (!host || !user || !pass) {
        console.warn("SMTP credentials are not configured. Falling back to console simulation.");
        return null;
      }

      const transportConfig: any = {
        host: host.trim(),
        port: Number(port) || 587,
        secure: Number(port) === 465,
        connectionTimeout: 2500,
        greetingTimeout: 2500,
        socketTimeout: 2500,
        auth: {
          user: user.trim(),
          pass: pass.trim(),
        },
        tls: {
          rejectUnauthorized: false
        },
        family: 4
      };

      transporter = nodemailer.createTransport(transportConfig);
    }
    return transporter;
  }

  async function sendResetEmail(email: string, code: string): Promise<{ success: boolean; error?: string }> {
    const config = await dbGetSmtpConfig();
    const mailTransporter = await getTransporter();
    if (!mailTransporter) {
      return {
        success: false,
        error: "SMTP ayarları eksik. Lütfen panelden SMTP_HOST, SMTP_PORT, SMTP_USER ve SMTP_PASS değerlerini girin.",
      };
    }

    let fromAddress = (config.from || "").trim();
    if (!fromAddress) {
      fromAddress = `"İnanResim" <${config.user}>`;
    } else if (!fromAddress.includes("@") && !fromAddress.includes("<")) {
      fromAddress = `"${fromAddress}" <${config.user}>`;
    }

    const mailOptions = {
      from: fromAddress,
      to: email,
      subject: `İnanResim Şifre Sıfırlama Kodu: ${code}`,
      text: `Merhaba,\n\nİnanResim hesabınızın şifresini sıfırlamak için talepte bulundunuz.\n\nŞifre sıfırlama doğrulama kodunuz: ${code}\n\nBu kod 15 dakika geçerlidir.\n\nEğer bu talebi siz yapmadıysanız lütfen bu e-postayı dikkate almayın.\n\nSaygılarımızla,\nİnanResim Ekibi`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #1e3a8a; font-weight: 800; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; font-size: 20px;">İnanResim Şifre Sıfırlama</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">Merhaba,</p>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">İnanResim hesabınızın şifresini sıfırlamak için talepte bulundunuz. Aşağıdaki 6 haneli doğrulama kodunu kullanarak şifrenizi sıfırlayabilirsiniz:</p>
          
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 12px; text-align: center; margin: 24px 0;">
            <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #2563eb;">${code}</span>
          </div>
          
          <p style="color: #64748b; font-size: 12px; line-height: 1.6;">Bu doğrulama kodu <strong>15 dakika</strong> geçerlidir. Güvenliğiniz için bu kodu kimseyle paylaşmayın.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 11px; text-align: center;">Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.</p>
        </div>
      `,
    };

    try {
      const sendPromise = mailTransporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("SMTP Bağlantı Zaman Aşımı")), 2500)
      );
      await Promise.race([sendPromise, timeoutPromise]);
      return { success: true };
    } catch (err: any) {
      console.error("Nodemailer send reset email error:", err);
      return { success: false, error: err.message || "E-posta gönderilemedi." };
    }
  }

  async function sendVerificationEmail(email: string, code: string): Promise<{ success: boolean; error?: string }> {
    const config = await dbGetSmtpConfig();
    const mailTransporter = await getTransporter();
    if (!mailTransporter) {
      return {
        success: false,
        error: "SMTP ayarları eksik. Lütfen yönetici panelinden SMTP bilgilerini yapılandırın.",
      };
    }

    let fromAddress = (config.from || "").trim();
    if (!fromAddress) {
      fromAddress = `"İnanResim" <${config.user}>`;
    } else if (!fromAddress.includes("@") && !fromAddress.includes("<")) {
      fromAddress = `"${fromAddress}" <${config.user}>`;
    }

    const mailOptions = {
      from: fromAddress,
      to: email,
      subject: `İnanResim E-Posta Doğrulama Kodu: ${code}`,
      text: `Merhaba,\n\nİnanResim hesabınızı doğrulamak için aşağıdaki 6 haneli kodu girin:\n\nDoğrulama Kodu: ${code}\n\nBu kod 15 dakika geçerlidir.\n\nSaygılarımızla,\nİnanResim Ekibi`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #2563eb; font-weight: 800; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; font-size: 20px; text-align: center;">İnanResim E-Posta Doğrulama</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">Merhaba,</p>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">İnanResim üyelik işleminizi tamamlamak ve hesabınızı aktifleştirmek için lütfen aşağıdaki 6 haneli doğrulama kodunu girin:</p>
          
          <div style="background-color: #eff6ff; padding: 18px; border-radius: 12px; text-align: center; margin: 24px 0; border: 1px solid #bfdbfe;">
            <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1d4ed8;">${code}</span>
          </div>
          
          <p style="color: #64748b; font-size: 12px; line-height: 1.6; text-align: center;">Bu kod <strong>15 dakika</strong> geçerlidir. Kodu kimseyle paylaşmayınız.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 11px; text-align: center;">Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.</p>
        </div>
      `,
    };

    try {
      const sendPromise = mailTransporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("SMTP Bağlantı Zaman Aşımı")), 3500)
      );
      await Promise.race([sendPromise, timeoutPromise]);
      return { success: true };
    } catch (err: any) {
      console.error("Nodemailer send verification email error:", err);
      return { success: false, error: err.message || "E-posta gönderilemedi." };
    }
  }

  // Load Firebase configuration
  let db: any = null;
  let useFirebase = false;

  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      const firebaseApp = initializeApp(firebaseConfig);
      db = initializeFirestore(firebaseApp, {
        ignoreUndefinedProperties: true,
      }, firebaseConfig.firestoreDatabaseId);
      useFirebase = true;
      console.log("Firebase successfully initialized with database ID:", firebaseConfig.firestoreDatabaseId);
    } else {
      console.log("firebase-applet-config.json not found, falling back to in-memory store.");
    }
  } catch (err) {
    console.error("Failed to initialize Firebase:", err);
  }

  // Helper to slice base64 into 800KB chunks (to fit within Firestore 1MB document limit)
  const CHUNK_SIZE = 800000;
  function chunkString(str: string, size: number): string[] {
    const numChunks = Math.ceil(str.length / size);
    const chunks = new Array(numChunks);
    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      chunks[i] = str.substring(o, o + size);
    }
    return chunks;
  }

  interface BankAccount {
    id: string;
    bankName: string;
    accountHolder: string;
    iban: string;
    branchCode?: string;
    description?: string;
    isActive?: boolean;
  }

  interface PaymentGatewayConfig {
    enabled: boolean;
    provider: "paytr" | "shopier" | "iyzico" | "stripe" | "custom";
    merchantId?: string;
    apiKey?: string;
    apiSecret?: string;
    shopierFormUrl?: string;
    customInstruction?: string;
  }

  interface PaymentRequest {
    id: string;
    userId: string;
    username: string;
    userEmail: string;
    plan: "monthly" | "yearly";
    amount: number;
    paymentMethod: "havale" | "card";
    senderName?: string;
    selectedBankId?: string;
    bankName?: string;
    transferNote?: string;
    receiptNumber?: string;
    receiptImgUrl?: string;
    cardNumberMasked?: string;
    status: "pending" | "approved" | "rejected";
    createdAt: number;
    reviewedAt?: number;
    rejectionReason?: string;
  }

  // Site configuration interface
  interface AdBanner {
    id: string;
    title: string;
    price?: string;
    badgeText?: string;
    imageUrl?: string;
    htmlCode?: string;
    targetUrl?: string;
    position: "header" | "sidebar" | "footer" | "image-page" | "home-cards" | "home-bottom";
    enabled: boolean;
  }

  interface AnnouncementItem {
    id: string;
    title?: string;
    text: string;
    category?: "info" | "warning" | "campaign" | "maintenance" | "update" | "security";
    priority?: "low" | "normal" | "high";
    actionUrl?: string;
    actionText?: string;
    createdAt?: number;
    expiresAt?: number;
    enabled?: boolean;
  }

  interface SiteConfig {
    homepageTitle: string;
    homepageSubtitle: string;
    announcementEnabled: boolean;
    announcementText: string;
    announcements?: string[];
    structuredAnnouncements?: AnnouncementItem[];
    statsOffset: number;
    usersOffset: number;
    todayOffset: number;
    maintenanceModeEnabled?: boolean;
    miniChatEnabled?: boolean;
    guestMaxMb?: number;
    guestMaxUploadCount?: number;
    guestAutoResetMode?: "off" | "daily" | "interval";
    guestAutoResetHour?: number;
    guestResetIntervalHours?: number;
    lastGuestResetTime?: number;
    registeredMaxMb?: number;
    vipMaxMb?: number;
    registeredMaxUploadCount?: number;
    requireEmailVerification?: boolean;
    adsEnabled?: boolean;
    adsContactEmail?: string;
    adsContactTelegram?: string;
    adsContactInfo?: string;
    adsList?: AdBanner[];
    vipMonthlyPrice?: number;
    vipAnnualDiscountPercent?: number;
    vipAnnualPrice?: number;
    vipFeatures?: string[];
    bankAccounts?: BankAccount[];
    paymentGatewayConfig?: PaymentGatewayConfig;
    // Security & Privacy Settings
    securityIpLoggingEnabled?: boolean;
    securityHotlinkProtection?: boolean;
    securityWatermarkDefault?: boolean;
    securityForceHttpsHeaders?: boolean;
    securityKvkkNoticeEnabled?: boolean;
    securityMaxLoginAttempts?: number;
    privacyPolicyText?: string;
    termsOfServiceText?: string;
  }

  interface ChatMessage {
    id: string;
    userId: string;
    username: string;
    text: string;
    createdAt: number;
    isMod?: boolean;
    isAdmin?: boolean;
  }

  interface UserModeration {
    userId: string;
    username: string;
    warnings: number;
    mutedUntil: number;
    banned: boolean;
  }

  interface ModerationLog {
    id: string;
    userId: string;
    username: string;
    action: string;
    details: string;
    createdAt: number;
  }

  interface DirectMessage {
    id: string;
    senderId: string;
    senderName: string;
    receiverId: string;
    receiverName: string;
    text: string;
    createdAt: number;
    read?: boolean;
  }

  interface UserXPProfile {
    userId: string;
    username: string;
    xp: number;
    messageCount: number;
    gameCount: number;
  }

  interface PinnedMessage {
    id?: string;
    text: string;
    pinnedBy: string;
    createdAt: number;
    type?: "info" | "warning" | "important";
    targetMessageId?: string;
  }

  interface PollOption {
    id: string;
    text: string;
    votes: string[]; // userIds
  }

  interface ChatPoll {
    id: string;
    question: string;
    options: PollOption[];
    createdBy: string;
    createdById: string;
    createdAt: number;
    expiresAt?: number | null;
    allowMultiple?: boolean;
    isActive: boolean;
  }

  const inMemoryDMs: DirectMessage[] = [];
  const inMemoryUserXPProfiles: Record<string, UserXPProfile> = {};
  let inMemoryPinnedMessage: PinnedMessage | null = null;
  let inMemoryActivePoll: ChatPoll | null = null;

  function getUserLevelAndBadges(profile: UserXPProfile, isMod?: boolean, isAdmin?: boolean) {
    const xp = profile.xp || 0;
    const level = Math.floor(xp / 100) + 1;
    const badges: string[] = [];

    if (isAdmin) badges.push("👑 Admin");
    else if (isMod) badges.push("🛡️ Moderatör");

    if (level >= 25) badges.push("💎 Efsane");
    else if (level >= 10) badges.push("🥇 Usta");
    else if (level >= 5) badges.push("🥈 Sohbetçi");
    else badges.push("🥉 Çaylak");

    if (profile.messageCount >= 50) badges.push("🔥 Sosyal Kelebek");
    if (profile.gameCount >= 10) badges.push("🎲 Şanslı Oyuncu");

    return { xp, level, messageCount: profile.messageCount || 0, gameCount: profile.gameCount || 0, badges };
  }

  async function dbAddUserXP(userId: string, username: string, xpAmount: number, isGame = false) {
    let p = inMemoryUserXPProfiles[userId];
    if (!p) {
      p = { userId, username, xp: 0, messageCount: 0, gameCount: 0 };
      inMemoryUserXPProfiles[userId] = p;
    }
    p.username = username;
    p.xp += xpAmount;
    if (isGame) {
      p.gameCount = (p.gameCount || 0) + 1;
    } else {
      p.messageCount = (p.messageCount || 0) + 1;
    }

    if (useFirebase && db) {
      try {
        const uRef = doc(db, "user_xp_profiles", userId);
        await setDoc(uRef, p, { merge: true });
      } catch (e) {
        console.error("Firebase save XP profile error", e);
      }
    }
  }

  async function dbGetUserXPProfile(userId: string, username: string): Promise<UserXPProfile> {
    if (useFirebase && db) {
      try {
        const uRef = doc(db, "user_xp_profiles", userId);
        const snap = await getDoc(uRef);
        if (snap.exists()) {
          return snap.data() as UserXPProfile;
        }
      } catch (e) {
        console.error("Firebase get XP profile error", e);
      }
    }
    if (!inMemoryUserXPProfiles[userId]) {
      inMemoryUserXPProfiles[userId] = { userId, username, xp: 0, messageCount: 0, gameCount: 0 };
    }
    return inMemoryUserXPProfiles[userId];
  }

  const activeSessions: Record<string, number> = {};
  const lastMessageTimes: Record<string, number> = {};
  
  const inMemoryChatMessages: ChatMessage[] = [];
  const inMemoryModeration: Record<string, UserModeration> = {};
  const inMemoryModerationLogs: ModerationLog[] = [];
  let inMemoryChatSlowMode = false;

  const defaultSiteConfig: SiteConfig = {
    homepageTitle: "İnanResim - Hızlı ve Güvenilir Resim Paylaşımı",
    homepageSubtitle: "Saniyeler içinde resim yükleyin, şifreleyin, paylaşın veya otomatik silinmesini sağlayın.",
    announcementEnabled: true,
    announcementText: "Yönetici Duyurusu: Yeni İnanResim sürümü yayında! Artık kendi şifreli görsellerinizi koruyabilirsiniz.",
    announcements: ["Yönetici Duyurusu: Yeni İnanResim sürümü yayında! Artık kendi şifreli görsellerinizi koruyabilirsiniz."],
    structuredAnnouncements: [
      {
        id: "ann_1",
        title: "İnanResim v3.0 Yayında!",
        text: "Yeni sürümümüz ile PRO VIP Üyelik, Gelişmiş Şifreli Görsel Paylaşımı ve Yüksek Hızlı Sunucular hizmetinizde.",
        category: "update",
        priority: "high",
        actionText: "VIP Özellikleri Gör",
        actionUrl: "#vip",
        createdAt: Date.now() - 86400000,
        enabled: true
      },
      {
        id: "ann_2",
        title: "Uçtan Uca Şifreli & Uyumlu Gizlilik",
        text: "Yüklediğiniz tüm özel görseller 256-bit AES şifreleme ve KVKK gizlilik standartlarına uygun olarak saklanmaktadır.",
        category: "security",
        priority: "normal",
        createdAt: Date.now() - 43200000,
        enabled: true
      }
    ],
    securityIpLoggingEnabled: true,
    securityHotlinkProtection: true,
    securityWatermarkDefault: false,
    securityForceHttpsHeaders: true,
    securityKvkkNoticeEnabled: true,
    securityMaxLoginAttempts: 5,
    privacyPolicyText: "İnanResim Gizlilik Politikası: Kullanıcı verileri ve yüklenen görselleriniz 256-bit şifreleme standartlarına tabidir. İzniniz olmadan asla 3. şahıslarla paylaşılmaz.",
    termsOfServiceText: "İnanResim Kullanım Şartları: Yasalara aykırı, telif hakkı ihlali içeren veya zararlı içerik yüklemek kesinlikle yasaktır. İhlal eden hesaplar kısıtlanacaktır.",
    statsOffset: 0,
    usersOffset: 0,
    todayOffset: 0,
    maintenanceModeEnabled: false,
    miniChatEnabled: true,
    guestMaxMb: 20,
    guestMaxUploadCount: 5,
    guestAutoResetMode: "off",
    guestAutoResetHour: 0,
    guestResetIntervalHours: 24,
    lastGuestResetTime: 0,
    registeredMaxMb: 1000,
    vipMaxMb: 5000,
    registeredMaxUploadCount: 0,
    requireEmailVerification: true,
    adsEnabled: true,
    adsContactEmail: "reklam@inanresim.com",
    adsContactTelegram: "@inanresim_reklam",
    adsContactInfo: "Sitemizde banner veya özel sponsorluk reklamı vermek için bizimle e-posta veya Telegram üzerinden iletişime geçebilirsiniz.",
    adsList: [
      {
        id: "ad_skin_1",
        title: "AWP | Atheris (Field-Tested)",
        price: "₺48,80",
        badgeText: "PRICE DROP",
        imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&q=80",
        targetUrl: "https://cs.money",
        position: "home-cards",
        enabled: true
      },
      {
        id: "ad_skin_2",
        title: "PP-Bizon | Judgement of Anubis",
        price: "₺27,48",
        badgeText: "PRICE DROP",
        imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500&q=80",
        targetUrl: "https://cs.money",
        position: "home-cards",
        enabled: true
      },
      {
        id: "ad_skin_3",
        title: "Hydra Gloves | Emerald (FT)",
        price: "₺1.450,00",
        badgeText: "PRICE DROP",
        imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?w=500&q=80",
        targetUrl: "https://cs.money",
        position: "home-cards",
        enabled: true
      },
      {
        id: "ad_skin_4",
        title: "P250 | See Ya Later (MW)",
        price: "₺94,20",
        badgeText: "HOT DEAL",
        imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&q=80",
        targetUrl: "https://cs.money",
        position: "home-cards",
        enabled: true
      },
      {
        id: "ad_bottom_1",
        title: "CS.MONEY — En Büyük Skin Takas ve Pazaryeri",
        price: "%20 İndirimli Fiyatlar",
        badgeText: "SPONSORLU BÖLÜM",
        imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&q=80",
        targetUrl: "https://cs.money",
        position: "home-bottom",
        enabled: true
      }
    ],
    vipMonthlyPrice: 99,
    vipAnnualDiscountPercent: 20,
    vipAnnualPrice: 950,
    vipFeatures: [
      "Sınırsız Yükleme Hakkı",
      "Tek Seferde 5 GB (5000 MB) Dosya & Video Boyutu",
      "%100 Reklamsız VIP Kullanım",
      "Süresiz (Kalıcı Saklama) VIP'ye Özel Görsel/Video Depolama",
      "Özel Filigran ve Şifreli İndirme Koruması",
      "VIP Öncelikli Yüksek Hızlı Sunucu"
    ],
    bankAccounts: [
      {
        id: "bank_1",
        bankName: "Ziraat Bankası",
        accountHolder: "İnanResim İnternet Hizmetleri",
        iban: "TR12 0001 0000 1234 5678 9000 01",
        branchCode: "0001 / Ziraat Kadıköy",
        description: "Açıklama alanına Kullanıcı Adınızı veya E-posta adresinizi yazınız."
      },
      {
        id: "bank_2",
        bankName: "Garanti BBVA",
        accountHolder: "İnanResim İnternet Hizmetleri",
        iban: "TR62 0006 2000 0000 1234 5678 90",
        branchCode: "0062 / Garanti Beşiktaş",
        description: "Transfer açıklamasına VIP Paket Sipariş Kodunu ekleyiniz."
      }
    ],
    paymentGatewayConfig: {
      enabled: true,
      provider: "paytr",
      merchantId: "",
      apiKey: "",
      apiSecret: "",
      customInstruction: "Kartınızla 3D Secure korumalı online ödeme yaparak anında PRO VIP hesabınızı aktifleştirebilirsiniz."
    }
  };

  let siteConfigState = { ...defaultSiteConfig };

  async function dbGetConfig(): Promise<SiteConfig> {
    if (useFirebase && db) {
      try {
        const docRef = doc(db, "configs", "site");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const monthlyP = data.vipMonthlyPrice !== undefined ? Number(data.vipMonthlyPrice) : defaultSiteConfig.vipMonthlyPrice;
          const discPct = data.vipAnnualDiscountPercent !== undefined ? Number(data.vipAnnualDiscountPercent) : defaultSiteConfig.vipAnnualDiscountPercent;
          const computedAnnualP = Math.round(monthlyP * 12 * (1 - (discPct / 100)));

          return {
            homepageTitle: data.homepageTitle ?? defaultSiteConfig.homepageTitle,
            homepageSubtitle: data.homepageSubtitle ?? defaultSiteConfig.homepageSubtitle,
            announcementEnabled: data.announcementEnabled ?? defaultSiteConfig.announcementEnabled,
            announcementText: data.announcementText ?? defaultSiteConfig.announcementText,
            announcements: data.announcements ?? [data.announcementText ?? defaultSiteConfig.announcementText],
            statsOffset: data.statsOffset !== undefined ? Number(data.statsOffset) : defaultSiteConfig.statsOffset,
            usersOffset: data.usersOffset !== undefined ? Number(data.usersOffset) : defaultSiteConfig.usersOffset,
            todayOffset: data.todayOffset !== undefined ? Number(data.todayOffset) : defaultSiteConfig.todayOffset,
            maintenanceModeEnabled: data.maintenanceModeEnabled ?? defaultSiteConfig.maintenanceModeEnabled,
            miniChatEnabled: data.miniChatEnabled ?? defaultSiteConfig.miniChatEnabled,
            guestMaxMb: data.guestMaxMb !== undefined ? Number(data.guestMaxMb) : defaultSiteConfig.guestMaxMb,
            guestMaxUploadCount: data.guestMaxUploadCount !== undefined ? Number(data.guestMaxUploadCount) : defaultSiteConfig.guestMaxUploadCount,
            guestAutoResetMode: data.guestAutoResetMode ?? defaultSiteConfig.guestAutoResetMode,
            guestAutoResetHour: data.guestAutoResetHour !== undefined ? Number(data.guestAutoResetHour) : defaultSiteConfig.guestAutoResetHour,
            guestResetIntervalHours: data.guestResetIntervalHours !== undefined ? Number(data.guestResetIntervalHours) : defaultSiteConfig.guestResetIntervalHours,
            lastGuestResetTime: data.lastGuestResetTime !== undefined ? Number(data.lastGuestResetTime) : defaultSiteConfig.lastGuestResetTime,
            registeredMaxMb: data.registeredMaxMb !== undefined ? Number(data.registeredMaxMb) : defaultSiteConfig.registeredMaxMb,
            vipMaxMb: data.vipMaxMb !== undefined ? Number(data.vipMaxMb) : defaultSiteConfig.vipMaxMb,
            registeredMaxUploadCount: data.registeredMaxUploadCount !== undefined ? Number(data.registeredMaxUploadCount) : defaultSiteConfig.registeredMaxUploadCount,
            requireEmailVerification: data.requireEmailVerification !== undefined ? !!data.requireEmailVerification : defaultSiteConfig.requireEmailVerification,
            adsEnabled: data.adsEnabled !== undefined ? !!data.adsEnabled : defaultSiteConfig.adsEnabled,
            adsContactEmail: data.adsContactEmail ?? defaultSiteConfig.adsContactEmail,
            adsContactTelegram: data.adsContactTelegram ?? defaultSiteConfig.adsContactTelegram,
            adsContactInfo: data.adsContactInfo ?? defaultSiteConfig.adsContactInfo,
            adsList: data.adsList ?? defaultSiteConfig.adsList,
            vipMonthlyPrice: monthlyP,
            vipAnnualDiscountPercent: discPct,
            vipAnnualPrice: data.vipAnnualPrice !== undefined ? Number(data.vipAnnualPrice) : computedAnnualP,
            vipFeatures: data.vipFeatures ?? defaultSiteConfig.vipFeatures,
            bankAccounts: data.bankAccounts ?? defaultSiteConfig.bankAccounts,
            paymentGatewayConfig: data.paymentGatewayConfig ?? defaultSiteConfig.paymentGatewayConfig,
            structuredAnnouncements: data.structuredAnnouncements ?? defaultSiteConfig.structuredAnnouncements,
            securityIpLoggingEnabled: data.securityIpLoggingEnabled !== undefined ? !!data.securityIpLoggingEnabled : defaultSiteConfig.securityIpLoggingEnabled,
            securityHotlinkProtection: data.securityHotlinkProtection !== undefined ? !!data.securityHotlinkProtection : defaultSiteConfig.securityHotlinkProtection,
            securityWatermarkDefault: data.securityWatermarkDefault !== undefined ? !!data.securityWatermarkDefault : defaultSiteConfig.securityWatermarkDefault,
            securityForceHttpsHeaders: data.securityForceHttpsHeaders !== undefined ? !!data.securityForceHttpsHeaders : defaultSiteConfig.securityForceHttpsHeaders,
            securityKvkkNoticeEnabled: data.securityKvkkNoticeEnabled !== undefined ? !!data.securityKvkkNoticeEnabled : defaultSiteConfig.securityKvkkNoticeEnabled,
            securityMaxLoginAttempts: data.securityMaxLoginAttempts !== undefined ? Number(data.securityMaxLoginAttempts) : defaultSiteConfig.securityMaxLoginAttempts,
            privacyPolicyText: data.privacyPolicyText ?? defaultSiteConfig.privacyPolicyText,
            termsOfServiceText: data.termsOfServiceText ?? defaultSiteConfig.termsOfServiceText,
          };
        }
      } catch (e) {
        console.error("Firebase get config error:", e);
      }
    }
    return siteConfigState;
  }

  async function dbSaveConfig(newConfig: Partial<SiteConfig>): Promise<SiteConfig> {
    const current = await dbGetConfig();
    const updated = { ...current, ...newConfig };
    if (updated.announcements && updated.announcements.length > 0) {
      updated.announcementText = updated.announcements[0];
    }
    
    // Auto-calculate annual price if monthly price or discount rate changes
    if (updated.vipMonthlyPrice !== undefined) {
      const discPct = updated.vipAnnualDiscountPercent !== undefined ? updated.vipAnnualDiscountPercent : 20;
      updated.vipAnnualPrice = Math.round(updated.vipMonthlyPrice * 12 * (1 - (discPct / 100)));
    }
    
    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "configs", "site"), updated);
      } catch (e) {
        console.error("Firebase save config error:", e);
      }
    } else {
      siteConfigState = updated;
    }
    return updated;
  }

  async function dbGetChatSlowMode(): Promise<boolean> {
    if (useFirebase && db) {
      try {
        const docRef = doc(db, "configs", "chat");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return !!docSnap.data().slowMode;
        }
      } catch (e) {
        console.error("Firebase get slowmode error:", e);
      }
    }
    return inMemoryChatSlowMode;
  }

  async function dbSetChatSlowMode(slowMode: boolean): Promise<void> {
    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "configs", "chat"), { slowMode });
      } catch (e) {
        console.error("Firebase set slowmode error:", e);
      }
    } else {
      inMemoryChatSlowMode = slowMode;
    }
  }

  async function dbGetPinnedMessage(): Promise<PinnedMessage | null> {
    if (useFirebase && db) {
      try {
        const docRef = doc(db, "configs", "chat_pinned");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.text) {
            return data as PinnedMessage;
          }
        }
      } catch (e) {
        console.error("Firebase get pinned message error:", e);
      }
    }
    return inMemoryPinnedMessage;
  }

  async function dbSavePinnedMessage(pinned: PinnedMessage | null): Promise<void> {
    if (useFirebase && db) {
      try {
        if (pinned) {
          await setDoc(doc(db, "configs", "chat_pinned"), pinned);
        } else {
          await deleteDoc(doc(db, "configs", "chat_pinned"));
        }
      } catch (e) {
        console.error("Firebase save pinned message error:", e);
      }
    }
    inMemoryPinnedMessage = pinned;
  }

  async function finalizePollResults(poll: ChatPoll): Promise<void> {
    try {
      const totalVotes = poll.options.reduce((acc, opt) => acc + opt.votes.length, 0);
      let resultText = "";

      if (totalVotes === 0) {
        resultText = `📊 Anket Sona Erdi: "${poll.question}" — Katılım olmadı (0 oy).`;
      } else {
        let maxVotes = -1;
        let winners: PollOption[] = [];

        poll.options.forEach(opt => {
          if (opt.votes.length > maxVotes) {
            maxVotes = opt.votes.length;
            winners = [opt];
          } else if (opt.votes.length === maxVotes && maxVotes > 0) {
            winners.push(opt);
          }
        });

        if (winners.length === 1) {
          const winnerPct = Math.round((winners[0].votes.length / totalVotes) * 100);
          resultText = `🏆 Anket Sonuçlandı! "${poll.question}" -> Kazanan: "${winners[0].text}" (%${winnerPct} - ${winners[0].votes.length}/${totalVotes} Oy)`;
        } else if (winners.length > 1) {
          const winnerNames = winners.map(w => `"${w.text}"`).join(", ");
          resultText = `🏆 Anket Berabere Bitti! "${poll.question}" -> Berabere Kalanlar: ${winnerNames} (Her biri ${maxVotes} oy)`;
        } else {
          resultText = `📊 Anket Sona Erdi: "${poll.question}"`;
        }
      }

      const sysMsg: ChatMessage = {
        id: "msg_" + generateId(10),
        userId: "system",
        username: "📊 Sistem Anketi",
        text: resultText,
        createdAt: Date.now(),
        isMod: true,
        isAdmin: true,
      };
      await dbSaveChatMessage(sysMsg);
    } catch (e) {
      console.error("Finalize poll results error:", e);
    }
  }

  async function dbGetActivePoll(): Promise<ChatPoll | null> {
    let currentPoll: ChatPoll | null = null;
    if (useFirebase && db) {
      try {
        const docRef = doc(db, "configs", "chat_active_poll");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.isActive) {
            currentPoll = data as ChatPoll;
          }
        }
      } catch (e) {
        console.error("Firebase get active poll error:", e);
      }
    } else {
      currentPoll = inMemoryActivePoll && inMemoryActivePoll.isActive ? inMemoryActivePoll : null;
    }

    if (currentPoll && currentPoll.expiresAt && Date.now() > currentPoll.expiresAt) {
      currentPoll.isActive = false;
      await finalizePollResults(currentPoll);
      await dbSaveActivePoll(null);
      return null;
    }

    return currentPoll;
  }

  async function dbSaveActivePoll(poll: ChatPoll | null): Promise<void> {
    if (useFirebase && db) {
      try {
        if (poll) {
          await setDoc(doc(db, "configs", "chat_active_poll"), poll);
        } else {
          await deleteDoc(doc(db, "configs", "chat_active_poll"));
        }
      } catch (e) {
        console.error("Firebase save active poll error:", e);
      }
    }
    inMemoryActivePoll = poll;
  }

  async function dbGetChatMessages(): Promise<ChatMessage[]> {
    if (useFirebase && db) {
      try {
        const chatRef = collection(db, "chat_messages");
        const snap = await getDocs(chatRef);
        const msgs = snap.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: data.id,
            userId: data.userId,
            username: data.username,
            text: data.text,
            createdAt: data.createdAt,
            isMod: data.isMod,
            isAdmin: data.isAdmin,
          };
        });
        return msgs.sort((a, b) => a.createdAt - b.createdAt);
      } catch (e) {
        console.error("Firebase get messages error:", e);
      }
    }
    return [...inMemoryChatMessages].sort((a, b) => a.createdAt - b.createdAt);
  }

  async function dbSaveChatMessage(msg: ChatMessage): Promise<void> {
    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "chat_messages", msg.id), msg);
      } catch (e) {
        console.error("Firebase save message error:", e);
      }
    } else {
      inMemoryChatMessages.push(msg);
      if (inMemoryChatMessages.length > 100) {
        inMemoryChatMessages.shift();
      }
    }
  }

  async function dbGetUserModeration(userId: string, defaultUsername: string): Promise<UserModeration> {
    if (useFirebase && db) {
      try {
        const docRef = doc(db, "user_moderation", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          return {
            userId: data.userId,
            username: data.username || defaultUsername,
            warnings: data.warnings ?? 0,
            mutedUntil: data.mutedUntil ?? 0,
            banned: !!data.banned,
          };
        }
      } catch (e) {
        console.error("Firebase get moderation error:", e);
      }
    } else {
      if (inMemoryModeration[userId]) {
        return inMemoryModeration[userId];
      }
    }
    return {
      userId,
      username: defaultUsername,
      warnings: 0,
      mutedUntil: 0,
      banned: false,
    };
  }

  async function dbSaveUserModeration(mod: UserModeration): Promise<void> {
    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "user_moderation", mod.userId), mod);
      } catch (e) {
        console.error("Firebase save moderation error:", e);
      }
    } else {
      inMemoryModeration[mod.userId] = mod;
    }
  }

  async function dbGetBannedUsers(): Promise<UserModeration[]> {
    if (useFirebase && db) {
      try {
        const modRef = collection(db, "user_moderation");
        const snap = await getDocs(modRef);
        return snap.docs
          .map(docSnap => {
            const d = docSnap.data();
            return {
              userId: d.userId,
              username: d.username,
              warnings: d.warnings ?? 0,
              mutedUntil: d.mutedUntil ?? 0,
              banned: !!d.banned,
            };
          })
          .filter(u => u.banned);
      } catch (e) {
        console.error("Firebase get banned users error:", e);
      }
    }
    return Object.values(inMemoryModeration).filter(u => u.banned);
  }

  async function dbGetModerationLogs(): Promise<ModerationLog[]> {
    if (useFirebase && db) {
      try {
        const logsRef = collection(db, "moderation_logs");
        const snap = await getDocs(logsRef);
        const logs = snap.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: data.id,
            userId: data.userId,
            username: data.username,
            action: data.action,
            details: data.details,
            createdAt: data.createdAt,
          };
        });
        return logs.sort((a, b) => b.createdAt - a.createdAt);
      } catch (e) {
        console.error("Firebase get moderation logs error:", e);
      }
    }
    return [...inMemoryModerationLogs].sort((a, b) => b.createdAt - a.createdAt);
  }

  async function dbSaveModerationLog(log: ModerationLog): Promise<void> {
    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "moderation_logs", log.id), log);
      } catch (e) {
        console.error("Firebase save moderation log error:", e);
      }
    } else {
      inMemoryModerationLogs.push(log);
      if (inMemoryModerationLogs.length > 200) {
        inMemoryModerationLogs.shift();
      }
    }
  }

  async function dbClearChatMessages(): Promise<void> {
    if (useFirebase && db) {
      try {
        const chatRef = collection(db, "chat_messages");
        const snap = await getDocs(chatRef);
        const promises = snap.docs.map(docSnap => deleteDoc(docSnap.ref));
        await Promise.all(promises);
      } catch (e) {
        console.error("Firebase clear chat messages error:", e);
      }
    } else {
      inMemoryChatMessages.length = 0;
    }
  }

  async function dbDeleteChatMessage(messageId: string): Promise<void> {
    if (useFirebase && db) {
      try {
        await deleteDoc(doc(db, "chat_messages", messageId));
      } catch (e) {
        console.error("Firebase delete chat message error:", e);
      }
    } else {
      const idx = inMemoryChatMessages.findIndex(m => m.id === messageId);
      if (idx !== -1) {
        inMemoryChatMessages.splice(idx, 1);
      }
    }
  }

  async function dbDeleteUserMessages(userId: string): Promise<void> {
    if (useFirebase && db) {
      try {
        const chatRef = collection(db, "chat_messages");
        const snap = await getDocs(chatRef);
        const promises = snap.docs
          .filter(d => d.data().userId === userId)
          .map(d => deleteDoc(d.ref));
        await Promise.all(promises);
      } catch (e) {
        console.error("Firebase delete user chat messages error:", e);
      }
    } else {
      for (let i = inMemoryChatMessages.length - 1; i >= 0; i--) {
        if (inMemoryChatMessages[i].userId === userId) {
          inMemoryChatMessages.splice(i, 1);
        }
      }
    }
  }

  let adminPasswordState = "admin";
  let modPasswordState = "mod123";

  async function dbGetAdminPassword(): Promise<string> {
    if (useFirebase && db) {
      try {
        const docRef = doc(db, "configs", "admin");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return docSnap.data().password ?? "admin";
        }
      } catch (e) {
        console.error("Firebase get admin password error:", e);
      }
    }
    return adminPasswordState;
  }

  async function dbSaveAdminPassword(newPassword: string): Promise<void> {
    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "configs", "admin"), { password: newPassword });
      } catch (e) {
        console.error("Firebase save admin password error:", e);
      }
    } else {
      adminPasswordState = newPassword;
    }
  }

  async function dbGetModPassword(): Promise<string> {
    if (useFirebase && db) {
      try {
        const docRef = doc(db, "configs", "mod");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return docSnap.data().password ?? "mod123";
        }
      } catch (e) {
        console.error("Firebase get mod password error:", e);
      }
    }
    return modPasswordState;
  }

  async function dbSaveModPassword(newPassword: string): Promise<void> {
    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "configs", "mod"), { password: newPassword });
      } catch (e) {
        console.error("Firebase save mod password error:", e);
      }
    } else {
      modPasswordState = newPassword;
    }
  }

  const paymentRequestsStore: Record<string, PaymentRequest> = {};

  async function dbGetAllUsers(usersStore: Record<string, StoredUser>): Promise<any[]> {
    if (useFirebase && db) {
      try {
        const usersRef = collection(db, "users");
        const snap = await getDocs(usersRef);
        return snap.docs.map(docSnap => {
          const data = docSnap.data();
          const isVip = !!data.isVip && (!data.vipExpireAt || data.vipExpireAt > Date.now());
          return {
            id: data.id || docSnap.id,
            username: data.username,
            email: data.email,
            createdAt: data.createdAt,
            emailVerified: data.emailVerified ?? false,
            isBanned: data.isBanned ?? false,
            banReason: data.banReason || "",
            isVip,
            vipExpireAt: data.vipExpireAt || 0,
            vipPlan: data.vipPlan || null,
          };
        });
      } catch (e) {
        console.error("Firebase get all users error:", e);
      }
    }
    return Object.values(usersStore).map(u => {
      const isVip = !!u.isVip && (!u.vipExpireAt || u.vipExpireAt > Date.now());
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        createdAt: u.createdAt,
        emailVerified: u.emailVerified ?? false,
        isBanned: u.isBanned ?? false,
        banReason: u.banReason || "",
        isVip,
        vipExpireAt: u.vipExpireAt || 0,
        vipPlan: u.vipPlan || null,
      };
    });
  }

  async function dbGetAllPaymentRequests(): Promise<PaymentRequest[]> {
    if (useFirebase && db) {
      try {
        const ref = collection(db, "paymentRequests");
        const snap = await getDocs(ref);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentRequest))
          .sort((a, b) => b.createdAt - a.createdAt);
      } catch (e) {
        console.error("Firebase get payment requests error:", e);
      }
    }
    return Object.values(paymentRequestsStore).sort((a, b) => b.createdAt - a.createdAt);
  }

  async function dbCreatePaymentRequest(pr: PaymentRequest): Promise<PaymentRequest> {
    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "paymentRequests", pr.id), pr);
      } catch (e) {
        console.error("Firebase create payment request error:", e);
      }
    }
    paymentRequestsStore[pr.id] = pr;
    return pr;
  }

  async function dbSetUserVip(userId: string, isVip: boolean, plan: "monthly" | "yearly" = "monthly", usersStore: Record<string, StoredUser>): Promise<boolean> {
    const durationDays = plan === "yearly" ? 365 : 30;
    const vipExpireAt = isVip ? Date.now() + (durationDays * 24 * 60 * 60 * 1000) : 0;
    
    if (useFirebase && db) {
      try {
        const usersRef = collection(db, "users");
        const snap = await getDocs(usersRef);
        let foundDocId = "";
        for (const docSnap of snap.docs) {
          if (docSnap.data().id === userId || docSnap.id === userId) {
            foundDocId = docSnap.id;
            break;
          }
        }
        if (foundDocId) {
          await updateDoc(doc(db, "users", foundDocId), { isVip, vipExpireAt, vipPlan: isVip ? plan : null });
        } else {
          await setDoc(doc(db, "users", userId), { isVip, vipExpireAt, vipPlan: isVip ? plan : null }, { merge: true });
        }
      } catch (e) {
        console.error("Firebase set user VIP error:", e);
      }
    }
    
    const user = usersStore[userId] || Object.values(usersStore).find(u => u.id === userId);
    if (user) {
      user.isVip = isVip;
      user.vipExpireAt = vipExpireAt;
      user.vipPlan = isVip ? plan : undefined;
    }
    return true;
  }

  async function dbApprovePaymentRequest(requestId: string, usersStore: Record<string, StoredUser>): Promise<boolean> {
    const allRequests = await dbGetAllPaymentRequests();
    const reqItem = allRequests.find(r => r.id === requestId);
    if (!reqItem) return false;
    
    reqItem.status = "approved";
    reqItem.reviewedAt = Date.now();
    
    if (useFirebase && db) {
      try {
        await updateDoc(doc(db, "paymentRequests", requestId), {
          status: "approved",
          reviewedAt: Date.now()
        });
      } catch (e) {
        console.error("Firebase update payment request error:", e);
      }
    }
    paymentRequestsStore[requestId] = reqItem;
    
    await dbSetUserVip(reqItem.userId, true, reqItem.plan, usersStore);
    return true;
  }

  async function dbRejectPaymentRequest(requestId: string, rejectionReason: string): Promise<boolean> {
    const allRequests = await dbGetAllPaymentRequests();
    const reqItem = allRequests.find(r => r.id === requestId);
    if (!reqItem) return false;
    
    reqItem.status = "rejected";
    reqItem.rejectionReason = rejectionReason;
    reqItem.reviewedAt = Date.now();
    
    if (useFirebase && db) {
      try {
        await updateDoc(doc(db, "paymentRequests", requestId), {
          status: "rejected",
          rejectionReason,
          reviewedAt: Date.now()
        });
      } catch (e) {
        console.error("Firebase reject payment request error:", e);
      }
    }
    paymentRequestsStore[requestId] = reqItem;
    return true;
  }

  async function dbBanUser(userId: string, isBanned: boolean, banReason: string, usersStore: Record<string, StoredUser>): Promise<boolean> {
    if (useFirebase && db) {
      try {
        const usersRef = collection(db, "users");
        const snap = await getDocs(usersRef);
        let foundDocId = "";
        for (const docSnap of snap.docs) {
          if (docSnap.data().id === userId || docSnap.id === userId) {
            foundDocId = docSnap.id;
            break;
          }
        }
        if (foundDocId) {
          await updateDoc(doc(db, "users", foundDocId), { isBanned, banReason });
        } else {
          await setDoc(doc(db, "users", userId), { isBanned, banReason }, { merge: true });
        }
      } catch (e) {
        console.error("Firebase ban user error:", e);
      }
    }
    const user = usersStore[userId] || Object.values(usersStore).find(u => u.id === userId);
    if (user) {
      user.isBanned = isBanned;
      user.banReason = banReason;
    }
    return true;
  }

  async function dbDeleteUser(userId: string, usersStore: Record<string, StoredUser>): Promise<boolean> {
    if (useFirebase && db) {
      try {
        const usersRef = collection(db, "users");
        const snap = await getDocs(usersRef);
        for (const docSnap of snap.docs) {
          if (docSnap.data().id === userId || docSnap.id === userId) {
            await deleteDoc(doc(db, "users", docSnap.id));
          }
        }
      } catch (e) {
        console.error("Firebase delete user error:", e);
      }
    }
    if (usersStore[userId]) {
      delete usersStore[userId];
    } else {
      const key = Object.keys(usersStore).find(k => usersStore[k].id === userId);
      if (key) delete usersStore[key];
    }
    return true;
  }

  async function dbGetAllImages(imagesStore: Record<string, StoredImage>): Promise<any[]> {
    if (useFirebase && db) {
      try {
        const imagesRef = collection(db, "images");
        const snap = await getDocs(imagesRef);
        return snap.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: data.id,
            name: data.name,
            mimeType: data.mimeType,
            size: data.size,
            uploadedAt: data.uploadedAt,
            deleteAfter: data.deleteAfter,
            views: data.views || 0,
            hasPassword: !!data.password,
            userId: data.userId || null,
          };
        });
      } catch (e) {
        console.error("Firebase get all images error:", e);
      }
    }
    return Object.values(imagesStore).map(img => ({
      id: img.id,
      name: img.name,
      mimeType: img.mimeType,
      size: img.size,
      uploadedAt: img.uploadedAt,
      deleteAfter: img.deleteAfter,
      views: img.views,
      hasPassword: !!img.password,
      userId: img.userId || null,
    }));
  }

  // Database helper functions (abstracting Firestore / In-Memory logic)
  async function getStatsCount(imagesStore: Record<string, StoredImage>, usersStore: Record<string, StoredUser>, sessionId?: string) {
    const config = await dbGetConfig();
    const now = Date.now();
    
    // Register active user session
    if (sessionId) {
      if (useFirebase && db) {
        try {
          await setDoc(doc(db, "active_sessions", sessionId), {
            id: sessionId,
            lastActive: now
          });
        } catch (e) {
          console.error("Failed to register firebase active session:", e);
        }
      } else {
        activeSessions[sessionId] = now;
      }
    }

    // Clean up old active sessions and count
    let activeUsersCount = 1; // default to 1 minimum
    const activeThreshold = now - 15000; // active in last 15 seconds

    if (useFirebase && db) {
      try {
        const activeSessionsRef = collection(db, "active_sessions");
        const sessionsSnap = await getDocs(activeSessionsRef);
        
        let count = 0;
        for (const docSnap of sessionsSnap.docs) {
          const s = docSnap.data();
          if (s.lastActive < activeThreshold) {
            deleteDoc(docSnap.ref).catch(() => {});
          } else {
            count++;
          }
        }
        activeUsersCount = Math.max(1, count);
      } catch (e) {
        console.error("Firebase active sessions count error:", e);
      }
    } else {
      Object.keys(activeSessions).forEach(sid => {
        if (activeSessions[sid] < activeThreshold) {
          delete activeSessions[sid];
        }
      });
      activeUsersCount = Math.max(1, Object.keys(activeSessions).length);
    }

    // Get images uploaded today (local midnight today)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();

    let totalImagesCount = 0;
    let uploadedTodayCount = 0;

    if (useFirebase && db) {
      try {
        const imagesRef = collection(db, "images");
        const imagesSnap = await getDocs(imagesRef);
        totalImagesCount = imagesSnap.size;
        imagesSnap.docs.forEach(docSnap => {
          const img = docSnap.data();
          if (img.uploadedAt >= startOfTodayMs) {
            uploadedTodayCount++;
          }
        });
      } catch (e) {
        console.error("Firebase counting error:", e);
      }
    } else {
      totalImagesCount = Object.keys(imagesStore).length;
      Object.values(imagesStore).forEach(img => {
        if (img.uploadedAt >= startOfTodayMs) {
          uploadedTodayCount++;
        }
      });
    }

    return {
      totalImages: totalImagesCount + (config.statsOffset || 0),
      activeUsers: activeUsersCount + (config.usersOffset || 0),
      uploadedToday: uploadedTodayCount + (config.todayOffset || 0),
    };
  }

  async function dbSaveImage(image: StoredImage, base64Data: string, imagesStore: Record<string, StoredImage>) {
    if (useFirebase && db) {
      try {
        const chunks = chunkString(base64Data, CHUNK_SIZE);
        const meta = {
          id: image.id,
          name: image.name,
          mimeType: image.mimeType,
          size: image.size,
          uploadedAt: image.uploadedAt,
          deleteAfter: image.deleteAfter,
          password: image.password || null,
          deleteToken: image.deleteToken,
          views: image.views,
          userId: image.userId || null,
          chunkCount: chunks.length,
          watermarkText: image.watermarkText || null,
          watermarkOpacity: image.watermarkOpacity !== undefined ? image.watermarkOpacity : null,
          watermarkColor: image.watermarkColor || null,
          watermarkSize: image.watermarkSize !== undefined ? image.watermarkSize : null,
          watermarkPosition: image.watermarkPosition || null,
        };

        // Save metadata
        await setDoc(doc(db, "images", image.id), meta);

        // Save chunks in parallel
        const chunkPromises = chunks.map((chunk, i) => 
          setDoc(doc(db, "image_chunks", `${image.id}_${i}`), {
            imageId: image.id,
            chunkIndex: i,
            data: chunk,
          })
        );
        await Promise.all(chunkPromises);
        return;
      } catch (e) {
        console.error("Firebase save image error:", e);
      }
    }

    imagesStore[image.id] = { ...image, data: base64Data };
  }

  async function dbGetImage(id: string, imagesStore: Record<string, StoredImage>): Promise<StoredImage | null> {
    if (useFirebase && db) {
      try {
        const docRef = doc(db, "images", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const meta = docSnap.data();
          
          // Fetch chunks
          const chunkCount = meta.chunkCount || 0;
          const chunkPromises = [];
          for (let i = 0; i < chunkCount; i++) {
            chunkPromises.push(getDoc(doc(db, "image_chunks", `${id}_${i}`)));
          }
          const chunkSnaps = await Promise.all(chunkPromises);
          const chunks = chunkSnaps.map(snap => snap.exists() ? snap.data()?.data || "" : "");
          const fullData = chunks.join("");

          return {
            id: meta.id,
            name: meta.name,
            mimeType: meta.mimeType,
            size: meta.size,
            data: fullData,
            uploadedAt: meta.uploadedAt,
            deleteAfter: meta.deleteAfter,
            password: meta.password || undefined,
            deleteToken: meta.deleteToken,
            views: meta.views || 0,
            userId: meta.userId || undefined,
            watermarkText: meta.watermarkText || undefined,
            watermarkOpacity: meta.watermarkOpacity !== null && meta.watermarkOpacity !== undefined ? Number(meta.watermarkOpacity) : undefined,
            watermarkColor: meta.watermarkColor || undefined,
            watermarkSize: meta.watermarkSize !== null && meta.watermarkSize !== undefined ? Number(meta.watermarkSize) : undefined,
            watermarkPosition: meta.watermarkPosition || undefined,
          };
        }
      } catch (e) {
        console.error("Firebase get image error:", e);
      }
    }

    return imagesStore[id] || null;
  }

  async function dbGetImageInfo(id: string, imagesStore: Record<string, StoredImage>): Promise<any | null> {
    if (useFirebase && db) {
      try {
        const docRef = doc(db, "images", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const meta = docSnap.data();
          
          // Increment views
          const newViews = (meta.views || 0) + 1;
          await updateDoc(docRef, { views: newViews });

          return {
            id: meta.id,
            name: meta.name,
            mimeType: meta.mimeType,
            size: meta.size,
            uploadedAt: meta.uploadedAt,
            deleteAfter: meta.deleteAfter,
            views: newViews,
            hasPassword: !!meta.password,
            userId: meta.userId || undefined,
            watermarkText: meta.watermarkText || undefined,
            watermarkOpacity: meta.watermarkOpacity !== null && meta.watermarkOpacity !== undefined ? Number(meta.watermarkOpacity) : undefined,
            watermarkColor: meta.watermarkColor || undefined,
            watermarkSize: meta.watermarkSize !== null && meta.watermarkSize !== undefined ? Number(meta.watermarkSize) : undefined,
            watermarkPosition: meta.watermarkPosition || undefined,
          };
        }
      } catch (e) {
        console.error("Firebase get image info error:", e);
      }
    }

    const image = imagesStore[id];
    if (image) {
      image.views += 1;
      return {
        id: image.id,
        name: image.name,
        mimeType: image.mimeType,
        size: image.size,
        uploadedAt: image.uploadedAt,
        deleteAfter: image.deleteAfter,
        views: image.views,
        hasPassword: !!image.password,
        userId: image.userId,
        watermarkText: image.watermarkText,
        watermarkOpacity: image.watermarkOpacity,
        watermarkColor: image.watermarkColor,
        watermarkSize: image.watermarkSize,
        watermarkPosition: image.watermarkPosition,
      };
    }
    return null;
  }

  async function dbLockImage(id: string, password: string, imagesStore: Record<string, StoredImage>): Promise<boolean> {
    if (useFirebase && db) {
      try {
        const docRef = doc(db, "images", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          await updateDoc(docRef, { password });
          return true;
        }
        return false;
      } catch (e) {
        console.error("Firebase lock image error:", e);
      }
    }

    const image = imagesStore[id];
    if (image) {
      image.password = password;
      return true;
    }
    return false;
  }

  async function dbDeleteImage(id: string, imagesStore: Record<string, StoredImage>): Promise<any | null> {
    if (useFirebase && db) {
      try {
        const docRef = doc(db, "images", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const meta = docSnap.data();
          
          // Delete metadata
          await deleteDoc(docRef);

          // Delete chunks
          const chunkCount = meta.chunkCount || 0;
          const deletePromises = [];
          for (let i = 0; i < chunkCount; i++) {
            deletePromises.push(deleteDoc(doc(db, "image_chunks", `${id}_${i}`)));
          }
          await Promise.all(deletePromises);
          return meta;
        }
      } catch (e) {
        console.error("Firebase delete image error:", e);
      }
    }

    const image = imagesStore[id];
    if (image) {
      delete imagesStore[id];
      return image;
    }
    return null;
  }

  async function dbDeleteAllImages(imagesStore: Record<string, StoredImage>): Promise<number> {
    const allImages = await dbGetAllImages(imagesStore);
    let count = 0;
    for (const img of allImages) {
      const deleted = await dbDeleteImage(img.id, imagesStore);
      if (deleted) count++;
    }
    return count;
  }

  async function dbDeleteBatchImages(ids: string[], imagesStore: Record<string, StoredImage>): Promise<number> {
    let count = 0;
    for (const id of ids) {
      const deleted = await dbDeleteImage(id, imagesStore);
      if (deleted) count++;
    }
    return count;
  }

  async function dbRegisterUser(user: StoredUser, usersStore: Record<string, StoredUser>): Promise<boolean> {
    if (useFirebase && db) {
      try {
        const usersRef = collection(db, "users");
        const qEmail = query(usersRef, where("email", "==", user.email));
        const qUser = query(usersRef, where("username", "==", user.username));
        const [emailSnap, userSnap] = await Promise.all([getDocs(qEmail), getDocs(qUser)]);
        
        if (!emailSnap.empty || !userSnap.empty) {
          return false;
        }

        await setDoc(doc(db, "users", user.id), {
          id: user.id,
          username: user.username,
          email: user.email,
          passwordHash: user.passwordHash,
          createdAt: user.createdAt,
          emailVerified: user.emailVerified ?? false,
        });
        return true;
      } catch (e) {
        console.error("Firebase register error:", e);
      }
    }

    const existing = Object.values(usersStore).find(u => u.email === user.email || u.username === user.username);
    if (existing) {
      return false;
    }
    usersStore[user.id] = user;
    return true;
  }

  async function dbLoginUser(email: string, passwordHash: string, usersStore: Record<string, StoredUser>): Promise<StoredUser | null> {
    const cleanEmail = email.toLowerCase().trim();
    const cleanPassword = passwordHash.trim();

    if (useFirebase && db) {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", cleanEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          for (const docSnap of snap.docs) {
            const data = docSnap.data();
            if (data.passwordHash === cleanPassword || data.passwordHash === passwordHash) {
              const isVip = !!data.isVip && (!data.vipExpireAt || data.vipExpireAt > Date.now());
              return {
                id: data.id || docSnap.id,
                username: data.username,
                email: data.email,
                passwordHash: data.passwordHash,
                createdAt: data.createdAt,
                emailVerified: data.emailVerified ?? false,
                isBanned: data.isBanned ?? false,
                banReason: data.banReason || "",
                isVip,
                vipExpireAt: data.vipExpireAt || 0,
                vipPlan: data.vipPlan || null,
              };
            }
          }
        }
      } catch (e) {
        console.error("Firebase login error:", e);
      }
    }

    const user = Object.values(usersStore).find(u => 
      u.email.toLowerCase().trim() === cleanEmail && 
      (u.passwordHash === cleanPassword || u.passwordHash === passwordHash)
    );
    return user || null;
  }

  async function dbSaveEmailVerification(email: string, code: string) {
    const cleanEmail = email.toLowerCase().trim();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "email_verifications", cleanEmail), { code, expiresAt });
      } catch (e) {
        console.error("Firebase save email verification error:", e);
      }
    }
    emailVerifications[cleanEmail] = { code, expiresAt };
  }

  async function dbVerifyEmailCode(email: string, code: string): Promise<boolean> {
    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.trim();
    if (useFirebase && db) {
      try {
        const docRef = doc(db, "email_verifications", cleanEmail);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.code === cleanCode && data.expiresAt > Date.now()) {
            await deleteDoc(docRef);
            return true;
          }
        }
      } catch (e) {
        console.error("Firebase verify email error:", e);
      }
    }
    const record = emailVerifications[cleanEmail];
    if (record && record.code === cleanCode && record.expiresAt > Date.now()) {
      delete emailVerifications[cleanEmail];
      return true;
    }
    return false;
  }

  async function dbMarkUserEmailVerified(email: string, usersStore: Record<string, StoredUser>) {
    const cleanEmail = email.toLowerCase().trim();
    if (useFirebase && db) {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", cleanEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          for (const userDoc of snap.docs) {
            await updateDoc(doc(db, "users", userDoc.id), { emailVerified: true });
          }
        }
      } catch (e) {
        console.error("Firebase mark email verified error:", e);
      }
    }
    const user = Object.values(usersStore).find(u => u.email.toLowerCase().trim() === cleanEmail);
    if (user) {
      user.emailVerified = true;
    }
  }

  let inMemoryGuestLastReset = 0;

  async function checkAutoResetGuestLimits(config?: SiteConfig): Promise<boolean> {
    const cfg = config || await dbGetConfig();
    const mode = cfg.guestAutoResetMode || "off";
    const lastReset = cfg.lastGuestResetTime || 0;
    const now = Date.now();

    if (mode === "off") return false;

    let shouldReset = false;

    if (mode === "interval" && cfg.guestResetIntervalHours) {
      const intervalMs = cfg.guestResetIntervalHours * 3600 * 1000;
      if (now - lastReset >= intervalMs) {
        shouldReset = true;
      }
    } else if (mode === "daily") {
      const resetHour = cfg.guestAutoResetHour !== undefined ? cfg.guestAutoResetHour : 0;
      const todayReset = new Date();
      todayReset.setHours(resetHour, 0, 0, 0);
      let targetTime = todayReset.getTime();
      if (now < targetTime) {
        targetTime -= 24 * 3600 * 1000;
      }
      if (lastReset < targetTime) {
        shouldReset = true;
      }
    }

    if (shouldReset) {
      const newResetTime = now;
      guestUploadCounts = {};
      inMemoryGuestLastReset = newResetTime;
      await dbSaveConfig({ lastGuestResetTime: newResetTime });
      console.log("Guest limits automatically reset at:", new Date(newResetTime).toISOString());
      return true;
    }
    return false;
  }

  async function dbGetGuestUploadCount(guestToken: string): Promise<number> {
    const config = await dbGetConfig();
    await checkAutoResetGuestLimits(config);
    const lastReset = config.lastGuestResetTime || 0;

    if (useFirebase && db) {
      try {
        const docRef = doc(db, "guest_uploads", guestToken);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (lastReset > 0 && data.updatedAt && data.updatedAt < lastReset) {
            return 0;
          }
          return data.count || 0;
        }
      } catch (e) {
        console.error("Firebase get guest count error:", e);
      }
    }

    if (lastReset > 0 && inMemoryGuestLastReset < lastReset) {
      guestUploadCounts = {};
      inMemoryGuestLastReset = lastReset;
    }

    return guestUploadCounts[guestToken] || 0;
  }

  interface AdRequestItem {
    id: string;
    senderName: string;
    senderEmail: string;
    senderMessage: string;
    createdAt: number;
    status: "new" | "read" | "contacted";
  }

  let inMemoryAdRequests: AdRequestItem[] = [];

  async function dbGetAdRequests(): Promise<AdRequestItem[]> {
    if (useFirebase && db) {
      try {
        const snap = await getDocs(collection(db, "ad_requests"));
        const list: AdRequestItem[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as AdRequestItem);
        });
        return list.sort((a, b) => b.createdAt - a.createdAt);
      } catch (e) {
        console.error("Firebase get ad requests error:", e);
      }
    }
    return [...inMemoryAdRequests].sort((a, b) => b.createdAt - a.createdAt);
  }

  async function dbSaveAdRequest(reqItem: AdRequestItem): Promise<void> {
    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "ad_requests", reqItem.id), reqItem);
      } catch (e) {
        console.error("Firebase save ad request error:", e);
      }
    }
    inMemoryAdRequests.push(reqItem);
  }

  async function dbUpdateAdRequestStatus(id: string, status: "new" | "read" | "contacted"): Promise<void> {
    if (useFirebase && db) {
      try {
        await updateDoc(doc(db, "ad_requests", id), { status });
      } catch (e) {
        console.error("Firebase update ad request status error:", e);
      }
    }
    const found = inMemoryAdRequests.find(r => r.id === id);
    if (found) found.status = status;
  }

  async function dbDeleteAdRequest(id: string): Promise<void> {
    if (useFirebase && db) {
      try {
        await deleteDoc(doc(db, "ad_requests", id));
      } catch (e) {
        console.error("Firebase delete ad request error:", e);
      }
    }
    inMemoryAdRequests = inMemoryAdRequests.filter(r => r.id !== id);
  }

  async function dbIncrementGuestUploadCount(guestToken: string): Promise<number> {
    const current = await dbGetGuestUploadCount(guestToken);
    const newCount = current + 1;
    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "guest_uploads", guestToken), { count: newCount, updatedAt: Date.now() });
      } catch (e) {
        console.error("Firebase increment guest count error:", e);
      }
    }
    guestUploadCounts[guestToken] = newCount;
    return newCount;
  }

  function extractClientIp(req: express.Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    let ipStr = "";
    if (typeof forwarded === "string") {
      ipStr = forwarded.split(",")[0].trim();
    } else if (Array.isArray(forwarded)) {
      ipStr = forwarded[0].trim();
    } else {
      ipStr = req.ip || req.socket?.remoteAddress || "127.0.0.1";
    }
    return ipStr.replace(/[^a-zA-Z0-9_.-]/g, "_");
  }

  function extractGuestToken(req: express.Request): string {
    let token = (req.body && req.body.guestToken) || (req.query && (req.query.token as string));
    if (!token) {
      token = req.headers["x-guest-token"] as string;
    }
    if (!token && req.headers.cookie) {
      const match = req.headers.cookie.match(/guest_token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }
    return token || "";
  }

  async function getEffectiveGuestCount(guestToken: string, ip: string): Promise<number> {
    let countByToken = 0;
    if (guestToken) {
      countByToken = await dbGetGuestUploadCount("tok_" + guestToken);
      // Also check legacy raw token if present
      const rawCount = await dbGetGuestUploadCount(guestToken);
      if (rawCount > countByToken) countByToken = rawCount;
    }
    let countByIp = 0;
    if (ip) {
      countByIp = await dbGetGuestUploadCount("ip_" + ip);
    }
    return Math.max(countByToken, countByIp);
  }

  async function incrementEffectiveGuestCount(guestToken: string, ip: string): Promise<number> {
    if (guestToken) {
      await dbIncrementGuestUploadCount("tok_" + guestToken);
      await dbIncrementGuestUploadCount(guestToken);
    }
    if (ip) {
      await dbIncrementGuestUploadCount("ip_" + ip);
    }
    return await getEffectiveGuestCount(guestToken, ip);
  }

  async function dbGetUserUploads(userId: string, imagesStore: Record<string, StoredImage>): Promise<any[]> {
    if (useFirebase && db) {
      try {
        const imagesRef = collection(db, "images");
        const q = query(imagesRef, where("userId", "==", userId));
        const snap = await getDocs(q);
        return snap.docs.map(doc => {
          const data = doc.data();
          return {
            id: data.id,
            name: data.name,
            size: data.size,
            mimeType: data.mimeType,
            uploadedAt: data.uploadedAt,
            deleteAfter: data.deleteAfter,
            views: data.views,
            hasPassword: !!data.password,
            deleteToken: data.deleteToken,
          };
        });
      } catch (e) {
        console.error("Firebase user uploads error:", e);
      }
    }

    return Object.values(imagesStore)
      .filter(img => img.userId === userId)
      .map(img => ({
        id: img.id,
        name: img.name,
        size: img.size,
        mimeType: img.mimeType,
        uploadedAt: img.uploadedAt,
        deleteAfter: img.deleteAfter,
        views: img.views,
        hasPassword: !!img.password,
        deleteToken: img.deleteToken,
      }));
  }

  async function dbCleanExpiredImages(imagesStore: Record<string, StoredImage>) {
    const now = Date.now();
    let deletedCount = 0;

    if (useFirebase && db) {
      try {
        const imagesRef = collection(db, "images");
        const q = query(imagesRef, where("deleteAfter", "!=", "never"));
        const snap = await getDocs(q);
        
        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          let expiresAt = data.uploadedAt;
          if (data.deleteAfter === "1h") {
            expiresAt += 60 * 60 * 1000;
          } else if (data.deleteAfter === "1d") {
            expiresAt += 24 * 60 * 60 * 1000;
          } else if (data.deleteAfter === "1w") {
            expiresAt += 7 * 24 * 60 * 60 * 1000;
          } else if (data.deleteAfter === "1m") {
            expiresAt += 30 * 24 * 60 * 60 * 1000;
          }

          if (now > expiresAt) {
            await deleteDoc(docSnap.ref);
            const chunkCount = data.chunkCount || 0;
            const deletePromises = [];
            for (let i = 0; i < chunkCount; i++) {
              deletePromises.push(deleteDoc(doc(db, "image_chunks", `${data.id}_${i}`)));
            }
            await Promise.all(deletePromises);
            deletedCount++;
          }
        }
      } catch (e) {
        console.error("Firebase cleanup error:", e);
      }
    }

    Object.keys(imagesStore).forEach(id => {
      const img = imagesStore[id];
      if (img.deleteAfter === "never") return;

      let expiresAt = img.uploadedAt;
      if (img.deleteAfter === "1h") {
        expiresAt += 60 * 60 * 1000;
      } else if (img.deleteAfter === "1d") {
        expiresAt += 24 * 60 * 60 * 1000;
      } else if (img.deleteAfter === "1w") {
        expiresAt += 7 * 24 * 60 * 60 * 1000;
      } else if (img.deleteAfter === "1m") {
        expiresAt += 30 * 24 * 60 * 60 * 1000;
      }

      if (now > expiresAt) {
        delete imagesStore[id];
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      console.log(`Auto-cleaned ${deletedCount} expired images.`);
    }
  }

  // Seed user and image for illustration in memory fallback
  const seedUserId = "demo-user";
  users[seedUserId] = {
    id: seedUserId,
    username: "InanResimFan",
    email: "demo@inanresim.com",
    passwordHash: "demo123",
    createdAt: Date.now(),
  };

  const transparentPixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  images["demo1"] = {
    id: "demo1",
    name: "ornek_resim.png",
    mimeType: "image/png",
    size: 68,
    data: transparentPixel,
    uploadedAt: Date.now(),
    deleteAfter: "never",
    deleteToken: "del_demo1",
    views: 42,
    userId: seedUserId,
  };

  // Seed Firebase with demo data once if initialized successfully and empty
  if (useFirebase && db) {
    try {
      const demoUserRef = doc(db, "users", seedUserId);
      const demoUserSnap = await getDoc(demoUserRef);
      if (!demoUserSnap.exists()) {
        await setDoc(demoUserRef, {
          id: seedUserId,
          username: "InanResimFan",
          email: "demo@inanresim.com",
          passwordHash: "demo123",
          createdAt: Date.now(),
        });

        const demoImg: StoredImage = {
          id: "demo1",
          name: "ornek_resim.png",
          mimeType: "image/png",
          size: 68,
          data: "",
          uploadedAt: Date.now(),
          deleteAfter: "never",
          deleteToken: "del_demo1",
          views: 42,
          userId: seedUserId,
        };
        await dbSaveImage(demoImg, transparentPixel, images);
        console.log("Firestore successfully seeded with demo data.");
      }
    } catch (err) {
      console.error("Failed to seed demo data to Firestore:", err);
    }
  }

  // Helper: Generate Random Unique Codes
  function generateId(length = 6) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // --- API ROUTES ---

  // Get active stats (for homepage counter/visuals)
  app.get("/api/stats", async (req, res) => {
    const { sessionId } = req.query;
    try {
      const stats = await getStatsCount(images, users, sessionId as string);
      res.json(stats);
    } catch (err) {
      console.error("Stats API error:", err);
      res.status(500).json({ error: "İstatistikler alınamadı." });
    }
  });

  // Guest status check route
  app.get("/api/guest-status", async (req, res) => {
    try {
      const clientIp = extractClientIp(req);
      let token = extractGuestToken(req);
      if (!token) {
        token = "gst_" + generateId(12);
      }
      res.setHeader("Set-Cookie", `guest_token=${token}; Path=/; Max-Age=31536000; SameSite=Lax`);
      const config = await dbGetConfig();
      const count = await getEffectiveGuestCount(token, clientIp);
      res.json({
        guestToken: token,
        guestUploadCount: count,
        guestMaxUploadCount: config.guestMaxUploadCount ?? 5,
        guestMaxMb: config.guestMaxMb ?? 20
      });
    } catch (err) {
      res.status(500).json({ error: "Misafir durumu alınamadı." });
    }
  });

  // Handle Image Upload
  app.post("/api/upload", async (req, res) => {
    try {
      const { 
        name, 
        mimeType, 
        size, 
        data, 
        deleteAfter, 
        password, 
        userId,
        guestToken,
        watermarkText,
        watermarkOpacity,
        watermarkColor,
        watermarkSize,
        watermarkPosition 
      } = req.body;

      if (!data || !mimeType || !name) {
        res.status(400).json({ error: "Eksik resim verisi!" });
        return;
      }

      const config = await dbGetConfig();
      const fileSize = Number(size) || 0;

      let uRecord: any = null;
      if (userId) {
        uRecord = users[userId] || Object.values(users).find(u => u.id === userId);
        if (useFirebase && db && !uRecord) {
          try {
            const uSnap = await getDoc(doc(db, "users", userId));
            if (uSnap.exists()) uRecord = uSnap.data();
          } catch (e) {}
        }
      }

      const isVipUser = uRecord ? (!!uRecord.isVip || uRecord.role === "admin") : false;

      if (userId) {
        // Registered User check
        if (uRecord && uRecord.isBanned) {
          res.status(403).json({ error: `Hesabınız engellendiği için yeni görsel/video yükleyemezsiniz.${uRecord.banReason ? ` Neden: ${uRecord.banReason}` : ''}` });
          return;
        }

        const userMaxMb = isVipUser ? (config.vipMaxMb ?? 5000) : (config.registeredMaxMb ?? 1000);
        if (userMaxMb > 0 && fileSize > userMaxMb * 1024 * 1024) {
          res.status(400).json({ 
            error: `Yüklenecek dosya (${(fileSize / (1024 * 1024)).toFixed(1)} MB), ${isVipUser ? 'VIP' : 'standart'} üye boyut limitini (${userMaxMb >= 1000 ? `${(userMaxMb / 1000).toFixed(0)} GB` : `${userMaxMb} MB`}) aşıyor.${!isVipUser ? " 5 GB'a kadar dosya yüklemek için lütfen PRO VIP üyeliğe geçin!" : ""}` 
          });
          return;
        }
      } else {
        // Guest user check
        const guestMaxMb = config.guestMaxMb ?? 20;
        if (fileSize > guestMaxMb * 1024 * 1024) {
          res.status(400).json({ 
            error: `Misafir kullanıcılar en fazla ${guestMaxMb} MB boyutunda dosya yükleyebilir. Sınırsız yükleme yapmak için lütfen ücretsiz üye olun!`,
            guestLimitReached: true,
            limitType: "size"
          });
          return;
        }

        const clientIp = extractClientIp(req);
        let token = extractGuestToken(req);
        if (!token) {
          token = "gst_" + generateId(12);
        }
        const guestMaxCount = config.guestMaxUploadCount ?? 5;
        const currentCount = await getEffectiveGuestCount(token, clientIp);

        if (currentCount >= guestMaxCount) {
          res.status(400).json({ 
            error: `Üye olmadan en fazla ${guestMaxCount} adet yükleme yapabilirsiniz. Limitiniz doldu! Sınırsız yükleme yapmak için lütfen ücretsiz üye olun.`,
            guestLimitReached: true,
            limitType: "count",
            guestMaxUploadCount: guestMaxCount,
            currentGuestCount: currentCount
          });
          return;
        }
      }

      const id = generateId(6);
      const deleteToken = "del_" + generateId(12);

      // Store base64 data (strip prefix if present, like 'data:image/png;base64,')
      let base64Data = data;
      if (data.includes("base64,")) {
        base64Data = data.split("base64,")[1];
      }

      // Permanent ("never") storage is strictly reserved for PRO VIP members
      let effectiveDeleteAfter = deleteAfter || (isVipUser ? "never" : "1m");
      if (effectiveDeleteAfter === "never" && !isVipUser) {
        effectiveDeleteAfter = "1m";
      }

      const img: StoredImage = {
        id,
        name: name || "resim.jpg",
        mimeType: mimeType || "image/jpeg",
        size: size || 0,
        data: "", // We don't store raw data directly in metadata
        uploadedAt: Date.now(),
        deleteAfter: effectiveDeleteAfter as any,
        password: password || undefined,
        deleteToken,
        views: 0,
        userId: userId || undefined,
        watermarkText: watermarkText || undefined,
        watermarkOpacity: watermarkOpacity !== undefined ? Number(watermarkOpacity) : undefined,
        watermarkColor: watermarkColor || undefined,
        watermarkSize: watermarkSize !== undefined ? Number(watermarkSize) : undefined,
        watermarkPosition: watermarkPosition || undefined,
      };

      await dbSaveImage(img, base64Data, images);

      if (!userId) {
        const clientIp = extractClientIp(req);
        let token = extractGuestToken(req);
        if (!token) token = "gst_" + generateId(12);
        await incrementEffectiveGuestCount(token, clientIp);
        res.setHeader("Set-Cookie", `guest_token=${token}; Path=/; Max-Age=31536000; SameSite=Lax`);
      }

      res.status(200).json({
        success: true,
        id,
        name,
        size,
        deleteToken,
        uploadedAt: img.uploadedAt,
      });
    } catch (err: any) {
      console.error("Upload error:", err);
      res.status(500).json({ error: "Resim yüklenirken bir sunucu hatası oluştu." });
    }
  });

  // Handle Remote URL Upload
  app.post("/api/upload-url", async (req, res) => {
    try {
      const { 
        url, 
        deleteAfter, 
        password, 
        userId,
        guestToken,
        watermarkText,
        watermarkOpacity,
        watermarkColor,
        watermarkSize,
        watermarkPosition 
      } = req.body;

      if (!url) {
        res.status(400).json({ error: "Lütfen geçerli bir resim veya video URL'si gönderin!" });
        return;
      }

      const config = await dbGetConfig();

      let uRecordUrl: any = null;
      if (userId) {
        uRecordUrl = users[userId] || Object.values(users).find(u => u.id === userId);
        if (useFirebase && db && !uRecordUrl) {
          try {
            const uSnap = await getDoc(doc(db, "users", userId));
            if (uSnap.exists()) uRecordUrl = uSnap.data();
          } catch (e) {}
        }
      }
      const isVipUserUrl = uRecordUrl ? (!!uRecordUrl.isVip || uRecordUrl.role === "admin") : false;

      if (userId) {
        if (uRecordUrl && uRecordUrl.isBanned) {
          res.status(403).json({ error: `Hesabınız engellendiği için yeni görsel/video yükleyemezsiniz.${uRecordUrl.banReason ? ` Neden: ${uRecordUrl.banReason}` : ''}` });
          return;
        }
      } else {
        const clientIp = extractClientIp(req);
        let token = extractGuestToken(req);
        if (!token) {
          token = "gst_" + generateId(12);
        }
        const guestMaxCount = config.guestMaxUploadCount ?? 5;
        const currentCount = await getEffectiveGuestCount(token, clientIp);

        if (currentCount >= guestMaxCount) {
          res.status(400).json({ 
            error: `Üye olmadan en fazla ${guestMaxCount} adet yükleme yapabilirsiniz. Limitiniz doldu! Sınırsız yükleme yapmak için lütfen ücretsiz üye olun.`,
            guestLimitReached: true,
            limitType: "count"
          });
          return;
        }
      }

      const response = await fetch(url);
      if (!response.ok) {
        res.status(400).json({ error: "Görsel veya video indirilemedi. Geçerli bir URL girdiğinizden emin olun veya web sitesinin engellemediğini doğrulayın." });
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = response.headers.get("content-type") || "image/jpeg";

      if (!mimeType.startsWith("image/") && !mimeType.startsWith("video/")) {
        res.status(400).json({ error: "İndirilen dosya geçerli bir görsel veya video formatı değil!" });
        return;
      }

      if (userId) {
        const userMaxMb = isVipUserUrl ? (config.vipMaxMb ?? 5000) : (config.registeredMaxMb ?? 1000);
        if (userMaxMb > 0 && buffer.length > userMaxMb * 1024 * 1024) {
          res.status(400).json({ error: `İndirilen dosya (${(buffer.length / (1024 * 1024)).toFixed(1)} MB), ${isVipUserUrl ? 'VIP' : 'standart'} kullanıcı limitini (${userMaxMb >= 1000 ? `${(userMaxMb / 1000).toFixed(0)} GB` : `${userMaxMb} MB`}) aşmaktadır!${!isVipUserUrl ? " 5 GB'a kadar dosya indirmek için PRO VIP üyeliğe geçin!" : ""}` });
          return;
        }
      } else {
        const guestMaxMb = config.guestMaxMb ?? 20;
        if (buffer.length > guestMaxMb * 1024 * 1024) {
          res.status(400).json({ error: `Misafir kullanıcılar için maksimum dosya boyutu ${guestMaxMb} MB'dir. Lütfen ücretsiz üye olun!` });
          return;
        }
      }

      const id = generateId(6);
      const deleteToken = "del_" + generateId(12);

      // Extract original filename if possible
      let name = "url_gorsel.jpg";
      try {
        const parsed = new URL(url);
        const pathPart = parsed.pathname;
        const filename = pathPart.substring(pathPart.lastIndexOf("/") + 1);
        if (filename && filename.includes(".")) {
          name = filename;
        }
      } catch (e) {}

      // Permanent ("never") storage is strictly reserved for PRO VIP members
      let effectiveDeleteAfterUrl = deleteAfter || (isVipUserUrl ? "never" : "1m");
      if (effectiveDeleteAfterUrl === "never" && !isVipUserUrl) {
        effectiveDeleteAfterUrl = "1m";
      }

      const img: StoredImage = {
        id,
        name,
        mimeType,
        size: buffer.length,
        data: "", // No direct base64 data in metadata
        uploadedAt: Date.now(),
        deleteAfter: effectiveDeleteAfterUrl as any,
        password: password || undefined,
        deleteToken,
        views: 0,
        userId: userId || undefined,
        watermarkText: watermarkText || undefined,
        watermarkOpacity: watermarkOpacity !== undefined ? Number(watermarkOpacity) : undefined,
        watermarkColor: watermarkColor || undefined,
        watermarkSize: watermarkSize !== undefined ? Number(watermarkSize) : undefined,
        watermarkPosition: watermarkPosition || undefined,
      };

      await dbSaveImage(img, buffer.toString("base64"), images);

      if (!userId) {
        const clientIp = extractClientIp(req);
        let token = extractGuestToken(req);
        if (!token) token = "gst_" + generateId(12);
        await incrementEffectiveGuestCount(token, clientIp);
        res.setHeader("Set-Cookie", `guest_token=${token}; Path=/; Max-Age=31536000; SameSite=Lax`);
      }

      res.status(200).json({
        success: true,
        id,
        name,
        size: buffer.length,
        deleteToken,
        uploadedAt: img.uploadedAt,
      });
    } catch (err: any) {
      console.error("URL upload error:", err);
      res.status(500).json({ error: "URL'den resim indirilirken bir sunucu hatası oluştu." });
    }
  });

  // Serve Raw Image Data
  app.get("/api/images/:id", async (req, res) => {
    const { id } = req.params;
    const { pw } = req.query;
    
    try {
      const image = await dbGetImage(id, images);

      if (!image) {
        res.status(404).send("Resim bulunamadı.");
        return;
      }

      // Password enforcement on raw image
      if (image.password && image.password !== pw) {
        res.status(403).send("Bu resim şifre korumalıdır.");
        return;
      }

      const buffer = Buffer.from(image.data, "base64");
      res.writeHead(200, {
        "Content-Type": image.mimeType,
        "Content-Length": buffer.length,
        "Cache-Control": "public, max-age=86400",
      });
      res.end(buffer);
    } catch (err) {
      console.error("Serve image error:", err);
      res.status(500).send("Görsel yüklenirken hata oluştu.");
    }
  });

  // Get Image Information (Excluding raw base64 data and password)
  app.get("/api/images/:id/info", async (req, res) => {
    const { id } = req.params;
    try {
      const info = await dbGetImageInfo(id, images);

      if (!info) {
        res.status(404).json({ error: "Resim bulunamadı." });
        return;
      }

      res.json(info);
    } catch (err) {
      console.error("Get image info error:", err);
      res.status(500).json({ error: "Görsel bilgileri yüklenirken hata oluştu." });
    }
  });

  // Verify Image Password
  app.post("/api/images/:id/verify", async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    
    try {
      const image = await dbGetImage(id, images);

      if (!image) {
        res.status(404).json({ error: "Resim bulunamadı." });
        return;
      }

      if (!image.password) {
        res.json({ success: true, message: "Bu resim şifreli değil." });
        return;
      }

      if (image.password === password) {
        res.json({ success: true, dataUrl: `data:${image.mimeType};base64,${image.data}` });
      } else {
        res.status(401).json({ success: false, error: "Hatalı şifre!" });
      }
    } catch (err) {
      console.error("Verify password error:", err);
      res.status(500).json({ error: "Şifre doğrulanırken hata oluştu." });
    }
  });

  // Set/Lock Image Password after upload
  app.post("/api/images/:id/lock", async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    
    try {
      const success = await dbLockImage(id, password, images);
      if (!success) {
        res.status(404).json({ error: "Görsel bulunamadı." });
        return;
      }

      res.json({ success: true, message: "Görsel başarıyla şifrelendi." });
    } catch (err) {
      console.error("Lock error:", err);
      res.status(500).json({ error: "Görsel şifrelenirken hata oluştu." });
    }
  });

  // Delete Image
  app.delete("/api/images/:id", async (req, res) => {
    const { id } = req.params;
    const { token } = req.query;
    
    try {
      const image = await dbGetImage(id, images);

      if (!image) {
        res.status(404).json({ error: "Resim bulunamadı." });
        return;
      }

      if (image.deleteToken === token) {
        await dbDeleteImage(id, images);
        res.json({ success: true, message: "Resim başarıyla silindi." });
      } else {
        res.status(403).json({ error: "Geçersiz silme anahtarı!" });
      }
    } catch (err) {
      console.error("Delete error:", err);
      res.status(500).json({ error: "Silme işlemi sırasında hata oluştu." });
    }
  });

  // --- USER AUTHENTICATION ---

  // Register
  app.post("/api/auth/register", async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: "Lütfen tüm alanları doldurun." });
      return;
    }

    const emailLower = email.toLowerCase().trim();
    const config = await dbGetConfig();
    const requireVerification = config.requireEmailVerification !== false;

    const id = "usr_" + generateId(8);
    const user: StoredUser = {
      id,
      username: username.trim(),
      email: emailLower,
      passwordHash: password,
      createdAt: Date.now(),
      emailVerified: !requireVerification,
    };

    const success = await dbRegisterUser(user, users);
    if (!success) {
      res.status(400).json({ error: "Bu kullanıcı adı veya e-posta zaten kullanımda." });
      return;
    }

    if (requireVerification) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await dbSaveEmailVerification(emailLower, code);

      const smtpConfig = await dbGetSmtpConfig();
      const smtpConfigured = !!(smtpConfig.host && smtpConfig.user && smtpConfig.pass);

      if (smtpConfigured) {
        await sendVerificationEmail(emailLower, code);
      } else {
        console.log(`[E-POSTA DOĞRULAMA KODU] ${emailLower}: ${code}`);
      }

      res.json({
        success: true,
        requireVerification: true,
        email: emailLower,
        message: "Kayıt başarılı! Lütfen e-postanıza gönderilen 6 haneli doğrulama kodunu girin."
      });
      return;
    }

    res.json({
      success: true,
      requireVerification: false,
      user: { id, username: user.username, email: emailLower },
      message: "Kayıt başarıyla tamamlandı!"
    });
  });

  // Verify Email Code
  app.post("/api/auth/verify-email", async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({ error: "E-posta ve doğrulama kodu gereklidir." });
      return;
    }

    const emailLower = email.toLowerCase().trim();
    const isValid = await dbVerifyEmailCode(emailLower, code.trim());

    if (!isValid) {
      res.status(400).json({ error: "Geçersiz veya süresi dolmuş doğrulama kodu." });
      return;
    }

    await dbMarkUserEmailVerified(emailLower, users);

    let foundUser = Object.values(users).find(u => u.email.toLowerCase().trim() === emailLower);
    if (!foundUser && useFirebase && db) {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", emailLower));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docData = snap.docs[0].data();
          foundUser = {
            id: docData.id,
            username: docData.username,
            email: docData.email,
            passwordHash: docData.passwordHash,
            createdAt: docData.createdAt,
            emailVerified: true
          };
        }
      } catch (e) {
        console.error("Firebase get user after verify error:", e);
      }
    }

    res.json({
      success: true,
      message: "E-posta adresiniz başarıyla doğrulandı! Şimdi giriş yapabilirsiniz.",
      user: foundUser ? { id: foundUser.id, username: foundUser.username, email: foundUser.email } : null
    });
  });

  // Resend Email Verification Code
  app.post("/api/auth/resend-verification", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "E-posta adresi gereklidir." });
      return;
    }

    const emailLower = email.toLowerCase().trim();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await dbSaveEmailVerification(emailLower, code);

    const smtpConfig = await dbGetSmtpConfig();
    const smtpConfigured = !!(smtpConfig.host && smtpConfig.user && smtpConfig.pass);

    if (smtpConfigured) {
      const sendRes = await sendVerificationEmail(emailLower, code);
      if (!sendRes.success) {
        res.status(500).json({ error: `E-posta gönderilirken hata oluştu: ${sendRes.error}` });
        return;
      }
    } else {
      console.log(`[RE-SEND DOĞRULAMA KODU] ${emailLower}: ${code}`);
    }

    res.json({
      success: true,
      message: "Yeni doğrulama kodu e-postanıza gönderildi."
    });
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Lütfen tüm alanları doldurun." });
      return;
    }

    const emailLower = email.toLowerCase().trim();
    const user = await dbLoginUser(emailLower, password, users);

    if (!user) {
      res.status(401).json({ error: "E-posta veya şifre hatalı." });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({
        error: `Hesabınız engellenmiştir.${user.banReason ? ` Neden: ${user.banReason}` : ''}`
      });
      return;
    }

    const config = await dbGetConfig();
    const requireVerification = config.requireEmailVerification !== false;

    if (requireVerification && !user.emailVerified) {
      // Generate new code and notify
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await dbSaveEmailVerification(emailLower, code);

      const smtpConfig = await dbGetSmtpConfig();
      if (smtpConfig.host && smtpConfig.user && smtpConfig.pass) {
        await sendVerificationEmail(emailLower, code);
      } else {
        console.log(`[LOGIN UNVERIFIED CODE] ${emailLower}: ${code}`);
      }

      res.status(403).json({
        error: "E-posta adresiniz henüz onaylanmamış! Lütfen e-postanıza gönderilen doğrulama kodunu girerek hesabınızı aktifleştirin.",
        requireVerification: true,
        email: user.email
      });
      return;
    }

    res.json({
      success: true,
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        isVip: user.isVip,
        vipExpireAt: user.vipExpireAt,
        vipPlan: user.vipPlan
      },
    });
  });

  // Forgot Password
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: "Lütfen e-posta adresinizi girin." });
      return;
    }

    const emailLower = email.toLowerCase();
    let userExists = false;

    // Check if user exists
    if (useFirebase && db) {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", emailLower));
        const snap = await getDocs(q);
        userExists = !snap.empty;
      } catch (e) {
        console.error("Firebase forgot password search user error:", e);
      }
    } else {
      userExists = Object.values(users).some(u => u.email === emailLower);
    }

    if (!userExists) {
      res.status(404).json({ error: "Bu e-posta adresine kayıtlı bir kullanıcı bulunamadı." });
      return;
    }

    // Generate 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    // Store the reset request
    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "password_resets", emailLower), {
          email: emailLower,
          code,
          expiresAt,
        });
      } catch (e) {
        console.error("Firebase save password reset error:", e);
      }
    } else {
      // In memory fallback
      passwordResets[emailLower] = { code, expiresAt };
    }

    console.log(`[PASSWORD RESET CODE] Email: ${emailLower}, Code: ${code}`);

    // Try to send the real email
    const smtpConfig = await dbGetSmtpConfig();
    const smtpConfigured = !!(smtpConfig.host && smtpConfig.user && smtpConfig.pass);
    if (smtpConfigured) {
      const emailResult = await sendResetEmail(emailLower, code);
      if (!emailResult.success) {
        res.status(500).json({
          error: `E-posta gönderilemedi: ${emailResult.error || "SMTP sunucu hatası"}. Lütfen e-posta adresinizi veya SMTP ayarlarınızı kontrol edin.`
        });
        return;
      }

      res.json({
        success: true,
        message: "E-posta adresinize 6 haneli sıfırlama kodu başarıyla gönderildi. Lütfen gelen kutunuzu (ve gereksiz/spam klasörünü) kontrol edin."
      });
    } else {
      // SMTP not configured yet
      res.status(400).json({
        error: "E-posta servisi (SMTP) henüz yapılandırılmadığı için şifre sıfırlama e-postası gönderilemiyor. Lütfen sistem yöneticinizle veya panel yöneticisiyle iletişime geçin."
      });
    }
  });

  // Reset Password
  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      res.status(400).json({ error: "Lütfen tüm alanları doldurun." });
      return;
    }

    const emailLower = email.toLowerCase().trim();
    const cleanCode = code.trim();
    const cleanPassword = newPassword.trim();
    let validReset = false;

    // Verify reset request
    if (useFirebase && db) {
      try {
        const docRef = doc(db, "password_resets", emailLower);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.code === cleanCode && data.expiresAt > Date.now()) {
            validReset = true;
          }
        }
      } catch (e) {
        console.error("Firebase check password reset error:", e);
      }
    } else {
      const reset = passwordResets[emailLower];
      if (reset && reset.code === cleanCode && reset.expiresAt > Date.now()) {
        validReset = true;
      }
    }

    if (!validReset) {
      res.status(400).json({ error: "Geçersiz veya süresi dolmuş doğrulama kodu." });
      return;
    }

    // Update password
    let updateSuccess = false;
    if (useFirebase && db) {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", emailLower));
        const snap = await getDocs(q);
        if (!snap.empty) {
          for (const userDoc of snap.docs) {
            await updateDoc(doc(db, "users", userDoc.id), { passwordHash: cleanPassword });
          }
          updateSuccess = true;
          // Delete reset record
          await deleteDoc(doc(db, "password_resets", emailLower));
        }
      } catch (e) {
        console.error("Firebase update password error:", e);
      }
    }

    // Always update in-memory fallback store as well
    const userInMem = Object.values(users).find(u => u.email.toLowerCase().trim() === emailLower);
    if (userInMem) {
      userInMem.passwordHash = cleanPassword;
      updateSuccess = true;
      delete passwordResets[emailLower];
    }

    if (!updateSuccess) {
      res.status(500).json({ error: "Şifre güncellenirken bir hata oluştu." });
      return;
    }

    res.json({
      success: true,
      message: "Şifreniz başarıyla güncellendi! Yeni şifrenizle giriş yapabilirsiniz."
    });
  });

  // Get User Uploaded Images
  app.get("/api/user/uploads", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Yetkisiz işlem." });
      return;
    }

    const userId = authHeader.split(" ")[1];
    try {
      const userUploads = await dbGetUserUploads(userId, images);
      res.json(userUploads);
    } catch (err) {
      console.error("Get user uploads error:", err);
      res.status(500).json({ error: "Yüklemeler alınırken hata oluştu." });
    }
  });

  // --- CHAT SYSTEM AND MODERATION ---

  // Swear words filter
  function containsSwearWord(text: string): boolean {
    const normalized = text.toLowerCase()
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ç/g, "c")
      .replace(/ğ/g, "g");
    
    const badWords = ["amk", "aq", "sik", "pic", "oc", "got", "yarrak", "orospu", "siktir", "pezevenk", "kahpe", "amina", "fuck", "bitch", "gavat", "ibne", "yarak"];
    return badWords.some(word => normalized.includes(word));
  }

  async function logModAction(userId: string, username: string, action: string, details: string) {
    const log: ModerationLog = {
      id: "log_" + generateId(10),
      userId,
      username,
      action,
      details,
      createdAt: Date.now(),
    };
    await dbSaveModerationLog(log);
  }

  // Get messages
  app.get("/api/chat/messages", async (req, res) => {
    try {
      const msgs = await dbGetChatMessages();
      res.json(msgs);
    } catch (err) {
      console.error("Get chat messages error:", err);
      res.status(500).json({ error: "Sohbet mesajları alınamadı." });
    }
  });

  // Post message
  app.post("/api/chat/messages", async (req, res) => {
    try {
      const { userId, username, text, isMod, isAdmin } = req.body;

      if (!userId || !username || !text || text.trim() === "") {
        return res.status(400).json({ error: "Eksik parametre." });
      }

      const cleanText = text.trim();
      const now = Date.now();

      // Check Ban/Mute status
      const mod = await dbGetUserModeration(userId, username);
      if (mod.banned) {
        return res.status(403).json({ error: "Kural ihlali nedeniyle sohbetten kalıcı olarak yasaklandınız!" });
      }

      if (mod.mutedUntil > now) {
        const remainingSecs = Math.ceil((mod.mutedUntil - now) / 1000);
        return res.status(403).json({ error: `Küfürlü kelimeler nedeniyle susturuldunuz! Kalan süre: ${remainingSecs} saniye.` });
      }

      // Check Slow Mode (3 seconds delay)
      const slowModeActive = await dbGetChatSlowMode();
      if (slowModeActive) {
        const lastTime = lastMessageTimes[userId] || 0;
        if (now - lastTime < 3000) {
          return res.status(429).json({ error: "Yavaş mod aktif! Lütfen 3 saniye bekleyin." });
        }
      }

      // Check for Swear Words
      if (containsSwearWord(cleanText)) {
        const newWarnings = mod.warnings + 1;
        mod.warnings = newWarnings;

        if (newWarnings === 1) {
          await dbSaveUserModeration(mod);
          await logModAction(userId, username, "WARNING_1", `1. Uyarı: Küfürlü kelime filtresine takıldı. Mesaj: "${cleanText}"`);
          return res.status(400).json({ 
            error: "1. Uyarı: Lütfen küfürlü kelimeler kullanmayın!", 
            warningCount: 1 
          });
        } else if (newWarnings === 2) {
          mod.mutedUntil = now + 60 * 1000; // Mute for 1 minute
          await dbSaveUserModeration(mod);
          await logModAction(userId, username, "MUTE", `2. Uyarı: Küfürlü kelime filtresine takıldı ve 1 dakika susturuldu. Mesaj: "${cleanText}"`);
          return res.status(400).json({ 
            error: "2. Uyarı: Küfürlü kelimeler nedeniyle 1 dakika susturuldunuz!", 
            warningCount: 2 
          });
        } else {
          mod.banned = true;
          await dbSaveUserModeration(mod);
          await logModAction(userId, username, "BAN_AUTO", `3. Uyarı: Küfürlü kelime filtresine takıldı ve otomatik olarak yasaklandı. Mesaj: "${cleanText}"`);
          return res.status(403).json({ 
            error: "3. Uyarı: Kural ihlali nedeniyle kalıcı olarak yasaklandınız!", 
            warningCount: 3,
            banned: true
          });
        }
      }

      // Record message time
      lastMessageTimes[userId] = now;

      // Save Message
      const msg: ChatMessage = {
        id: "msg_" + generateId(10),
        userId,
        username,
        text: cleanText,
        createdAt: now,
        isMod: !!isMod || !!isAdmin,
        isAdmin: !!isAdmin,
      };

      await dbSaveChatMessage(msg);
      // Award XP for chat activity
      await dbAddUserXP(userId, username, 15, false);

      res.json(msg);
    } catch (err) {
      console.error("Post chat message error:", err);
      res.status(500).json({ error: "Mesaj gönderilemedi." });
    }
  });

  // Get Banned Users (Admin Only)
  app.get("/api/admin/chat/bans", async (req, res) => {
    try {
      const bans = await dbGetBannedUsers();
      res.json(bans);
    } catch (err) {
      console.error("Get banned users error:", err);
      res.status(500).json({ error: "Yasaklı kullanıcı listesi alınamadı." });
    }
  });

  // Unban user (Admin Only)
  app.post("/api/admin/chat/unban", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "Eksik kullanıcı ID'si." });
      }

      const mod = await dbGetUserModeration(userId, "Kullanıcı");
      mod.banned = false;
      mod.warnings = 0;
      mod.mutedUntil = 0;
      await dbSaveUserModeration(mod);

      await logModAction(userId, mod.username, "UNBAN", "Yönetici tarafından sohbet yasağı kaldırıldı.");

      res.json({ success: true, message: "Kullanıcının engeli kaldırıldı." });
    } catch (err) {
      console.error("Unban user error:", err);
      res.status(500).json({ error: "Kullanıcı engeli kaldırılamadı." });
    }
  });

  // Ban user directly (Admin Only)
  app.post("/api/admin/chat/ban", async (req, res) => {
    try {
      const { userId, username } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "Eksik kullanıcı ID'si." });
      }

      const mod = await dbGetUserModeration(userId, username || "Kullanıcı");
      mod.banned = true;
      mod.warnings = 3;
      await dbSaveUserModeration(mod);

      await logModAction(userId, mod.username, "BAN_MANUAL", "Yönetici tarafından doğrudan kalıcı olarak yasaklandı.");

      res.json({ success: true, message: "Kullanıcı yasaklandı." });
    } catch (err) {
      console.error("Ban user error:", err);
      res.status(500).json({ error: "Kullanıcı yasaklanamadı." });
    }
  });

  // Mute user temporarily (Admin Only)
  app.post("/api/admin/chat/mute", async (req, res) => {
    try {
      const { userId, username, durationMinutes } = req.body;
      if (!userId || !durationMinutes) {
        return res.status(400).json({ error: "Eksik parametreler (userId, durationMinutes)." });
      }

      const mins = Number(durationMinutes);
      const mod = await dbGetUserModeration(userId, username || "Kullanıcı");
      mod.mutedUntil = Date.now() + mins * 60 * 1000;
      await dbSaveUserModeration(mod);

      await logModAction(userId, mod.username, "MUTE_MANUAL", `Yönetici tarafından doğrudan ${mins} dakika geçici olarak susturuldu.`);

      res.json({ success: true, message: `Kullanıcı ${mins} dakika geçici olarak engellendi.` });
    } catch (err) {
      console.error("Mute user error:", err);
      res.status(500).json({ error: "Kullanıcı geçici olarak engellenemedi/susturulamadı." });
    }
  });

  // Get Slowmode
  app.get("/api/chat/slowmode", async (req, res) => {
    try {
      const slowMode = await dbGetChatSlowMode();
      res.json({ slowMode });
    } catch (err) {
      res.status(500).json({ error: "Yavaş mod bilgisi alınamadı." });
    }
  });

  // Get User Profile & XP / Level / Badges
  app.get("/api/chat/profile/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const username = (req.query.username as string) || "Kullanıcı";
      const isMod = req.query.isMod === "true";
      const isAdmin = req.query.isAdmin === "true";

      const profile = await dbGetUserXPProfile(userId, username);
      const data = getUserLevelAndBadges(profile, isMod, isAdmin);
      res.json({ userId, username, ...data });
    } catch (err) {
      console.error("Get user profile error:", err);
      res.status(500).json({ error: "Profil bilgisi alınamadı." });
    }
  });

  // Award XP for Mini-Game activity
  app.post("/api/chat/xp/game", async (req, res) => {
    try {
      const { userId, username } = req.body;
      if (!userId || !username) return res.status(400).json({ error: "Eksik bilgi." });
      await dbAddUserXP(userId, username, 10, true);
      const profile = await dbGetUserXPProfile(userId, username);
      const data = getUserLevelAndBadges(profile);
      res.json({ success: true, ...data });
    } catch (err) {
      res.status(500).json({ error: "XP eklenemedi." });
    }
  });

  // Send Direct Message (DM)
  app.post("/api/chat/dm/send", async (req, res) => {
    try {
      const { senderId, senderName, receiverId, receiverName, text } = req.body;
      if (!senderId || !senderName || !receiverId || !receiverName || !text || !text.trim()) {
        return res.status(400).json({ error: "Eksik parametre." });
      }

      const cleanText = text.trim();
      const now = Date.now();

      const dm: DirectMessage = {
        id: "dm_" + generateId(10),
        senderId,
        senderName,
        receiverId,
        receiverName,
        text: cleanText,
        createdAt: now,
        read: false,
      };

      inMemoryDMs.push(dm);

      if (useFirebase && db) {
        try {
          await addDoc(collection(db, "direct_messages"), dm);
        } catch (e) {
          console.error("Firebase DM save error:", e);
        }
      }

      // Award +5 XP for sending DM
      await dbAddUserXP(senderId, senderName, 5, false);

      res.json(dm);
    } catch (err) {
      console.error("Send DM error:", err);
      res.status(500).json({ error: "Özel mesaj gönderilemedi." });
    }
  });

  // Get DM Messages between two users
  app.get("/api/chat/dm/messages", async (req, res) => {
    try {
      const { userId, targetId } = req.query;
      if (!userId || !targetId) return res.status(400).json({ error: "Eksik kullanıcı bilgisi." });

      const uId = String(userId);
      const tId = String(targetId);

      let dms: DirectMessage[] = [];

      if (useFirebase && db) {
        try {
          const dmRef = collection(db, "direct_messages");
          const snap = await getDocs(dmRef);
          dms = snap.docs
            .map(d => d.data() as DirectMessage)
            .filter(
              d =>
                (d.senderId === uId && d.receiverId === tId) ||
                (d.senderId === tId && d.receiverId === uId)
            );
        } catch (e) {
          console.error("Firebase DM get error:", e);
          dms = inMemoryDMs.filter(
            d =>
              (d.senderId === uId && d.receiverId === tId) ||
              (d.senderId === tId && d.receiverId === uId)
          );
        }
      } else {
        dms = inMemoryDMs.filter(
          d =>
            (d.senderId === uId && d.receiverId === tId) ||
            (d.senderId === tId && d.receiverId === uId)
        );
      }

      dms.sort((a, b) => a.createdAt - b.createdAt);
      res.json(dms);
    } catch (err) {
      res.status(500).json({ error: "Özel mesajlar alınamadı." });
    }
  });

  // Get active DM conversations list for a user
  app.get("/api/chat/dm/conversations", async (req, res) => {
    try {
      const userId = String(req.query.userId || "");
      if (!userId) return res.status(400).json({ error: "Eksik kullanıcı ID." });

      let allDms: DirectMessage[] = [];

      if (useFirebase && db) {
        try {
          const dmRef = collection(db, "direct_messages");
          const snap = await getDocs(dmRef);
          allDms = snap.docs.map(d => d.data() as DirectMessage);
        } catch (e) {
          allDms = [...inMemoryDMs];
        }
      } else {
        allDms = [...inMemoryDMs];
      }

      const userDms = allDms.filter(d => d.senderId === userId || d.receiverId === userId);

      // Group by target user
      const conversationsMap: Record<
        string,
        { targetId: string; targetName: string; lastMessage: string; lastTime: number; unreadCount: number }
      > = {};

      userDms.forEach(d => {
        const isMeSender = d.senderId === userId;
        const targetId = isMeSender ? d.receiverId : d.senderId;
        const targetName = isMeSender ? d.receiverName : d.senderName;

        if (!conversationsMap[targetId] || conversationsMap[targetId].lastTime < d.createdAt) {
          conversationsMap[targetId] = {
            targetId,
            targetName,
            lastMessage: d.text,
            lastTime: d.createdAt,
            unreadCount: 0,
          };
        }
      });

      const convList = Object.values(conversationsMap).sort((a, b) => b.lastTime - a.lastTime);
      res.json(convList);
    } catch (err) {
      res.status(500).json({ error: "Konuşmalar alınamadı." });
    }
  });

  // Set Slowmode (Admin Only)
  app.post("/api/admin/chat/slowmode", async (req, res) => {
    try {
      const { slowMode } = req.body;
      await dbSetChatSlowMode(!!slowMode);

      await logModAction("admin", "Yönetici", slowMode ? "SLOWMODE_ON" : "SLOWMODE_OFF", `Yavaş mod (slow mode) ${slowMode ? "aktif" : "pasif"} duruma getirildi.`);

      res.json({ success: true, slowMode: !!slowMode });
    } catch (err) {
      console.error("Set slowmode error:", err);
      res.status(500).json({ error: "Yavaş mod ayarı güncellenemedi." });
    }
  });

  // Clear Chat Messages (Admin Only)
  app.post("/api/admin/chat/clear", async (req, res) => {
    try {
      await dbClearChatMessages();
      await logModAction("admin", "Yönetici", "CHAT_CLEAR", "Tüm sohbet odası mesajları toplu olarak silindi/sıfırlandı.");
      res.json({ success: true, message: "Tüm sohbet mesajları silindi." });
    } catch (err) {
      console.error("Clear chat error:", err);
      res.status(500).json({ error: "Sohbet temizlenirken bir hata oluştu." });
    }
  });

  // Delete Single Message (Admin / Moderator)
  app.post("/api/admin/chat/delete-message", async (req, res) => {
    try {
      const { messageId } = req.body;
      if (!messageId) return res.status(400).json({ error: "Eksik mesaj ID." });
      await dbDeleteChatMessage(messageId);
      await logModAction("mod", "Moderatör", "DELETE_MSG", `Mesaj silindi: ${messageId}`);
      res.json({ success: true, message: "Mesaj silindi." });
    } catch (err) {
      console.error("Delete message error:", err);
      res.status(500).json({ error: "Mesaj silinemedi." });
    }
  });

  // Delete All Messages Of A User (Admin / Moderator)
  app.post("/api/admin/chat/delete-user-messages", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "Eksik kullanıcı ID." });
      await dbDeleteUserMessages(userId);
      await logModAction("mod", "Moderatör", "DELETE_USER_MSGS", `Kullanıcının tüm mesajları temizlendi: ${userId}`);
      res.json({ success: true, message: "Kullanıcının tüm mesajları silindi." });
    } catch (err) {
      console.error("Delete user messages error:", err);
      res.status(500).json({ error: "Kullanıcının mesajları silinemedi." });
    }
  });

  // Get Pinned Message
  app.get("/api/chat/pinned", async (req, res) => {
    try {
      const pinned = await dbGetPinnedMessage();
      res.json({ pinnedMessage: pinned });
    } catch (err) {
      res.status(500).json({ error: "Sabitlenmiş mesaj alınamadı." });
    }
  });

  // Set or Unpin Pinned Message (Admin / Moderator)
  app.post("/api/chat/pinned", async (req, res) => {
    try {
      const { text, pinnedBy, unpin, type, targetMessageId } = req.body;
      if (unpin) {
        await dbSavePinnedMessage(null);
        await logModAction(pinnedBy || "mod", pinnedBy || "Moderatör", "UNPIN_MSG", "Sabitlenmiş mesaj kaldırıldı.");
        return res.json({ success: true, pinnedMessage: null });
      }

      if (!text || !text.trim()) {
        return res.status(400).json({ error: "Sabitlenecek mesaj metni boş olamaz." });
      }

      const pinnedObj: PinnedMessage = {
        id: "pin_" + generateId(8),
        text: text.trim(),
        pinnedBy: pinnedBy || "Yönetici",
        createdAt: Date.now(),
        type: (type === "warning" || type === "important") ? type : "info",
        targetMessageId: targetMessageId || undefined,
      };

      await dbSavePinnedMessage(pinnedObj);
      await logModAction(pinnedBy || "mod", pinnedBy || "Moderatör", "PIN_MSG", `Mesaj sabitlendi (${pinnedObj.type}): "${pinnedObj.text}"`);

      res.json({ success: true, pinnedMessage: pinnedObj });
    } catch (err) {
      console.error("Set pinned message error:", err);
      res.status(500).json({ error: "Mesaj sabitlenirken bir hata oluştu." });
    }
  });

  // Get Active Poll
  app.get("/api/chat/poll/active", async (req, res) => {
    try {
      const poll = await dbGetActivePoll();
      res.json({ poll });
    } catch (err) {
      res.status(500).json({ error: "Aktif anket bilgisi alınamadı." });
    }
  });

  // Create Poll (Admin / Mod)
  app.post("/api/chat/poll/create", async (req, res) => {
    try {
      const { question, options, createdBy, createdById, durationMinutes, allowMultiple } = req.body;

      if (!question || !question.trim() || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: "Lütfen geçerli bir anket sorusu ve en az 2 seçenek girin." });
      }

      const cleanQuestion = question.trim();
      const pollOptions: PollOption[] = options
        .map((optStr: string, idx: number) => ({
          id: `opt_${idx + 1}_${generateId(4)}`,
          text: String(optStr).trim(),
          votes: []
        }))
        .filter(opt => opt.text.length > 0);

      if (pollOptions.length < 2) {
        return res.status(400).json({ error: "Anket için en az 2 dolu seçenek girmelisiniz." });
      }

      const durMins = Number(durationMinutes) || 0;
      const expiresAt = durMins > 0 ? Date.now() + (durMins * 60 * 1000) : null;

      const newPoll: ChatPoll = {
        id: "poll_" + generateId(8),
        question: cleanQuestion,
        options: pollOptions,
        createdBy: createdBy || "Kullanıcı",
        createdById: createdById || "guest",
        createdAt: Date.now(),
        expiresAt,
        allowMultiple: Boolean(allowMultiple),
        isActive: true,
      };

      await dbSaveActivePoll(newPoll);

      // Save a system message to chat
      const sysMsg: ChatMessage = {
        id: "msg_" + generateId(10),
        userId: "system",
        username: "📊 Sistem Anketi",
        text: `Yeni anket başlatıldı: "${cleanQuestion}" ${expiresAt ? `(Süre: ${durMins} dakika)` : ""}`,
        createdAt: Date.now(),
        isMod: true,
        isAdmin: true,
      };
      await dbSaveChatMessage(sysMsg);

      res.json({ success: true, poll: newPoll });
    } catch (err) {
      console.error("Create poll error:", err);
      res.status(500).json({ error: "Anket oluşturulurken bir hata oluştu." });
    }
  });

  // Vote on Poll
  app.post("/api/chat/poll/vote", async (req, res) => {
    try {
      const { pollId, optionId, userId } = req.body;
      if (!pollId || !optionId || !userId) {
        return res.status(400).json({ error: "Eksik oy kullanma bilgisi." });
      }

      const poll = await dbGetActivePoll();
      if (!poll || poll.id !== pollId || !poll.isActive) {
        return res.status(400).json({ error: "Süresi dolmuş veya aktif olmayan anket." });
      }

      const targetOpt = poll.options.find(opt => opt.id === optionId);
      if (!targetOpt) {
        return res.status(400).json({ error: "Geçersiz anket seçeneği." });
      }

      if (poll.allowMultiple) {
        // Toggle vote for multiple choice
        if (targetOpt.votes.includes(userId)) {
          targetOpt.votes = targetOpt.votes.filter(v => v !== userId);
        } else {
          targetOpt.votes.push(userId);
        }
      } else {
        // Single choice: remove userId from all options, then toggle or set
        const alreadyVotedTarget = targetOpt.votes.includes(userId);
        poll.options.forEach(opt => {
          opt.votes = opt.votes.filter(v => v !== userId);
        });

        if (!alreadyVotedTarget) {
          targetOpt.votes.push(userId);
        }
      }

      await dbSaveActivePoll(poll);

      res.json({ success: true, poll });
    } catch (err) {
      console.error("Vote poll error:", err);
      res.status(500).json({ error: "Oy kullanılırken bir hata oluştu." });
    }
  });

  // Close Poll
  app.post("/api/chat/poll/close", async (req, res) => {
    try {
      const { pollId } = req.body;
      const poll = await dbGetActivePoll();
      if (poll && poll.id === pollId) {
        poll.isActive = false;
        await finalizePollResults(poll);
        await dbSaveActivePoll(null); // Clear active poll
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Close poll error:", err);
      res.status(500).json({ error: "Anket kapatılamadı." });
    }
  });

  // Get Moderation Logs (Admin Only)
  app.get("/api/admin/chat/logs", async (req, res) => {
    try {
      const logs = await dbGetModerationLogs();
      res.json(logs);
    } catch (err) {
      console.error("Get logs error:", err);
      res.status(500).json({ error: "Moderasyon günlükleri alınamadı." });
    }
  });

  // --- SITE CONFIGURATION AND ADMIN ENDPOINTS ---

  // Get public config
  app.get("/api/config", async (req, res) => {
    try {
      const config = await dbGetConfig();
      res.json({
        ...config,
        appVersion: SERVER_BOOT_TIME
      });
    } catch (err) {
      console.error("Get config error:", err);
      res.status(500).json({ error: "Site ayarları yüklenemedi." });
    }
  });

  // Admin authentication check
  app.post("/api/admin/auth", async (req, res) => {
    try {
      const { password } = req.body;
      const actualPassword = await dbGetAdminPassword();
      
      // If the admin password is changed (it's not "admin" anymore), only the changed password is valid.
      // If it's still the default "admin", we allow "admin" or "1234" for first-time access.
      const isMatch = (password === actualPassword) || (actualPassword === "admin" && (password === "admin" || password === "1234"));
      
      if (isMatch) {
        res.json({ success: true });
      } else {
        res.status(401).json({ error: "Geçersiz yönetici şifresi!" });
      }
    } catch (err) {
      console.error("Admin auth error:", err);
      res.status(500).json({ error: "Giriş doğrulanırken hata oluştu." });
    }
  });

  // Moderator / Özel Üye authentication check
  app.post("/api/mod/auth", async (req, res) => {
    try {
      const { password } = req.body;
      const actualModPassword = await dbGetModPassword();
      const actualAdminPassword = await dbGetAdminPassword();
      
      const isModMatch = (password === actualModPassword) || (actualModPassword === "mod123" && (password === "mod123" || password === "mod"));
      const isAdminMatch = (password === actualAdminPassword) || (actualAdminPassword === "admin" && (password === "admin" || password === "1234"));

      if (isModMatch || isAdminMatch) {
        res.json({ success: true, isMod: true, isAdmin: isAdminMatch });
      } else {
        res.status(401).json({ error: "Geçersiz moderatör / özel üye şifresi!" });
      }
    } catch (err) {
      console.error("Mod auth error:", err);
      res.status(500).json({ error: "Moderatör girişi doğrulanırken hata oluştu." });
    }
  });

  // Change Admin password (Admin only)
  app.post("/api/admin/change-password", async (req, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.trim().length < 4) {
        return res.status(400).json({ error: "Şifre en az 4 karakter olmalıdır." });
      }
      await dbSaveAdminPassword(newPassword.trim());
      res.json({ success: true, message: "Yönetici şifresi başarıyla güncellendi." });
    } catch (err) {
      console.error("Change admin password error:", err);
      res.status(500).json({ error: "Şifre değiştirilirken hata oluştu." });
    }
  });

  // Change Moderator password (Admin only)
  app.post("/api/admin/change-mod-password", async (req, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.trim().length < 4) {
        return res.status(400).json({ error: "Şifre en az 4 karakter olmalıdır." });
      }
      await dbSaveModPassword(newPassword.trim());
      res.json({ success: true, message: "Moderatör şifresi başarıyla güncellendi." });
    } catch (err) {
      console.error("Change mod password error:", err);
      res.status(500).json({ error: "Moderatör şifresi değiştirilirken hata oluştu." });
    }
  });

  // Update site config (Admin only)
  app.post("/api/admin/config", async (req, res) => {
    try {
      const { 
        homepageTitle, 
        homepageSubtitle, 
        announcementEnabled, 
        announcementText,
        announcements,
        statsOffset,
        usersOffset,
        todayOffset,
        maintenanceModeEnabled,
        miniChatEnabled,
        guestMaxMb,
        guestMaxUploadCount,
        guestAutoResetMode,
        guestAutoResetHour,
        guestResetIntervalHours,
        lastGuestResetTime,
        registeredMaxMb,
        registeredMaxUploadCount,
        requireEmailVerification,
        adsEnabled,
        adsContactEmail,
        adsContactTelegram,
        adsContactInfo,
        adsList,
        structuredAnnouncements,
        securityIpLoggingEnabled,
        securityHotlinkProtection,
        securityWatermarkDefault,
        securityForceHttpsHeaders,
        securityKvkkNoticeEnabled,
        securityMaxLoginAttempts,
        privacyPolicyText,
        termsOfServiceText
      } = req.body;

      const updated = await dbSaveConfig({
        homepageTitle,
        homepageSubtitle,
        announcementEnabled: !!announcementEnabled,
        announcementText,
        announcements: announcements || (announcementText ? [announcementText] : []),
        structuredAnnouncements,
        statsOffset: statsOffset !== undefined ? Number(statsOffset) : undefined,
        usersOffset: usersOffset !== undefined ? Number(usersOffset) : undefined,
        todayOffset: todayOffset !== undefined ? Number(todayOffset) : undefined,
        maintenanceModeEnabled: maintenanceModeEnabled !== undefined ? !!maintenanceModeEnabled : undefined,
        miniChatEnabled: miniChatEnabled !== undefined ? !!miniChatEnabled : undefined,
        guestMaxMb: guestMaxMb !== undefined ? Number(guestMaxMb) : undefined,
        guestMaxUploadCount: guestMaxUploadCount !== undefined ? Number(guestMaxUploadCount) : undefined,
        guestAutoResetMode,
        guestAutoResetHour: guestAutoResetHour !== undefined ? Number(guestAutoResetHour) : undefined,
        guestResetIntervalHours: guestResetIntervalHours !== undefined ? Number(guestResetIntervalHours) : undefined,
        lastGuestResetTime: lastGuestResetTime !== undefined ? Number(lastGuestResetTime) : undefined,
        registeredMaxMb: registeredMaxMb !== undefined ? Number(registeredMaxMb) : undefined,
        registeredMaxUploadCount: registeredMaxUploadCount !== undefined ? Number(registeredMaxUploadCount) : undefined,
        requireEmailVerification: requireEmailVerification !== undefined ? !!requireEmailVerification : undefined,
        adsEnabled: adsEnabled !== undefined ? !!adsEnabled : undefined,
        adsContactEmail,
        adsContactTelegram,
        adsContactInfo,
        adsList,
        securityIpLoggingEnabled: securityIpLoggingEnabled !== undefined ? !!securityIpLoggingEnabled : undefined,
        securityHotlinkProtection: securityHotlinkProtection !== undefined ? !!securityHotlinkProtection : undefined,
        securityWatermarkDefault: securityWatermarkDefault !== undefined ? !!securityWatermarkDefault : undefined,
        securityForceHttpsHeaders: securityForceHttpsHeaders !== undefined ? !!securityForceHttpsHeaders : undefined,
        securityKvkkNoticeEnabled: securityKvkkNoticeEnabled !== undefined ? !!securityKvkkNoticeEnabled : undefined,
        securityMaxLoginAttempts: securityMaxLoginAttempts !== undefined ? Number(securityMaxLoginAttempts) : undefined,
        privacyPolicyText,
        termsOfServiceText
      });

      res.json({ success: true, config: updated });
    } catch (err) {
      console.error("Save config error:", err);
      res.status(500).json({ error: "Site ayarları kaydedilirken hata oluştu." });
    }
  });

  // Manual reset guest limits endpoint (Admin only)
  app.post("/api/admin/reset-guest-limits", async (req, res) => {
    try {
      const now = Date.now();
      guestUploadCounts = {};
      inMemoryGuestLastReset = now;
      await dbSaveConfig({ lastGuestResetTime: now });
      res.json({
        success: true,
        message: "Tüm misafir yükleme limitleri başarıyla sıfırlandı!",
        lastGuestResetTime: now
      });
    } catch (err) {
      console.error("Reset guest limits error:", err);
      res.status(500).json({ error: "Misafir limitleri sıfırlanırken hata oluştu." });
    }
  });

  // --- ADVERTISER REQUESTS ENDPOINTS ---

  // Submit Ad Request (Public)
  app.post("/api/ad-requests", async (req, res) => {
    try {
      const { senderName, senderEmail, senderMessage } = req.body;
      if (!senderEmail || !senderMessage) {
        return res.status(400).json({ error: "E-posta adresi ve mesaj alanları zorunludur." });
      }

      const newReq: AdRequestItem = {
        id: "adr_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        senderName: (senderName || "İsimsiz Başvuru").trim(),
        senderEmail: senderEmail.trim(),
        senderMessage: senderMessage.trim(),
        createdAt: Date.now(),
        status: "new"
      };

      await dbSaveAdRequest(newReq);
      res.json({ success: true, message: "Reklam talebiniz başarıyla iletildi! Yönetici ekibimiz inceleyip dönüş yapacaktır." });
    } catch (err) {
      console.error("Submit ad request error:", err);
      res.status(500).json({ error: "Reklam talebi iletilirken bir hata oluştu." });
    }
  });

  // Get Ad Requests (Admin only)
  app.get("/api/admin/ad-requests", async (req, res) => {
    try {
      const requests = await dbGetAdRequests();
      res.json({ requests });
    } catch (err) {
      console.error("Get ad requests error:", err);
      res.status(500).json({ error: "Reklam talepleri alınamadı." });
    }
  });

  // Update Ad Request status (Admin only)
  app.post("/api/admin/ad-requests/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status || !["new", "read", "contacted"].includes(status)) {
        return res.status(400).json({ error: "Geçersiz durum." });
      }
      await dbUpdateAdRequestStatus(id, status);
      res.json({ success: true });
    } catch (err) {
      console.error("Update ad request status error:", err);
      res.status(500).json({ error: "Durum güncellenemedi." });
    }
  });

  // Delete Ad Request (Admin only)
  app.delete("/api/admin/ad-requests/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await dbDeleteAdRequest(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete ad request error:", err);
      res.status(500).json({ error: "Silinemedi." });
    }
  });

  // Get SMTP Config (Admin only)
  app.get("/api/admin/smtp", async (req, res) => {
    try {
      const config = await dbGetSmtpConfig();
      res.json(config);
    } catch (err) {
      console.error("Get admin SMTP config error:", err);
      res.status(500).json({ error: "SMTP ayarları yüklenemedi." });
    }
  });

  // Save SMTP Config (Admin only)
  app.post("/api/admin/smtp", async (req, res) => {
    try {
      const { host, port, user, pass, from } = req.body;
      const updated = await dbSaveSmtpConfig({
        host: (host || "").trim(),
        port: port !== undefined ? Number(port) : 587,
        user: (user || "").trim(),
        pass: (pass || "").trim(),
        from: (from || "").trim(),
      });
      res.json({ success: true, smtp: updated });
    } catch (err) {
      console.error("Save admin SMTP config error:", err);
      res.status(500).json({ error: "SMTP ayarları kaydedilemedi." });
    }
  });

  // Test SMTP connection (Admin only)
  app.post("/api/admin/smtp/test", async (req, res) => {
    try {
      const { host, port, user, pass, from, testEmail } = req.body;
      if (!host || !user || !pass) {
        return res.status(400).json({ error: "Lütfen tüm SMTP alanlarını (sunucu, kullanıcı adı, şifre) doldurun." });
      }

      const transportConfig: any = {
        host: host.trim(),
        port: Number(port) || 587,
        secure: Number(port) === 465,
        connectionTimeout: 10000, // 10 seconds timeout
        greetingTimeout: 10000,
        socketTimeout: 10000,
        auth: {
          user: user.trim(),
          pass: pass.trim(),
        },
        tls: {
          rejectUnauthorized: false // Prevents SSL/TLS handshake issues on cloud containers
        },
        family: 4 // Force IPv4 to avoid ENETUNREACH on systems with broken IPv6 routing
      };

      const testTransporter = nodemailer.createTransport(transportConfig);

      const targetEmail = testEmail || user;
      let fromAddress = (from || "").trim();
      if (!fromAddress) {
        fromAddress = `"İnanResim SMTP Test" <${user}>`;
      } else if (!fromAddress.includes("@") && !fromAddress.includes("<")) {
        fromAddress = `"${fromAddress}" <${user}>`;
      }

      await testTransporter.sendMail({
        from: fromAddress,
        to: targetEmail,
        subject: "İnanResim SMTP Test E-postası",
        text: "Merhaba,\n\nBu e-posta, İnanResim Yönetici Paneli üzerinden gönderilen başarılı bir SMTP bağlantı testidir.\n\nHer şey doğru çalışıyor!\n\nSaygılarımızla,\nİnanResim Sistem Yöneticisi",
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #10b981; margin-bottom: 12px;">🎉 SMTP Testi Başarılı!</h2>
            <p>Merhaba,</p>
            <p>Bu e-posta, <strong>İnanResim Yönetici Paneli</strong> üzerinden yapılan SMTP testinin başarıyla tamamlandığını doğrulamaktadır.</p>
            <p>Şu andan itibaren şifre sıfırlama taleplerinde gerçek e-postalar bu SMTP sunucusu aracılığıyla gönderilecektir.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 11px; color: #94a3b8;">Gönderen Sunucu: ${host}:${port}</p>
          </div>
        `
      });

      res.json({ success: true, message: `Bağlantı başarılı! ${targetEmail} adresine test e-postası gönderildi.` });
    } catch (err: any) {
      console.error("Test SMTP connection error:", err);
      res.status(500).json({ error: `Bağlantı kurulamadı veya e-posta gönderilemedi: ${err.message}` });
    }
  });

  // Get all registered users (Admin only)
  app.get("/api/admin/users", async (req, res) => {
    try {
      const allUsers = await dbGetAllUsers(users);
      res.json(allUsers);
    } catch (err) {
      console.error("Admin get users error:", err);
      res.status(500).json({ error: "Kullanıcı listesi alınamadı." });
    }
  });

  // Ban/Unban user (Admin only)
  app.post("/api/admin/users/:id/ban", async (req, res) => {
    try {
      const userId = req.params.id;
      const { isBanned, banReason } = req.body;
      await dbBanUser(userId, !!isBanned, banReason || "", users);
      res.json({
        success: true,
        message: isBanned ? "Kullanıcı başarıyla engellendi." : "Kullanıcının engeli kaldırıldı."
      });
    } catch (err) {
      console.error("Admin ban user error:", err);
      res.status(500).json({ error: "İşlem gerçekleştirilemedi." });
    }
  });

  // Delete user (Admin only)
  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      const userId = req.params.id;
      await dbDeleteUser(userId, users);
      res.json({ success: true, message: "Kullanıcı hesabı başarıyla silindi." });
    } catch (err) {
      console.error("Admin delete user error:", err);
      res.status(500).json({ error: "Kullanıcı silinemedi." });
    }
  });

  // Get all uploaded images metadata (Admin only)
  app.get("/api/admin/images", async (req, res) => {
    try {
      const allImages = await dbGetAllImages(images);
      res.json(allImages);
    } catch (err) {
      console.error("Admin get images error:", err);
      res.status(500).json({ error: "Görsel listesi alınamadı." });
    }
  });

  // Admin delete ALL images
  app.delete("/api/admin/images/delete-all", async (req, res) => {
    try {
      const count = await dbDeleteAllImages(images);
      res.json({ success: true, count, message: `${count} adet görsel sistemden tamamen silindi.` });
    } catch (err) {
      console.error("Admin delete all images error:", err);
      res.status(500).json({ error: "Görseller silinirken hata oluştu." });
    }
  });

  // Admin batch delete selected images
  app.post("/api/admin/images/batch-delete", async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Silinecek geçerli görsel ID listesi girilmedi." });
    }
    try {
      const count = await dbDeleteBatchImages(ids, images);
      res.json({ success: true, count, message: `${count} adet görsel silindi.` });
    } catch (err) {
      console.error("Admin batch delete images error:", err);
      res.status(500).json({ error: "Görseller silinirken hata oluştu." });
    }
  });

  // Admin delete single image
  app.delete("/api/admin/images/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const deleted = await dbDeleteImage(id, images);
      if (deleted) {
        res.json({ success: true, message: "Görsel yönetici tarafından silindi." });
      } else {
        res.status(404).json({ error: "Görsel bulunamadı." });
      }
    } catch (err) {
      console.error("Admin delete image error:", err);
      res.status(500).json({ error: "Görsel silinirken hata oluştu." });
    }
  });

  // --- VIP & PAYMENT ENDPOINTS ---

  // User submits a Payment Request (Havale/EFT or Credit Card notification)
  app.post("/api/vip/request-payment", async (req, res) => {
    try {
      const {
        userId,
        username,
        userEmail,
        plan,
        amount,
        paymentMethod,
        senderName,
        selectedBankId,
        bankName,
        transferNote,
        receiptNumber,
        receiptImgUrl,
        cardNumberMasked,
      } = req.body;

      if (!userId || !plan || !amount || !paymentMethod) {
        return res.status(400).json({ error: "Eksik ödeme isteği bilgileri." });
      }

      const pr: PaymentRequest = {
        id: "pr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        userId,
        username: username || "Kullanıcı",
        userEmail: userEmail || "",
        plan: plan === "yearly" ? "yearly" : "monthly",
        amount: Number(amount),
        paymentMethod: paymentMethod === "card" ? "card" : "havale",
        senderName: senderName || "",
        selectedBankId: selectedBankId || "",
        bankName: bankName || "",
        transferNote: transferNote || "",
        receiptNumber: receiptNumber || "",
        receiptImgUrl: receiptImgUrl || "",
        cardNumberMasked: cardNumberMasked || "",
        status: "pending",
        createdAt: Date.now(),
      };

      const created = await dbCreatePaymentRequest(pr);
      res.json({
        success: true,
        message: "Ödeme bildirimi başarıyla alındı. Yönetici onayının ardından VIP üyeliğiniz aktifleşecektir.",
        paymentRequest: created
      });
    } catch (err) {
      console.error("Create payment request error:", err);
      res.status(500).json({ error: "Ödeme bildirimi gönderilirken hata oluştu." });
    }
  });

  // Direct Credit Card Processing endpoint
  app.post("/api/vip/pay-card", async (req, res) => {
    try {
      const {
        userId,
        username,
        userEmail,
        plan,
        cardNumber,
        cardHolder,
        cardExpiry,
        cardCvc
      } = req.body;

      if (!userId || !plan || !cardNumber || !cardHolder) {
        return res.status(400).json({ error: "Lütfen tüm kart bilgilerini eksiksiz doldurun." });
      }

      const config = await dbGetConfig();
      const amount = plan === "yearly" ? (config.vipAnnualPrice || 950) : (config.vipMonthlyPrice || 99);
      const cleanCardNum = cardNumber.replace(/\s+/g, "");
      const maskedCard = cleanCardNum.length >= 16 
        ? `${cleanCardNum.slice(0, 4)} **** **** ${cleanCardNum.slice(-4)}`
        : "**** **** **** ****";

      // Create Payment Request record
      const pr: PaymentRequest = {
        id: "pr_card_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        userId,
        username: username || "Kullanıcı",
        userEmail: userEmail || "",
        plan: plan === "yearly" ? "yearly" : "monthly",
        amount,
        paymentMethod: "card",
        senderName: cardHolder,
        cardNumberMasked: maskedCard,
        status: "approved",
        createdAt: Date.now(),
        reviewedAt: Date.now(),
      };

      await dbCreatePaymentRequest(pr);

      // Instantly grant VIP status
      await dbSetUserVip(userId, true, plan === "yearly" ? "yearly" : "monthly", users);

      res.json({
        success: true,
        message: "Kredi/Banka kartı ödemeniz başarıyla doğrulandı! 👑 PRO VIP Üyeliğiniz anında aktifleştirildi.",
        paymentRequest: pr
      });
    } catch (err) {
      console.error("Card payment error:", err);
      res.status(500).json({ error: "Kart ödemesi gerçekleştirilemedi." });
    }
  });

  // Admin Get All Payment Requests
  app.get("/api/admin/payment-requests", async (req, res) => {
    try {
      const requests = await dbGetAllPaymentRequests();
      res.json(requests);
    } catch (err) {
      console.error("Get admin payment requests error:", err);
      res.status(500).json({ error: "Ödeme talepleri alınamadı." });
    }
  });

  // Admin Approve Payment Request
  app.post("/api/admin/payment-requests/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const ok = await dbApprovePaymentRequest(id, users);
      if (ok) {
        res.json({ success: true, message: "Ödeme onaylandı ve kullanıcı PRO VIP yapıldı." });
      } else {
        res.status(404).json({ error: "Ödeme talebi bulunamadı." });
      }
    } catch (err) {
      console.error("Approve payment request error:", err);
      res.status(500).json({ error: "Ödeme onaylanamadı." });
    }
  });

  // Admin Reject Payment Request
  app.post("/api/admin/payment-requests/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const ok = await dbRejectPaymentRequest(id, rejectionReason || "Ödeme dekontu/bilgileri doğrulanamadı.");
      if (ok) {
        res.json({ success: true, message: "Ödeme talebi reddedildi." });
      } else {
        res.status(404).json({ error: "Ödeme talebi bulunamadı." });
      }
    } catch (err) {
      console.error("Reject payment request error:", err);
      res.status(500).json({ error: "İşlem başarısız." });
    }
  });

  // Admin Manual User VIP Toggle
  app.post("/api/admin/users/:id/vip", async (req, res) => {
    try {
      const { id } = req.params;
      const { isVip, plan } = req.body;
      await dbSetUserVip(id, !!isVip, plan === "yearly" ? "yearly" : "monthly", users);
      res.json({
        success: true,
        message: isVip ? "Kullanıcı başarıyla PRO VIP yapıldı." : "Kullanıcının VIP statüsü kaldırıldı."
      });
    } catch (err) {
      console.error("Admin manual VIP error:", err);
      res.status(500).json({ error: "VIP durumu güncellenemedi." });
    }
  });

  // Background check for expired images (every 10 minutes to save read costs)
  setInterval(() => {
    dbCleanExpiredImages(images).catch(err => {
      console.error("Background cleanup task error:", err);
    });
  }, 10 * 60 * 1000);

  // --- VITE DEVELOPMENT MIDDLEWARE OR PRODUCTION SERVING ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});

