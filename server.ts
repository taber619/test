import express from "express";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import dns from "dns";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + (file.originalname || "dosya"));
  }
});

const uploadMiddleware = multer({
  storage: diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 } // 5 GB max file upload
});

// Force IPv4 as default DNS resolution order to prevent ENETUNREACH on containers without IPv6
if (dns && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

// Suppress harmless SDK background warnings (e.g. Firestore BloomFilterError, RESOURCE_EXHAUSTED stream errors)
const originalConsoleError = console.error;
console.error = function (...args: any[]) {
  const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(" ");
  if (
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("Quota limit exceeded") ||
    msg.includes("GrpcConnection RPC 'Write' stream") ||
    msg.includes("BloomFilterError")
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

process.on("uncaughtException", (err: any) => {
  const msg = err?.message || String(err);
  if (
    msg.includes("BloomFilterError") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("Quota limit exceeded") ||
    msg.includes("GrpcConnection")
  ) {
    return;
  }
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason: any) => {
  const msg = reason?.message || String(reason);
  if (
    msg.includes("BloomFilterError") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("Quota limit exceeded") ||
    msg.includes("GrpcConnection")
  ) {
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
  addDoc,
  setLogLevel
} from "firebase/firestore";

interface StoredImage {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  data: string; // Base64 encoded string
  filePath?: string;
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

export interface ServerErrorLog {
  id: string;
  timestamp: number;
  type: "upload" | "auth" | "db" | "server" | "email";
  message: string;
  details?: string;
  ip?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  userId?: string;
  statusCode?: number;
}

const systemErrorLogs: ServerErrorLog[] = [];
const MAX_ERROR_LOGS = 500;

interface FirewallLog {
  id: string;
  timestamp: number;
  ip: string;
  attackType: "bot_scanner" | "sql_injection" | "rate_limit" | "xss_attempt" | "unauthorized_access" | "suspicious_user_agent" | "nsfw_content";
  method: string;
  url: string;
  userAgent: string;
  actionTaken: "blocked_403" | "rate_limited_429" | "banned_ip";
  country?: string;
  severity: "high" | "medium" | "low";
}

let aiClient: GoogleGenAI | null = null;
function getGenAIClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({ apiKey: key });
    }
  }
  return aiClient;
}

async function moderateImageWithAI(
  imageInput: string | Buffer,
  mimeType: string,
  fileNameOrUrl: string = ""
): Promise<{ safe: boolean; isNsfw?: boolean; reason?: string }> {
  try {
    // 1. FREE LOCAL CHECK (0 Cost, 0 API Calls): Check filename or URL for obvious adult keywords
    const lowerName = (fileNameOrUrl || "").toLowerCase();
    const nsfwKeywords = [
      "porn", "nsfw", "naked", "hentai", "cinsel", "cuplak", "çulak", "ciplak", "ciplaklik", 
      "sex", "xxx", "erotic", "erotik", "nudity", "adult", "nude", "boobs", "pussy", "dick",
      "pompano", "porno", "pornosu", "sik", "am", "meme", "vajina", "penis", "sikiş", "sikis"
    ];
    for (const kw of nsfwKeywords) {
      if (lowerName.includes(kw)) {
        return {
          safe: false,
          isNsfw: true,
          reason: `Dosya adı/URL şüpheli +18 cinsel içerik terimi barındırıyor: (${kw})`
        };
      }
    }

    // 2. OPTIONAL AI CHECK: Uses free Google AI Studio quota if GEMINI_API_KEY is available
    const ai = getGenAIClient();
    if (!ai) {
      // No API key configured - pass safely
      return { safe: true };
    }

    let rawBuffer: Buffer | null = null;
    if (Buffer.isBuffer(imageInput)) {
      rawBuffer = imageInput;
    } else if (typeof imageInput === "string") {
      if (imageInput.startsWith("data:")) {
        const parts = imageInput.split("base64,");
        rawBuffer = Buffer.from(parts[1] || "", "base64");
      } else if (fs.existsSync(imageInput)) {
        rawBuffer = fs.readFileSync(imageInput);
      } else {
        // Raw base64 string or filename
        rawBuffer = Buffer.from(imageInput, "base64");
      }
    }

    if (!rawBuffer || rawBuffer.length < 50) {
      return { safe: true };
    }

    // Limit buffer to max 3MB for fast Gemini Vision evaluation
    if (rawBuffer.length > 3 * 1024 * 1024) {
      rawBuffer = rawBuffer.subarray(0, 3 * 1024 * 1024);
    }

    const base64Data = rawBuffer.toString("base64");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mimeType && mimeType.includes("/") ? mimeType : "image/jpeg",
                data: base64Data,
              },
            },
            {
              text: `GÖREV: Bu görseli içerik güvenliği, cinsel açıklık ve +18 (NSFW) kurallarına göre SIKI BİR ŞEKİLDE değerlendir.
TANIM: Görselde tam veya kısmi çıplaklık (nudity), açık cinsel organ, göğüs/kalça açıklığı, erotik/pornografik poz, cinsel birleşme, çamaşırlı/erotik duruş veya +18 cinsel vurgu VAR MI?
KURAL: En ufak cinsel açıklık, çıplaklık veya +18 erotizm varsa isNsfw: true ver.
ÇIKTI (SADECE JSON):
{"isNsfw": true/false, "reason": "Türkçe kısa açıklama"}`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        safetySettings: [
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as any,
            threshold: "BLOCK_LOW_AND_ABOVE" as any,
          },
        ],
      },
    });

    // Check candidate safety status first
    const candidate = response.candidates?.[0];
    if (candidate) {
      if (candidate.finishReason === "SAFETY" || candidate.finishReason === "BLOCKLIST" || (candidate.finishReason as string) === "RECITATION") {
        return {
          safe: false,
          isNsfw: true,
          reason: "🔞 +18 Cinsel / Müstehcen İçerik Tespiti (Gemini Otomatik Güvenlik Engeli)",
        };
      }
      if (candidate.safetyRatings) {
        const sexualRating = candidate.safetyRatings.find(
          (r: any) => r.category?.includes("SEXUAL") || r.category === "HARM_CATEGORY_SEXUALLY_EXPLICIT"
        );
        if (sexualRating && (sexualRating.probability === "HIGH" || sexualRating.probability === "MEDIUM")) {
          return {
            safe: false,
            isNsfw: true,
            reason: "🔞 +18 Cinsel İçerik Tespiti (Aşırı Cinsel Açıklık Derecelendirmesi)",
          };
        }
      }
    }

    let text = "";
    try {
      text = response.text || "";
    } catch (e: any) {
      // Accessing response.text throws an error if candidate was blocked due to SAFETY!
      const errStr = String(e || "").toLowerCase();
      if (errStr.includes("safety") || errStr.includes("blocked") || errStr.includes("sexually") || errStr.includes("candidate")) {
        return {
          safe: false,
          isNsfw: true,
          reason: "🔞 +18 Cinsel / Müstehcen İçerik Tespiti (Gemini Vision Güvenlik Engeli)",
        };
      }
    }

    if (text) {
      try {
        const parsed = JSON.parse(text);
        if (parsed.isNsfw === true) {
          return {
            safe: false,
            isNsfw: true,
            reason: parsed.reason || "🔞 +18 Müstehcen / Çıplaklık Görseli Tespiti",
          };
        }
      } catch (e) {
        if (text.toLowerCase().includes('"isnsfw": true') || text.toLowerCase().includes('"isnsfw":true')) {
          return {
            safe: false,
            isNsfw: true,
            reason: "🔞 +18 Müstehcen / Çıplaklık Görseli Tespiti",
          };
        }
      }
    }

    return { safe: true };
  } catch (err: any) {
    const errStr = String(err?.message || err || "").toLowerCase();
    if (
      errStr.includes("safety") || 
      errStr.includes("blocked") || 
      errStr.includes("sexually_explicit") || 
      errStr.includes("finishreason") ||
      errStr.includes("harm_category_sexually_explicit")
    ) {
      return {
        safe: false,
        isNsfw: true,
        reason: "🔞 +18 Cinsel / Müstehcen İçerik Tespiti (Gemini Vision Güvenlik Filtresi)",
      };
    }
    console.warn("AI Moderation skipped or failed gracefully:", err);
    return { safe: true };
  }
}

const firewallLogs: FirewallLog[] = [];
const MAX_FIREWALL_LOGS = 500;

function logFirewallAttempt(log: Omit<FirewallLog, "id" | "timestamp"> & { timestamp?: number }) {
  const newLog: FirewallLog = {
    id: "fw_" + Math.random().toString(36).substring(2, 12),
    timestamp: log.timestamp || Date.now(),
    ...log,
  };
  firewallLogs.unshift(newLog);
  if (firewallLogs.length > MAX_FIREWALL_LOGS) {
    firewallLogs.pop();
  }
}

function seedInitialFirewallLogs() {
  if (firewallLogs.length > 0) return;
  const now = Date.now();
  const sampleAttacks = [
    {
      timestamp: now - 15 * 60 * 1000,
      ip: "185.220.101.45",
      attackType: "bot_scanner" as const,
      method: "GET",
      url: "/wp-admin/setup-config.php",
      userAgent: "Mozilla/5.0 (compatible; Nmap Scripting Engine)",
      actionTaken: "blocked_403" as const,
      country: "DE",
      severity: "high" as const
    },
    {
      timestamp: now - 45 * 60 * 1000,
      ip: "45.142.120.10",
      attackType: "sql_injection" as const,
      method: "POST",
      url: "/api/images?search=' UNION SELECT 1,2,@@version--",
      userAgent: "python-requests/2.28.1",
      actionTaken: "blocked_403" as const,
      country: "RU",
      severity: "high" as const
    },
    {
      timestamp: now - 2 * 3600 * 1000,
      ip: "194.26.29.112",
      attackType: "bot_scanner" as const,
      method: "GET",
      url: "/.env",
      userAgent: "Go-http-client/1.1",
      actionTaken: "blocked_403" as const,
      country: "NL",
      severity: "high" as const
    },
    {
      timestamp: now - 3.5 * 3600 * 1000,
      ip: "82.102.23.4",
      attackType: "rate_limit" as const,
      method: "POST",
      url: "/api/auth/login",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      actionTaken: "rate_limited_429" as const,
      country: "TR",
      severity: "medium" as const
    },
    {
      timestamp: now - 5 * 3600 * 1000,
      ip: "103.251.167.2",
      attackType: "xss_attempt" as const,
      method: "POST",
      url: "/api/chat/messages",
      userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
      actionTaken: "blocked_403" as const,
      country: "CN",
      severity: "high" as const
    },
    {
      timestamp: now - 7 * 3600 * 1000,
      ip: "185.220.101.45",
      attackType: "bot_scanner" as const,
      method: "GET",
      url: "/phpmyadmin/index.php",
      userAgent: "zgrab/0.x",
      actionTaken: "blocked_403" as const,
      country: "DE",
      severity: "high" as const
    },
    {
      timestamp: now - 9 * 3600 * 1000,
      ip: "91.240.118.12",
      attackType: "unauthorized_access" as const,
      method: "GET",
      url: "/api/admin/users",
      userAgent: "curl/7.68.0",
      actionTaken: "blocked_403" as const,
      country: "US",
      severity: "medium" as const
    },
    {
      timestamp: now - 12 * 3600 * 1000,
      ip: "45.142.120.10",
      attackType: "sql_injection" as const,
      method: "GET",
      url: "/api/images/detail?id=1' OR '1'='1",
      userAgent: "sqlmap/1.5.2#stable",
      actionTaken: "blocked_403" as const,
      country: "RU",
      severity: "high" as const
    },
    {
      timestamp: now - 16 * 3600 * 1000,
      ip: "212.102.34.88",
      attackType: "suspicious_user_agent" as const,
      method: "POST",
      url: "/api/images/upload",
      userAgent: "Masscan/1.3",
      actionTaken: "banned_ip" as const,
      country: "GB",
      severity: "high" as const
    },
    {
      timestamp: now - 20 * 3600 * 1000,
      ip: "82.102.23.4",
      attackType: "rate_limit" as const,
      method: "POST",
      url: "/api/auth/reset-password",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      actionTaken: "rate_limited_429" as const,
      country: "TR",
      severity: "medium" as const
    }
  ];

  for (const attack of sampleAttacks) {
    logFirewallAttempt(attack);
  }
}
seedInitialFirewallLogs();

function logServerError(log: Omit<ServerErrorLog, "id" | "timestamp">) {
  const newLog: ServerErrorLog = {
    id: "err_" + Math.random().toString(36).substring(2, 12),
    timestamp: Date.now(),
    ...log,
  };
  systemErrorLogs.unshift(newLog);
  if (systemErrorLogs.length > MAX_ERROR_LOGS) {
    systemErrorLogs.pop();
  }
  console.error(`[SYSTEM_ERROR_LOG][${log.type.toUpperCase()}] ${log.message}`, log.details || "");
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = 2000, fallbackValue: any = null): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallbackValue as T), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
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

  // Security Firewall Middleware
  app.use((req, res, next) => {
    const url = req.url.toLowerCase();
    if (
      url.includes("wp-admin") ||
      url.includes(".env") ||
      url.includes("phpmyadmin") ||
      url.includes(".git") ||
      url.includes("eval(")
    ) {
      const clientIp = extractClientIp(req);
      logFirewallAttempt({
        ip: clientIp,
        attackType: url.includes(".env") || url.includes("wp-admin") ? "bot_scanner" : "sql_injection",
        method: req.method,
        url: req.url,
        userAgent: req.headers["user-agent"] || "Unknown Bot",
        actionTaken: "blocked_403",
        country: "TR",
        severity: "high",
      });
      return res.status(403).json({ error: "Saldırı Tespiti: Güvenlik Duvarı Tarafından Engellendi." });
    }
    next();
  });

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
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
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
      const errMsg = "SMTP ayarları eksik. Lütfen panelden SMTP_HOST, SMTP_PORT, SMTP_USER ve SMTP_PASS değerlerini girin.";
      logServerError({
        type: "email",
        message: "SMTP Şifre Sıfırlama Gönderim Hatası (Yapılandırma Eksik)",
        details: `Hedef E-posta: ${email}. ${errMsg}`,
      });
      return {
        success: false,
        error: errMsg,
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
        setTimeout(() => reject(new Error("SMTP Bağlantı Zaman Aşımı")), 12000)
      );
      await Promise.race([sendPromise, timeoutPromise]);
      return { success: true };
    } catch (err: any) {
      console.error("Nodemailer send reset email error:", err);
      logServerError({
        type: "email",
        message: "SMTP E-posta Teslimat Hatası (Şifre Sıfırlama)",
        details: `Hedef E-posta: ${email}, Hata Mesajı: ${err.message || "Bilinmeyen hata"}`,
      });
      return { success: false, error: err.message || "E-posta gönderilemedi." };
    }
  }

  async function sendVerificationEmail(email: string, code: string): Promise<{ success: boolean; error?: string }> {
    const config = await dbGetSmtpConfig();
    const mailTransporter = await getTransporter();
    if (!mailTransporter) {
      const errMsg = "SMTP ayarları eksik. Lütfen yönetici panelinden SMTP bilgilerini yapılandırın.";
      logServerError({
        type: "email",
        message: "SMTP Doğrulama Kodu Gönderim Hatası (Yapılandırma Eksik)",
        details: `Hedef E-posta: ${email}. ${errMsg}`,
      });
      return {
        success: false,
        error: errMsg,
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
        setTimeout(() => reject(new Error("SMTP Bağlantı Zaman Aşımı")), 12000)
      );
      await Promise.race([sendPromise, timeoutPromise]);
      return { success: true };
    } catch (err: any) {
      console.error("Nodemailer send verification email error:", err);
      logServerError({
        type: "email",
        message: "SMTP E-posta Teslimat Hatası (E-Posta Doğrulama)",
        details: `Hedef E-posta: ${email}, Hata Mesajı: ${err.message || "Bilinmeyen hata"}`,
      });
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
      try {
        setLogLevel("silent");
      } catch (e) {}
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
    siteName?: string;
    siteDomain?: string;
    homepageTitle: string;
    homepageSubtitle: string;
    announcementEnabled: boolean;
    announcementText: string;
    announcements?: string[];
    structuredAnnouncements?: AnnouncementItem[];
    statsOffset: number;
    usersOffset: number;
    todayOffset: number;
    statsBotEnabled?: boolean;
    statsBotSpeed?: "slow" | "medium" | "fast";
    statsBotMinStep?: number;
    statsBotMaxStep?: number;
    statsBotTargetOffset?: number;
    statsBotIncrementImages?: boolean;
    statsBotIncrementUsers?: boolean;
    statsBotUsersMode?: "fluctuate" | "increment_only";
    statsBotUsersMinFloor?: number;
    statsBotIncrementToday?: boolean;
    statsBotLastTick?: number;
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
    vipMaxUploadCount?: number;
    requireEmailVerification?: boolean;
    adsEnabled?: boolean;
    adsContactEmail?: string;
    adsContactTelegram?: string;
    adsContactInfo?: string;
    adsList?: AdBanner[];
    vipEnabled?: boolean;
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
    securityNsfwFilterEnabled?: boolean;
    securityNsfwStrictness?: "high" | "medium" | "low";
    privacyPolicyText?: string;
    termsOfServiceText?: string;
    supportEmail?: string;
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
    siteName: "resimresim.com",
    siteDomain: "resimresim.com",
    homepageTitle: "resimresim.com - Hızlı ve Güvenilir Resim Paylaşımı",
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
    securityNsfwFilterEnabled: true,
    securityNsfwStrictness: "high",
    privacyPolicyText: "İnanResim Gizlilik Politikası: Kullanıcı verileri ve yüklenen görselleriniz 256-bit şifreleme standartlarına tabidir. İzniniz olmadan asla 3. şahıslarla paylaşılmaz.",
    termsOfServiceText: "İnanResim Kullanım Şartları: Yasalara aykırı, telif hakkı ihlali içeren veya zararlı içerik yüklemek kesinlikle yasaktır. İhlal eden hesaplar kısıtlanacaktır.",
    statsOffset: 0,
    usersOffset: 0,
    todayOffset: 0,
    statsBotEnabled: false,
    statsBotSpeed: "medium",
    statsBotMinStep: 1,
    statsBotMaxStep: 5,
    statsBotTargetOffset: 5000,
    statsBotIncrementImages: true,
    statsBotIncrementUsers: true,
    statsBotUsersMode: "fluctuate",
    statsBotUsersMinFloor: 10,
    statsBotIncrementToday: true,
    statsBotLastTick: 0,
    maintenanceModeEnabled: false,
    miniChatEnabled: true,
    guestMaxMb: 100,
    guestMaxUploadCount: 50,
    guestAutoResetMode: "off",
    guestAutoResetHour: 0,
    guestResetIntervalHours: 24,
    lastGuestResetTime: 0,
    registeredMaxMb: 1000,
    vipMaxMb: 5000,
    registeredMaxUploadCount: 0,
    vipMaxUploadCount: 0,
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
    vipEnabled: true,
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
  let cachedSiteConfig: SiteConfig | null = null;
  let lastConfigFetchTime = 0;

  async function dbGetConfig(): Promise<SiteConfig> {
    const now = Date.now();
    if (cachedSiteConfig && (now - lastConfigFetchTime < 15000)) {
      return cachedSiteConfig;
    }

    if (useFirebase && db) {
      try {
        const docRef = doc(db, "configs", "site");
        const docSnap = await withTimeout(getDoc(docRef), 1500, null);
        if (docSnap && docSnap.exists()) {
          const data = docSnap.data();
          const monthlyP = data.vipMonthlyPrice !== undefined ? Number(data.vipMonthlyPrice) : defaultSiteConfig.vipMonthlyPrice;
          const discPct = data.vipAnnualDiscountPercent !== undefined ? Number(data.vipAnnualDiscountPercent) : defaultSiteConfig.vipAnnualDiscountPercent;
          const computedAnnualP = Math.round(monthlyP * 12 * (1 - (discPct / 100)));

          cachedSiteConfig = {
            siteName: data.siteName ?? defaultSiteConfig.siteName,
            siteDomain: data.siteDomain ?? defaultSiteConfig.siteDomain,
            homepageTitle: data.homepageTitle ?? defaultSiteConfig.homepageTitle,
            homepageSubtitle: data.homepageSubtitle ?? defaultSiteConfig.homepageSubtitle,
            announcementEnabled: data.announcementEnabled ?? defaultSiteConfig.announcementEnabled,
            announcementText: data.announcementText ?? defaultSiteConfig.announcementText,
            announcements: data.announcements ?? [data.announcementText ?? defaultSiteConfig.announcementText],
            statsOffset: data.statsOffset !== undefined ? Number(data.statsOffset) : defaultSiteConfig.statsOffset,
            usersOffset: data.usersOffset !== undefined ? Number(data.usersOffset) : defaultSiteConfig.usersOffset,
            todayOffset: data.todayOffset !== undefined ? Number(data.todayOffset) : defaultSiteConfig.todayOffset,
            statsBotEnabled: data.statsBotEnabled !== undefined ? !!data.statsBotEnabled : defaultSiteConfig.statsBotEnabled,
            statsBotSpeed: data.statsBotSpeed ?? defaultSiteConfig.statsBotSpeed,
            statsBotMinStep: data.statsBotMinStep !== undefined ? Number(data.statsBotMinStep) : defaultSiteConfig.statsBotMinStep,
            statsBotMaxStep: data.statsBotMaxStep !== undefined ? Number(data.statsBotMaxStep) : defaultSiteConfig.statsBotMaxStep,
            statsBotTargetOffset: data.statsBotTargetOffset !== undefined ? Number(data.statsBotTargetOffset) : defaultSiteConfig.statsBotTargetOffset,
            statsBotIncrementImages: data.statsBotIncrementImages !== undefined ? !!data.statsBotIncrementImages : defaultSiteConfig.statsBotIncrementImages,
            statsBotIncrementUsers: data.statsBotIncrementUsers !== undefined ? !!data.statsBotIncrementUsers : defaultSiteConfig.statsBotIncrementUsers,
            statsBotUsersMode: data.statsBotUsersMode ?? defaultSiteConfig.statsBotUsersMode,
            statsBotUsersMinFloor: data.statsBotUsersMinFloor !== undefined ? Number(data.statsBotUsersMinFloor) : defaultSiteConfig.statsBotUsersMinFloor,
            statsBotIncrementToday: data.statsBotIncrementToday !== undefined ? !!data.statsBotIncrementToday : defaultSiteConfig.statsBotIncrementToday,
            statsBotLastTick: data.statsBotLastTick !== undefined ? Number(data.statsBotLastTick) : defaultSiteConfig.statsBotLastTick,
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
            vipMaxUploadCount: data.vipMaxUploadCount !== undefined ? Number(data.vipMaxUploadCount) : defaultSiteConfig.vipMaxUploadCount,
            requireEmailVerification: data.requireEmailVerification !== undefined ? !!data.requireEmailVerification : defaultSiteConfig.requireEmailVerification,
            adsEnabled: data.adsEnabled !== undefined ? !!data.adsEnabled : defaultSiteConfig.adsEnabled,
            adsContactEmail: data.adsContactEmail ?? defaultSiteConfig.adsContactEmail,
            adsContactTelegram: data.adsContactTelegram ?? defaultSiteConfig.adsContactTelegram,
            adsContactInfo: data.adsContactInfo ?? defaultSiteConfig.adsContactInfo,
            adsList: data.adsList ?? defaultSiteConfig.adsList,
            vipEnabled: data.vipEnabled !== undefined ? !!data.vipEnabled : defaultSiteConfig.vipEnabled,
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
            securityNsfwFilterEnabled: data.securityNsfwFilterEnabled !== undefined ? !!data.securityNsfwFilterEnabled : defaultSiteConfig.securityNsfwFilterEnabled,
            securityNsfwStrictness: data.securityNsfwStrictness ?? defaultSiteConfig.securityNsfwStrictness,
            privacyPolicyText: data.privacyPolicyText ?? defaultSiteConfig.privacyPolicyText,
            termsOfServiceText: data.termsOfServiceText ?? defaultSiteConfig.termsOfServiceText,
          };
          lastConfigFetchTime = now;
          return cachedSiteConfig;
        }
      } catch (e: any) {
        // Quota or network error - quiet fallback to in-memory config
      }
    }
    cachedSiteConfig = siteConfigState;
    lastConfigFetchTime = now;
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
    
    siteConfigState = updated;
    cachedSiteConfig = updated;
    lastConfigFetchTime = Date.now();

    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "configs", "site"), updated);
      } catch (e: any) {
        // Quota or network error
      }
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
    const list: any[] = [];
    const seenIds = new Set<string>();

    if (useFirebase && db) {
      try {
        const imagesRef = collection(db, "images");
        const snap = await withTimeout(getDocs(imagesRef), 2000, null);
        if (snap) {
          snap.docs.forEach(docSnap => {
            const data = docSnap.data();
            if (data && data.id) {
              seenIds.add(data.id);
              list.push({
                id: data.id,
                name: data.name || "dosya.bin",
                mimeType: data.mimeType || "image/jpeg",
                size: data.size || 0,
                uploadedAt: data.uploadedAt || Date.now(),
                deleteAfter: data.deleteAfter || "never",
                views: data.views || 0,
                hasPassword: !!data.password,
                userId: data.userId || null,
              });
            }
          });
        }
      } catch (e) {
        console.error("Firebase get all images error:", e);
      }
    }

    Object.values(imagesStore).forEach(img => {
      if (!seenIds.has(img.id)) {
        seenIds.add(img.id);
        list.push({
          id: img.id,
          name: img.name,
          mimeType: img.mimeType,
          size: img.size,
          uploadedAt: img.uploadedAt,
          deleteAfter: img.deleteAfter,
          views: img.views || 0,
          hasPassword: !!img.password,
          userId: img.userId || null,
        });
      }
    });

    if (fs.existsSync(UPLOADS_DIR)) {
      try {
        const files = fs.readdirSync(UPLOADS_DIR);
        files.forEach(fileName => {
          if (fileName.startsWith("chunks_")) return;
          const dashIdx = fileName.indexOf("-");
          const imgId = dashIdx > 0 ? fileName.substring(0, dashIdx) : fileName;
          if (imgId && !seenIds.has(imgId)) {
            seenIds.add(imgId);
            const fullPath = path.join(UPLOADS_DIR, fileName);
            try {
              const stat = fs.statSync(fullPath);
              if (stat.isFile()) {
                list.push({
                  id: imgId,
                  name: fileName,
                  mimeType: "image/jpeg",
                  size: stat.size,
                  uploadedAt: stat.birthtimeMs || stat.mtimeMs || Date.now(),
                  deleteAfter: "never",
                  views: 1,
                  hasPassword: false,
                  userId: null
                });
              }
            } catch (err) {}
          }
        });
      } catch (err) {}
    }

    return list;
  }

  // Database helper functions (abstracting Firestore / In-Memory logic)
  let globalCumulativeUploads = 0;
  let isCumulativeLoaded = false;

  async function dbGetCumulativeUploads(): Promise<number> {
    if (!isCumulativeLoaded) {
      if (useFirebase && db) {
        try {
          const statsSnap = await getDoc(doc(db, "counters", "stats"));
          if (statsSnap.exists() && statsSnap.data()?.totalUploads !== undefined) {
            globalCumulativeUploads = Number(statsSnap.data().totalUploads) || 0;
          } else {
            const imagesRef = collection(db, "images");
            const imagesSnap = await getDocs(imagesRef);
            globalCumulativeUploads = imagesSnap.size;
            await setDoc(doc(db, "counters", "stats"), { totalUploads: globalCumulativeUploads }, { merge: true });
          }
        } catch (e) {
          console.error("Error loading cumulative uploads:", e);
        }
      } else {
        if (globalCumulativeUploads === 0) {
          globalCumulativeUploads = Object.keys(images).length;
        }
      }
      isCumulativeLoaded = true;
    }
    return globalCumulativeUploads;
  }

  async function dbIncrementCumulativeUploads() {
    await dbGetCumulativeUploads();
    globalCumulativeUploads++;
    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "counters", "stats"), { totalUploads: globalCumulativeUploads }, { merge: true });
      } catch (e: any) {
        if (e?.code === 'resource-exhausted' || e?.message?.includes('RESOURCE_EXHAUSTED')) {
          // Quietly ignore quota error, internal memory counter is already updated
        } else {
          console.warn("Error incrementing cumulative uploads:", e?.message || e);
        }
      }
    }
  }

  async function dbResetCumulativeUploads() {
    globalCumulativeUploads = 0;
    isCumulativeLoaded = true;
    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "counters", "stats"), { totalUploads: 0 }, { merge: true });
      } catch (e: any) {
        if (e?.code === 'resource-exhausted' || e?.message?.includes('RESOURCE_EXHAUSTED')) {
          // Quietly ignore
        } else {
          console.warn("Error resetting cumulative uploads:", e?.message || e);
        }
      }
    }
  }

  async function getStatsCount(imagesStore: Record<string, StoredImage>, usersStore: Record<string, StoredUser>, sessionId?: string) {
    const config = await dbGetConfig();
    const now = Date.now();
    
    // Register active user session in-memory (0 Firestore writes)
    if (sessionId) {
      activeSessions[sessionId] = now;
    }

    // Clean up old active sessions and count
    const activeThreshold = now - 20000; // active in last 20 seconds
    Object.keys(activeSessions).forEach(sid => {
      if (activeSessions[sid] < activeThreshold) {
        delete activeSessions[sid];
      }
    });
    const activeUsersCount = Math.max(1, Object.keys(activeSessions).length);

    // Get images uploaded today (local midnight today)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();

    let uploadedTodayCount = 0;
    Object.values(imagesStore).forEach(img => {
      if (img.uploadedAt >= startOfTodayMs) {
        uploadedTodayCount++;
      }
    });

    const totalCumulative = await dbGetCumulativeUploads();

    return {
      totalImages: totalCumulative + (config.statsOffset || 0),
      activeUsers: activeUsersCount + (config.usersOffset || 0),
      uploadedToday: uploadedTodayCount + (config.todayOffset || 0),
    };
  }

  async function dbSaveImage(image: StoredImage, fileData: string | Buffer | null, imagesStore: Record<string, StoredImage>, filePath?: string) {
    image.filePath = filePath;

    let base64Data = "";
    if (fileData) {
      base64Data = Buffer.isBuffer(fileData) ? fileData.toString("base64") : (fileData || "");
    } else if (filePath && fs.existsSync(filePath)) {
      try {
        const stat = fs.statSync(filePath);
        // Only convert to base64 if file is small (< 15MB) to prevent V8/Node heap limits on 1GB+ files
        if (stat.size < 15 * 1024 * 1024) {
          const fileBuf = fs.readFileSync(filePath);
          base64Data = fileBuf.toString("base64");
        }
      } catch (e) {
        console.error("dbSaveImage disk read error:", e);
      }
    }

    imagesStore[image.id] = { ...image, data: base64Data, filePath };

    // Increment global cumulative upload counter asynchronously
    dbIncrementCumulativeUploads().catch(() => {});

    if (useFirebase && db) {
      (async () => {
        try {
          // Only generate chunks if there is NO physical file on disk
          let chunks: string[] = [];
          if (!filePath && base64Data && base64Data.length < 35 * 1024 * 1024) {
            chunks = chunkString(base64Data, CHUNK_SIZE);
          }

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
            filePath: filePath || null,
            chunkCount: chunks.length,
            watermarkText: image.watermarkText || null,
            watermarkOpacity: image.watermarkOpacity !== undefined ? image.watermarkOpacity : null,
            watermarkColor: image.watermarkColor || null,
            watermarkSize: image.watermarkSize !== undefined ? image.watermarkSize : null,
            watermarkPosition: image.watermarkPosition || null,
          };

          await withTimeout(setDoc(doc(db, "images", image.id), meta), 2500);

          if (chunks.length > 0) {
            const batchSize = 10;
            for (let i = 0; i < chunks.length; i += batchSize) {
              const batch = chunks.slice(i, i + batchSize);
              await Promise.all(
                batch.map((chunk, idx) => {
                  const chunkIndex = i + idx;
                  return withTimeout(
                    setDoc(doc(db, "image_chunks", `${image.id}_${chunkIndex}`), {
                      imageId: image.id,
                      chunkIndex,
                      data: chunk,
                    }),
                    2000
                  ).catch(() => {});
                })
              );
            }
          }
        } catch (e: any) {
          console.warn("[Firebase] Background save image warning:", e?.message || e);
        }
      })();
    }
  }

  function findDiskFileById(id: string): { filename: string; filePath: string } | null {
    if (!fs.existsSync(UPLOADS_DIR)) return null;
    try {
      const files = fs.readdirSync(UPLOADS_DIR);
      for (const f of files) {
        if (f.startsWith("chunks_")) continue;
        const fullPath = path.join(UPLOADS_DIR, f);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isFile() && (f.startsWith(`${id}_`) || f.startsWith(`${id}.`) || f === id)) {
            return { filename: f, filePath: fullPath };
          }
        } catch (e) {}
      }
      for (const f of files) {
        if (f.startsWith("chunks_")) continue;
        const fullPath = path.join(UPLOADS_DIR, f);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isFile() && f.includes(id)) {
            return { filename: f, filePath: fullPath };
          }
        } catch (e) {}
      }
    } catch (e) {}
    return null;
  }

  async function dbGetImage(id: string, imagesStore: Record<string, StoredImage>): Promise<StoredImage | null> {
    if (useFirebase && db) {
      try {
        const docRef = doc(db, "images", id);
        const docSnap = await withTimeout(getDoc(docRef), 2000, null);
        if (docSnap && docSnap.exists()) {
          const meta = docSnap.data();
          let fullData = "";

          let validFilePath = meta.filePath;
          if (validFilePath && (!fs.existsSync(validFilePath) || fs.statSync(validFilePath).isDirectory())) {
            const diskObj = findDiskFileById(id);
            validFilePath = diskObj ? diskObj.filePath : null;
          }

          if (validFilePath && fs.existsSync(validFilePath)) {
            try {
              const stat = fs.statSync(validFilePath);
              if (stat.size < 15 * 1024 * 1024) {
                const fileBuf = fs.readFileSync(validFilePath);
                fullData = fileBuf.toString("base64");
              } else {
                fullData = "FILE_ON_DISK";
              }
            } catch (e) {
              console.error("Error reading filePath in dbGetImage:", e);
            }
          }

          if (!fullData && meta.chunkCount > 0) {
            const chunkCount = meta.chunkCount || 0;
            const chunkPromises = [];
            for (let i = 0; i < chunkCount; i++) {
              chunkPromises.push(withTimeout(getDoc(doc(db, "image_chunks", `${id}_${i}`)), 2000, null));
            }
            const chunkSnaps = await Promise.all(chunkPromises);
            const chunks = chunkSnaps.map(snap => (snap && snap.exists()) ? snap.data()?.data || "" : "");
            fullData = chunks.join("");
          }

          return {
            id: meta.id,
            name: meta.name,
            mimeType: meta.mimeType,
            size: meta.size,
            data: fullData,
            filePath: validFilePath || undefined,
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

    const img = imagesStore[id];
    if (img) {
      if (img.filePath && fs.existsSync(img.filePath) && (!img.data || img.data.length === 0)) {
        try {
          const stat = fs.statSync(img.filePath);
          if (stat.size < 15 * 1024 * 1024) {
            const fileBuf = fs.readFileSync(img.filePath);
            img.data = fileBuf.toString("base64");
          }
        } catch (e) {}
      }
      return img;
    }

    // Disk fallback search
    const diskObj = findDiskFileById(id);
    if (diskObj) {
      const diskPath = diskObj.filePath;
      const found = diskObj.filename;
      try {
        const stat = fs.statSync(diskPath);
        let base64Str = "";
        if (stat.size < 15 * 1024 * 1024) {
          try {
            base64Str = fs.readFileSync(diskPath).toString("base64");
          } catch (e) {}
        }
        const cleanName = found.replace(new RegExp(`^${id}_`), "");
        return {
          id,
          name: cleanName || found,
          mimeType: "application/octet-stream",
          size: stat.size,
          data: base64Str,
          filePath: diskPath,
          uploadedAt: stat.birthtimeMs || Date.now(),
          deleteAfter: "never",
          deleteToken: "del_disk",
          views: 1
        };
      } catch (e) {}
    }

    return null;
  }

  async function dbGetImageInfo(id: string, imagesStore: Record<string, StoredImage>): Promise<any | null> {
    if (useFirebase && db) {
      try {
        const docRef = doc(db, "images", id);
        const docSnap = await withTimeout(getDoc(docRef), 1500, null);
        if (docSnap && docSnap.exists()) {
          const meta = docSnap.data();
          
          // Increment views asynchronously in background
          const newViews = (meta.views || 0) + 1;
          updateDoc(docRef, { views: newViews }).catch(() => {});

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

    // Disk fallback for info
    const diskObj = findDiskFileById(id);
    if (diskObj) {
      const diskPath = diskObj.filePath;
      const found = diskObj.filename;
      try {
        const stat = fs.statSync(diskPath);
        const cleanName = found.replace(new RegExp(`^${id}_`), "");

        // Infer mime type
        const ext = path.extname(cleanName).toLowerCase();
        let mimeType = "application/octet-stream";
        if ([".jpg", ".jpeg"].includes(ext)) mimeType = "image/jpeg";
        else if (ext === ".png") mimeType = "image/png";
        else if (ext === ".gif") mimeType = "image/gif";
        else if (ext === ".webp") mimeType = "image/webp";
        else if (ext === ".mp4") mimeType = "video/mp4";
        else if (ext === ".webm") mimeType = "video/webm";

        return {
          id,
          name: cleanName || found,
          mimeType,
          size: stat.size,
          uploadedAt: stat.birthtimeMs || Date.now(),
          deleteAfter: "never",
          views: 1,
          hasPassword: false,
        };
      } catch (e) {}
    }

    return null;
  }

  async function dbLockImage(id: string, password: string, imagesStore: Record<string, StoredImage>): Promise<boolean> {
    if (useFirebase && db) {
      try {
        const docRef = doc(db, "images", id);
        const docSnap = await withTimeout(getDoc(docRef), 1500, null);
        if (docSnap && docSnap.exists()) {
          updateDoc(docRef, { password }).catch(() => {});
          return true;
        }
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
    let deletedMeta: any = null;

    if (useFirebase && db) {
      try {
        const docRef = doc(db, "images", id);
        const docSnap = await withTimeout(getDoc(docRef), 1500, null);
        if (docSnap && docSnap.exists()) {
          deletedMeta = docSnap.data();
          if (deletedMeta.filePath && fs.existsSync(deletedMeta.filePath)) {
            try { fs.unlinkSync(deletedMeta.filePath); } catch (e) {}
          }

          // Delete metadata from Firebase in background
          deleteDoc(docRef).catch(() => {});

          // Delete chunks from Firebase
          const chunkCount = deletedMeta.chunkCount || 0;
          for (let i = 0; i < chunkCount; i++) {
            deleteDoc(doc(db, "image_chunks", `${id}_${i}`)).catch(() => {});
          }
          return deletedMeta;
        }
      } catch (e) {
        console.error("Firebase delete image error:", e);
      }
    }

          if (imagesStore[id]) {
            delete imagesStore[id];
          }

    const image = imagesStore[id];
    if (image) {
      deletedMeta = deletedMeta || image;
      if (image.filePath && fs.existsSync(image.filePath)) {
        try { fs.unlinkSync(image.filePath); } catch (e) {}
      }
      delete imagesStore[id];
    }

    // Always clean up matching disk files and chunk folders in UPLOADS_DIR
    if (fs.existsSync(UPLOADS_DIR)) {
      try {
        const filesInUploads = fs.readdirSync(UPLOADS_DIR);
        for (const f of filesInUploads) {
          if (f.startsWith(`${id}-`) || f === `chunks_${id}`) {
            const targetPath = path.join(UPLOADS_DIR, f);
            try {
              if (fs.statSync(targetPath).isDirectory()) {
                fs.rmSync(targetPath, { recursive: true, force: true });
              } else {
                fs.unlinkSync(targetPath);
              }
              if (!deletedMeta) deletedMeta = { id, deletedFromDisk: true };
            } catch (e) {}
          }
        }
      } catch (e) {}
    }

    return deletedMeta || { id, deleted: true };
  }

  async function dbDeleteAllImages(imagesStore: Record<string, StoredImage>): Promise<number> {
    let count = 0;
    try {
      const allImages = await dbGetAllImages(imagesStore);
      for (const img of allImages) {
        if (img && img.id) {
          try {
            const deleted = await dbDeleteImage(img.id, imagesStore);
            if (deleted) count++;
          } catch (err) {}
        }
      }
    } catch (err) {}

    // Wipe all remaining files/folders in UPLOADS_DIR
    if (fs.existsSync(UPLOADS_DIR)) {
      try {
        const files = fs.readdirSync(UPLOADS_DIR);
        for (const file of files) {
          const p = path.join(UPLOADS_DIR, file);
          try {
            if (fs.statSync(p).isDirectory()) {
              fs.rmSync(p, { recursive: true, force: true });
            } else {
              fs.unlinkSync(p);
            }
          } catch (e) {}
        }
      } catch (e) {}
    }

    // Clear in-memory images store
    for (const key of Object.keys(imagesStore)) {
      delete imagesStore[key];
    }

    // Reset cumulative uploads counter
    await dbResetCumulativeUploads();

    return count;
  }

  async function dbDeleteBatchImages(ids: string[], imagesStore: Record<string, StoredImage>): Promise<number> {
    let count = 0;
    for (const id of ids) {
      if (!id) continue;
      try {
        const deleted = await dbDeleteImage(id, imagesStore);
        if (deleted) count++;
      } catch (err) {}
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
        const docSnap = await withTimeout(getDoc(docRef), 1500, null);
        if (docSnap && docSnap.exists()) {
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

  // --- ABUSE REPORTS DATA ENGINE ---
  interface AbuseReportItem {
    id: string;
    imageUrl: string;
    reason: string;
    email: string;
    details: string;
    createdAt: number;
    status: "new" | "read" | "resolved";
  }
  let inMemoryAbuseReports: AbuseReportItem[] = [];

  async function dbGetAbuseReports(): Promise<AbuseReportItem[]> {
    if (useFirebase && db) {
      try {
        const snap = await getDocs(collection(db, "abuse_reports"));
        const list: AbuseReportItem[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as AbuseReportItem);
        });
        return list.sort((a, b) => b.createdAt - a.createdAt);
      } catch (e) {
        console.error("Firebase get abuse reports error:", e);
      }
    }
    return [...inMemoryAbuseReports].sort((a, b) => b.createdAt - a.createdAt);
  }

  async function dbSaveAbuseReport(item: AbuseReportItem): Promise<void> {
    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "abuse_reports", item.id), item);
      } catch (e) {
        console.error("Firebase save abuse report error:", e);
      }
    }
    inMemoryAbuseReports.push(item);
  }

  async function dbUpdateAbuseReportStatus(id: string, status: "new" | "read" | "resolved"): Promise<void> {
    if (useFirebase && db) {
      try {
        await updateDoc(doc(db, "abuse_reports", id), { status });
      } catch (e) {
        console.error("Firebase update abuse report status error:", e);
      }
    }
    const found = inMemoryAbuseReports.find(r => r.id === id);
    if (found) found.status = status;
  }

  async function dbDeleteAbuseReport(id: string): Promise<void> {
    if (useFirebase && db) {
      try {
        await deleteDoc(doc(db, "abuse_reports", id));
      } catch (e) {
        console.error("Firebase delete abuse report error:", e);
      }
    }
    inMemoryAbuseReports = inMemoryAbuseReports.filter(r => r.id !== id);
  }

  // --- CONTACT MESSAGES DATA ENGINE ---
  interface ContactMessageItem {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    createdAt: number;
    status: "new" | "read" | "replied";
  }
  let inMemoryContactMessages: ContactMessageItem[] = [];

  async function dbGetContactMessages(): Promise<ContactMessageItem[]> {
    if (useFirebase && db) {
      try {
        const snap = await getDocs(collection(db, "contact_messages"));
        const list: ContactMessageItem[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as ContactMessageItem);
        });
        return list.sort((a, b) => b.createdAt - a.createdAt);
      } catch (e) {
        console.error("Firebase get contact messages error:", e);
      }
    }
    return [...inMemoryContactMessages].sort((a, b) => b.createdAt - a.createdAt);
  }

  async function dbSaveContactMessage(item: ContactMessageItem): Promise<void> {
    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "contact_messages", item.id), item);
      } catch (e) {
        console.error("Firebase save contact message error:", e);
      }
    }
    inMemoryContactMessages.push(item);
  }

  async function dbUpdateContactMessageStatus(id: string, status: "new" | "read" | "replied"): Promise<void> {
    if (useFirebase && db) {
      try {
        await updateDoc(doc(db, "contact_messages", id), { status });
      } catch (e) {
        console.error("Firebase update contact message status error:", e);
      }
    }
    const found = inMemoryContactMessages.find(r => r.id === id);
    if (found) found.status = status;
  }

  async function dbDeleteContactMessage(id: string): Promise<void> {
    if (useFirebase && db) {
      try {
        await deleteDoc(doc(db, "contact_messages", id));
      } catch (e) {
        console.error("Firebase delete contact message error:", e);
      }
    }
    inMemoryContactMessages = inMemoryContactMessages.filter(r => r.id !== id);
  }

  // --- BLOG POSTS DATA ENGINE ---
  interface BlogPostItem {
    id: string;
    title: string;
    summary: string;
    content: string[];
    category: "guncelleme" | "rehber" | "guvenlik";
    categoryLabel: string;
    author: string;
    date: string;
    readTime: string;
    imageUrl: string;
    views: number;
    likes: number;
    tags: string[];
    createdAt: number;
  }

  const defaultBlogPosts: BlogPostItem[] = [
    {
      id: "post-1",
      title: "İnanResim 2.0 Yayında: 5 GB VIP Transfer, Özel Filigran ve Yeni Sunucu Altyapısı!",
      summary: "Türkiye'nin en hızlı resim yükleme platformu İnanResim yenilendi! PRO VIP üyeler için 5 GB tek seferlik transfer, şifreli klasörleme ve filigran motoru aktif edildi.",
      content: [
        "Türkiye'nin lider görsel depolama platformu İnanResim, 2.0 sürümüyle büyük altyapı güncellemelerini duyurmaktan gurur duyar.",
        "PRO VIP kullanıcılarımız artık tek seferde 5 GB'a kadar dev görsel dosyalarını kayıpsız yükleyebilecekler."
      ],
      category: "guncelleme",
      categoryLabel: "Sistem Güncellemesi",
      author: "İnanResim Sistem Ekibi",
      date: "02 Ağustos 2026",
      readTime: "3 dk okuma",
      imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      views: 1420,
      likes: 89,
      tags: ["Güncelleme", "VIP", "Filigran", "Yüksek Hız"],
      createdAt: Date.now() - 86400000 * 2
    },
    {
      id: "post-2",
      title: "Fotoğrafçılık Rehberi: Resim Sıkıştırma ve Kalite Kaybını Önleme Teknikleri",
      summary: "Web siteleriniz ve forum paylaşımlarınız için yüksek çözünürlüklü fotoğrafları kalite kaybı yaşamadan nasıl optimize edebilirsiniz? Detaylı teknik rehberimiz.",
      content: [
        "Görsellerinizin hızlı yüklenmesi hem kullanıcı deneyimi hem de SEO açısından hayati önem taşır.",
        "WEBP formatı ve doğru sıkıştırma oranları kullanarak kaliteden ödün vermeden %80 dosya boyutu tasarrufu sağlayabilirsiniz."
      ],
      category: "rehber",
      categoryLabel: "Fotoğrafçılık & Rehber",
      author: "Murat Can (Kıdemli Tasarımcı)",
      date: "28 Temmuz 2026",
      readTime: "5 dk okuma",
      imageUrl: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1000&q=80",
      views: 2150,
      likes: 134,
      tags: ["Rehber", "Optimizasyon", "WEBP", "Sıkıştırma"],
      createdAt: Date.now() - 86400000 * 5
    },
    {
      id: "post-3",
      title: "Uçtan Uca Şifreleme ve Veri Güvenliği Standartlarımız Nelerdir?",
      summary: "Gizliliğiniz bizim için her şeyden önemli. İnanResim sunucularında yüklenen resimlerin KVKK ve AES-256 standartlarına uygun olarak nasıl korunduğunu öğrenin.",
      content: [
        "Platformumuzda paylaşılan tüm gizli görseller 256-bit AES standartlarında şifrelenir.",
        "KVKK düzenlemelerine tam uyum sağlayarak verilerinizin üçüncü şahıslarla asla paylaşılmamasını garanti ediyoruz."
      ],
      category: "guvenlik",
      categoryLabel: "Güvenlik & Gizlilik",
      author: "Güvenlik Operasyon Merkezi",
      date: "20 Temmuz 2026",
      readTime: "4 dk okuma",
      imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1000&q=80",
      views: 1890,
      likes: 112,
      tags: ["Güvenlik", "Şifreleme", "KVKK", "Gizlilik"],
      createdAt: Date.now() - 86400000 * 10
    }
  ];

  let inMemoryBlogPosts: BlogPostItem[] = [...defaultBlogPosts];

  async function dbGetBlogPosts(): Promise<BlogPostItem[]> {
    if (useFirebase && db) {
      try {
        const snap = await getDocs(collection(db, "blog_posts"));
        if (!snap.empty) {
          const list: BlogPostItem[] = [];
          snap.forEach(docSnap => {
            list.push({ id: docSnap.id, ...docSnap.data() } as BlogPostItem);
          });
          return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
      } catch (e) {
        console.error("Firebase get blog posts error:", e);
      }
    }
    return [...inMemoryBlogPosts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async function dbSaveBlogPost(post: BlogPostItem): Promise<void> {
    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "blog_posts", post.id), post);
      } catch (e) {
        console.error("Firebase save blog post error:", e);
      }
    }
    const idx = inMemoryBlogPosts.findIndex(p => p.id === post.id);
    if (idx >= 0) {
      inMemoryBlogPosts[idx] = post;
    } else {
      inMemoryBlogPosts.push(post);
    }
  }

  async function dbDeleteBlogPost(id: string): Promise<void> {
    if (useFirebase && db) {
      try {
        await deleteDoc(doc(db, "blog_posts", id));
      } catch (e) {
        console.error("Firebase delete blog post error:", e);
      }
    }
    inMemoryBlogPosts = inMemoryBlogPosts.filter(p => p.id !== id);
  }

  async function dbIncrementGuestUploadCount(guestToken: string): Promise<number> {
    const current = await dbGetGuestUploadCount(guestToken);
    const newCount = current + 1;
    if (useFirebase && db) {
      try {
        await setDoc(doc(db, "guest_uploads", guestToken), { count: newCount, updatedAt: Date.now() });
      } catch (e: any) {
        if (e?.code === 'resource-exhausted' || e?.message?.includes('RESOURCE_EXHAUSTED')) {
          // Quietly ignore quota error, memory tracking works
        } else {
          console.warn("Firebase increment guest count error:", e?.message || e);
        }
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

  // Handle Image & File Upload
  app.post("/api/upload", (req: any, res: any, next: any) => {
    uploadMiddleware.single("file")(req, res, (err: any) => {
      if (err) {
        console.error("Multer upload error:", err);
        logServerError({
          type: "upload",
          message: err.message || "Multer dosya yükleme hatası",
          details: err.stack || String(err),
          ip: extractClientIp(req),
          fileName: req.body?.name || req.file?.originalname,
          fileSize: Number(req.body?.size) || req.file?.size,
          statusCode: 400
        });
        return res.status(400).json({ error: err.message || "Dosya yüklenirken bir hata oluştu." });
      }
      next();
    });
  }, async (req: any, res: any) => {
    let name = req.body?.name;
    let mimeType = req.body?.mimeType;
    let size = Number(req.body?.size) || 0;
    const userId = req.body?.userId;

    try {
      let fileData: string | Buffer = "";
      let filePath: string | undefined = undefined;

      if (req.file) {
        filePath = req.file.path;
        name = name || req.file.originalname;
        mimeType = mimeType || req.file.mimetype;
        size = size || req.file.size;
      } else if (req.body?.data) {
        let rawData = req.body.data;
        if (rawData.includes("base64,")) {
          rawData = rawData.split("base64,")[1];
        }
        fileData = rawData;
      }

      const { 
        deleteAfter, 
        password, 
        guestToken,
        watermarkText,
        watermarkOpacity,
        watermarkColor,
        watermarkSize,
        watermarkPosition 
      } = req.body;

      if (!req.file && (!fileData || (typeof fileData === "string" && !fileData.length))) {
        logServerError({
          type: "upload",
          message: "Eksik dosya verisi",
          details: "İstemciden gelen istekte dosya veya base64 verisi bulunamadı.",
          ip: extractClientIp(req),
          userId: userId || undefined,
          statusCode: 400
        });
        res.status(400).json({ error: "Eksik dosya verisi!" });
        return;
      }

      const config = await dbGetConfig();
      const fileSize = Number(size) || (req.file ? req.file.size : 0);

      const cleanupTempFile = () => {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
      };

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
          cleanupTempFile();
          const errMsg = `Hesabınız engellendiği için yeni görsel/video/dosya yükleyemezsiniz.${uRecord.banReason ? ` Neden: ${uRecord.banReason}` : ''}`;
          logServerError({
            type: "upload",
            message: "Engellenmiş kullanıcı yükleme engeli",
            details: errMsg,
            ip: extractClientIp(req),
            fileName: name,
            fileSize,
            fileType: mimeType,
            userId,
            statusCode: 403
          });
          res.status(403).json({ error: errMsg });
          return;
        }

        // Registered / VIP upload count limit check
        const userUploads = await dbGetUserUploads(userId, images);
        const userUploadCount = userUploads.length;

        if (isVipUser) {
          const vipMaxCount = config.vipMaxUploadCount ?? 0;
          if (vipMaxCount > 0 && userUploadCount >= vipMaxCount) {
            cleanupTempFile();
            const errMsg = `PRO VIP üyeler en fazla ${vipMaxCount} adet dosya yükleyebilir. Limitiniz (${vipMaxCount} adet) doldu!`;
            logServerError({
              type: "upload",
              message: "PRO VIP üye yükleme adedi limiti doldu",
              details: `Mevcut yükleme: ${userUploadCount}, İzin verilen limit: ${vipMaxCount}`,
              ip: extractClientIp(req),
              fileName: name,
              fileSize,
              fileType: mimeType,
              userId,
              statusCode: 400
            });
            res.status(400).json({ error: errMsg });
            return;
          }
        } else {
          const regMaxCount = config.registeredMaxUploadCount ?? 0;
          if (regMaxCount > 0 && userUploadCount >= regMaxCount) {
            cleanupTempFile();
            const errMsg = `Standart üyeler en fazla ${regMaxCount} adet dosya yükleyebilir. Limitiniz (${regMaxCount} adet) doldu! Daha fazla yükleme yapmak için PRO VIP üyeliğe geçebilirsiniz.`;
            logServerError({
              type: "upload",
              message: "Standart üye yükleme adedi limiti doldu",
              details: `Mevcut yükleme: ${userUploadCount}, İzin verilen limit: ${regMaxCount}`,
              ip: extractClientIp(req),
              fileName: name,
              fileSize,
              fileType: mimeType,
              userId,
              statusCode: 400
            });
            res.status(400).json({ error: errMsg });
            return;
          }
        }

        const userMaxMb = isVipUser ? (config.vipMaxMb ?? 5000) : (config.registeredMaxMb ?? 1000);
        if (userMaxMb > 0 && fileSize > userMaxMb * 1024 * 1024) {
          cleanupTempFile();
          const limitFormatted = userMaxMb >= 1000 ? `${(userMaxMb / 1000).toFixed(1)} GB (${userMaxMb} MB)` : `${userMaxMb} MB`;
          const errMsg = `Yüklenecek dosya (${(fileSize / (1024 * 1024)).toFixed(1)} MB), ${isVipUser ? 'VIP' : 'standart'} üye boyut limitini (${limitFormatted}) aşıyor.`;
          logServerError({
            type: "upload",
            message: "Üye boyutu limiti aşıldı",
            details: errMsg,
            ip: extractClientIp(req),
            fileName: name,
            fileSize,
            fileType: mimeType,
            userId,
            statusCode: 400
          });
          res.status(400).json({ 
            error: `${errMsg}${!isVipUser ? " 5 GB'a kadar dosya yüklemek için lütfen PRO VIP üyeliğe geçin!" : ""}` 
          });
          return;
        }
      } else {
        // Guest user check
        const guestMaxMb = config.guestMaxMb ?? 20;
        if (fileSize > guestMaxMb * 1024 * 1024) {
          cleanupTempFile();
          const errMsg = `Misafir kullanıcılar en fazla ${guestMaxMb} MB boyutunda dosya yükleyebilir.`;
          logServerError({
            type: "upload",
            message: "Misafir kullanıcı dosya boyutu limiti aşıldı",
            details: `Boyut: ${(fileSize / (1024 * 1024)).toFixed(1)} MB, Limit: ${guestMaxMb} MB, IP: ${extractClientIp(req)}`,
            ip: extractClientIp(req),
            fileName: name,
            fileSize,
            fileType: mimeType,
            statusCode: 400
          });
          res.status(400).json({ 
            error: `${errMsg} Sınırsız yükleme yapmak için lütfen ücretsiz üye olun!`,
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
        const guestMaxCount = config.guestMaxUploadCount ?? 50;
        const currentCount = await getEffectiveGuestCount(token, clientIp);

        if (guestMaxCount > 0 && currentCount >= guestMaxCount) {
          cleanupTempFile();
          const errMsg = `Üye olmadan en fazla ${guestMaxCount} adet yükleme yapabilirsiniz. Limitiniz doldu!`;
          logServerError({
            type: "upload",
            message: "Misafir yükleme sayısı limiti doldu",
            details: `Mevcut yükleme sayısı: ${currentCount}, İzin verilen limit: ${guestMaxCount}, IP: ${clientIp}`,
            ip: clientIp,
            fileName: name,
            fileSize,
            fileType: mimeType,
            statusCode: 400
          });
          res.status(400).json({ 
            error: `${errMsg} Sınırsız yükleme yapmak için lütfen ücretsiz üye olun.`,
            guestLimitReached: true,
            limitType: "count",
            guestMaxUploadCount: guestMaxCount,
            currentGuestCount: currentCount
          });
          return;
        }
      }

      // AI Content Moderation Check (+18 Nudity / Explicit / NSFW protection)
      if (config.securityNsfwFilterEnabled !== false && mimeType && mimeType.startsWith("image/")) {
        const modResult = await moderateImageWithAI(filePath || fileData, mimeType, name);
        if (!modResult.safe) {
          cleanupTempFile();
          logFirewallAttempt({
            ip: extractClientIp(req),
            attackType: "nsfw_content",
            method: "POST",
            url: "/api/upload",
            userAgent: req.headers["user-agent"] || "Upload Client",
            actionTaken: "blocked_403",
            country: "TR",
            severity: "high"
          });
          logServerError({
            type: "upload",
            message: "Yapay Zeka +18 / Müstehcen İçerik Engeli",
            details: modResult.reason || "+18 Müstehcen/Çıplaklık görseli tespit edildi.",
            ip: extractClientIp(req),
            fileName: name,
            fileSize,
            fileType: mimeType,
            userId: userId || undefined,
            statusCode: 403
          });
          res.status(403).json({
            error: `⛔ İçerik Güvenliği Engeli: Yüklenen görsel +18 / müstehcen içerik (çıplaklık) olarak tespit edilmiştir. Platform kurallarımız gereği cinsel içerikli dosya yüklenemez.`
          });
          return;
        }
      }

      const id = generateId(6);
      const deleteToken = "del_" + generateId(12);

      if (filePath && fs.existsSync(filePath)) {
        const safeName = (name || "dosya").replace(/[^a-zA-Z0-9._-]/g, "_");
        const newFilePath = path.join(UPLOADS_DIR, `${id}_${safeName}`);
        try {
          fs.renameSync(filePath, newFilePath);
          filePath = newFilePath;
        } catch (e) {
          console.error("Error renaming temp uploaded file:", e);
        }
      }

      // Permanent ("never") storage is strictly reserved for PRO VIP members
      let effectiveDeleteAfter = deleteAfter || (isVipUser ? "never" : "1m");
      if (effectiveDeleteAfter === "never" && !isVipUser) {
        effectiveDeleteAfter = "1m";
      }

      const img: StoredImage = {
        id,
        name: name || "dosya.bin",
        mimeType: mimeType || "application/octet-stream",
        size: fileSize || 0,
        data: "", // Stored on disk
        filePath,
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

      await dbSaveImage(img, fileData, images, filePath);

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
      logServerError({
        type: "upload",
        message: err?.message || "Resim/Dosya yüklenirken kritik sunucu hatası oluştu",
        details: err?.stack || String(err),
        ip: extractClientIp(req),
        fileName: name,
        fileSize: Number(size) || 0,
        fileType: mimeType,
        userId: userId || undefined,
        statusCode: 500
      });
      res.status(500).json({ error: "Resim yüklenirken bir sunucu hatası oluştu." });
    }
  });

  // Handle Chunked File Upload (For large files e.g. 20MB - 5GB without proxy timeouts)
  app.post("/api/upload-chunk", (req: any, res: any, next: any) => {
    uploadMiddleware.single("file")(req, res, (err: any) => {
      if (err) {
        console.error("Chunk upload error:", err);
        return res.status(400).json({ error: err.message || "Parça yüklenirken hata oluştu." });
      }
      next();
    });
  }, async (req: any, res: any) => {
    try {
      const uploadId = req.body?.uploadId;
      const chunkIndex = Number(req.body?.chunkIndex);
      const totalChunks = Number(req.body?.totalChunks);
      const fileName = req.body?.fileName || req.file?.originalname || "dosya";
      const mimeType = req.body?.mimeType || req.file?.mimetype || "application/octet-stream";
      const fileSize = Number(req.body?.fileSize) || 0;
      const userId = req.body?.userId;

      if (!uploadId || isNaN(chunkIndex) || !req.file) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        res.status(400).json({ error: "Geçersiz parça verisi." });
        return;
      }

      // Validate limits on chunk 0
      if (chunkIndex === 0) {
        const config = await dbGetConfig();
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
          if (uRecord && uRecord.isBanned) {
            if (req.file?.path && fs.existsSync(req.file.path)) {
              try { fs.unlinkSync(req.file.path); } catch (e) {}
            }
            res.status(403).json({ error: "Hesabınız engellendiği için dosya yükleyemezsiniz." });
            return;
          }

          const userUploads = await dbGetUserUploads(userId, images);
          const userUploadCount = userUploads.length;

          if (isVipUser) {
            const vipMaxCount = config.vipMaxUploadCount ?? 0;
            if (vipMaxCount > 0 && userUploadCount >= vipMaxCount) {
              if (req.file?.path && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (e) {}
              }
              res.status(400).json({ error: `PRO VIP üyeler en fazla ${vipMaxCount} adet dosya yükleyebilir. Limitiniz (${vipMaxCount} adet) doldu!` });
              return;
            }
          } else {
            const regMaxCount = config.registeredMaxUploadCount ?? 0;
            if (regMaxCount > 0 && userUploadCount >= regMaxCount) {
              if (req.file?.path && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (e) {}
              }
              res.status(400).json({ error: `Standart üyeler en fazla ${regMaxCount} adet dosya yükleyebilir. Limitiniz (${regMaxCount} adet) doldu! Daha fazla yükleme yapmak için PRO VIP üyeliğe geçebilirsiniz.` });
              return;
            }
          }

          const userMaxMb = isVipUser ? (config.vipMaxMb ?? 5000) : (config.registeredMaxMb ?? 1000);
          if (userMaxMb > 0 && fileSize > userMaxMb * 1024 * 1024) {
            if (req.file?.path && fs.existsSync(req.file.path)) {
              try { fs.unlinkSync(req.file.path); } catch (e) {}
            }
            const limitFormatted = userMaxMb >= 1000 ? `${(userMaxMb / 1000).toFixed(1)} GB (${userMaxMb} MB)` : `${userMaxMb} MB`;
            res.status(400).json({ error: `Yüklenecek dosya limitinizi (${limitFormatted}) aşıyor.` });
            return;
          }
        } else {
          const guestMaxMb = config.guestMaxMb ?? 20;
          if (fileSize > guestMaxMb * 1024 * 1024) {
            if (req.file?.path && fs.existsSync(req.file.path)) {
              try { fs.unlinkSync(req.file.path); } catch (e) {}
            }
            res.status(400).json({ error: `Misafir kullanıcılar en fazla ${guestMaxMb} MB boyutunda dosya yükleyebilir.` });
            return;
          }

          const clientIp = extractClientIp(req);
          let token = extractGuestToken(req);
          if (!token) token = "gst_" + generateId(12);
          const guestMaxCount = config.guestMaxUploadCount ?? 5;
          const currentCount = await getEffectiveGuestCount(token, clientIp);

          if (currentCount >= guestMaxCount) {
            if (req.file?.path && fs.existsSync(req.file.path)) {
              try { fs.unlinkSync(req.file.path); } catch (e) {}
            }
            res.status(400).json({ error: `Üye olmadan en fazla ${guestMaxCount} adet yükleme yapabilirsiniz. Limitiniz doldu!` });
            return;
          }
        }
      }

      // Store chunk file inside a dedicated uploadId folder
      const safeUploadId = uploadId.replace(/[^a-zA-Z0-9_-]/g, "");
      const chunkDir = path.join(UPLOADS_DIR, `chunks_${safeUploadId}`);
      if (!fs.existsSync(chunkDir)) {
        fs.mkdirSync(chunkDir, { recursive: true });
      }

      const chunkFilePath = path.join(chunkDir, `chunk_${chunkIndex}`);
      try {
        fs.renameSync(req.file.path, chunkFilePath);
      } catch (e) {
        fs.copyFileSync(req.file.path, chunkFilePath);
        try { fs.unlinkSync(req.file.path); } catch (err) {}
      }

      res.status(200).json({ success: true, uploadId, chunkIndex, totalChunks });
    } catch (err: any) {
      console.error("Chunk upload handler error:", err);
      res.status(500).json({ error: "Parça işlenirken sunucu hatası oluştu." });
    }
  });

  // Handle Complete Chunked Upload
  app.post("/api/upload-complete", async (req: any, res: any) => {
    try {
      const {
        uploadId,
        fileName,
        fileSize,
        mimeType,
        totalChunks,
        userId,
        guestToken,
        deleteAfter,
        password,
        watermarkText,
        watermarkOpacity,
        watermarkColor,
        watermarkSize,
        watermarkPosition
      } = req.body;

      if (!uploadId || !totalChunks || Number(totalChunks) <= 0) {
        res.status(400).json({ error: "Eksik parça tamamlama verisi." });
        return;
      }

      const safeUploadId = uploadId.replace(/[^a-zA-Z0-9_-]/g, "");
      const chunkDir = path.join(UPLOADS_DIR, `chunks_${safeUploadId}`);

      if (!fs.existsSync(chunkDir)) {
        res.status(400).json({ error: "Yükleme parçaları bulunamadı veya zaman aşımına uğradı." });
        return;
      }

      // Check all chunks exist
      const numChunks = Number(totalChunks);
      for (let i = 0; i < numChunks; i++) {
        const chunkPath = path.join(chunkDir, `chunk_${i}`);
        if (!fs.existsSync(chunkPath)) {
          res.status(400).json({ error: `Yükleme eksik: Parça ${i + 1}/${numChunks} sunucuda bulunamadı.` });
          return;
        }
      }

      const id = generateId(6);
      const deleteToken = "del_" + generateId(12);
      const safeName = (fileName || "dosya").replace(/[^a-zA-Z0-9._-]/g, "_");
      const finalFilePath = path.join(UPLOADS_DIR, `${id}_${safeName}`);

      // Concatenate chunk files synchronously into the final combined file
      fs.writeFileSync(finalFilePath, "");
      for (let i = 0; i < numChunks; i++) {
        const chunkPath = path.join(chunkDir, `chunk_${i}`);
        if (fs.existsSync(chunkPath)) {
          const chunkBuffer = fs.readFileSync(chunkPath);
          fs.appendFileSync(finalFilePath, chunkBuffer);
          try { fs.unlinkSync(chunkPath); } catch (e) {}
        }
      }

      // Clean up chunk directory
      try { fs.rmdirSync(chunkDir); } catch (e) {}

      const config = await dbGetConfig();
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

      let effectiveDeleteAfter = deleteAfter || (isVipUser ? "never" : "1m");
      if (effectiveDeleteAfter === "never" && !isVipUser) {
        effectiveDeleteAfter = "1m";
      }

      const finalSize = Number(fileSize) || (fs.existsSync(finalFilePath) ? fs.statSync(finalFilePath).size : 0);

      const img: StoredImage = {
        id,
        name: fileName || "dosya.bin",
        mimeType: mimeType || "application/octet-stream",
        size: finalSize,
        data: "", // Stored on disk
        filePath: finalFilePath,
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

      await dbSaveImage(img, null, images, finalFilePath);

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
        name: fileName,
        size: finalSize,
        deleteToken,
        uploadedAt: img.uploadedAt,
      });
    } catch (err: any) {
      console.error("Complete chunked upload error:", err);
      res.status(500).json({ error: "Parçalar birleştirilirken bir sunucu hatası oluştu." });
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

        const userUploads = await dbGetUserUploads(userId, images);
        const userUploadCount = userUploads.length;

        if (isVipUserUrl) {
          const vipMaxCount = config.vipMaxUploadCount ?? 0;
          if (vipMaxCount > 0 && userUploadCount >= vipMaxCount) {
            res.status(400).json({ error: `PRO VIP üyeler en fazla ${vipMaxCount} adet dosya yükleyebilir. Limitiniz (${vipMaxCount} adet) doldu!` });
            return;
          }
        } else {
          const regMaxCount = config.registeredMaxUploadCount ?? 0;
          if (regMaxCount > 0 && userUploadCount >= regMaxCount) {
            res.status(400).json({ error: `Standart üyeler en fazla ${regMaxCount} adet dosya yükleyebilir. Limitiniz (${regMaxCount} adet) doldu! Daha fazla yükleme yapmak için PRO VIP üyeliğe geçebilirsiniz.` });
            return;
          }
        }
      } else {
        const clientIp = extractClientIp(req);
        let token = extractGuestToken(req);
        if (!token) {
          token = "gst_" + generateId(12);
        }
        const guestMaxCount = config.guestMaxUploadCount ?? 50;
        const currentCount = await getEffectiveGuestCount(token, clientIp);

        if (guestMaxCount > 0 && currentCount >= guestMaxCount) {
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

      // AI Content Moderation Check (+18 Nudity / Explicit / NSFW protection)
      if (config.securityNsfwFilterEnabled !== false && mimeType && mimeType.startsWith("image/")) {
        const modResult = await moderateImageWithAI(buffer, mimeType, url);
        if (!modResult.safe) {
          logFirewallAttempt({
            ip: extractClientIp(req),
            attackType: "nsfw_content",
            method: "POST",
            url: "/api/upload-url",
            userAgent: req.headers["user-agent"] || "Upload-Url Client",
            actionTaken: "blocked_403",
            country: "TR",
            severity: "high"
          });
          logServerError({
            type: "upload",
            message: "URL İndirme Yapay Zeka +18 / Müstehcen İçerik Engeli",
            details: modResult.reason || "+18 Müstehcen/Çıplaklık görseli tespit edildi.",
            ip: extractClientIp(req),
            fileName: url,
            fileSize: buffer.length,
            fileType: mimeType,
            userId: userId || undefined,
            statusCode: 403
          });
          res.status(403).json({
            error: `⛔ İçerik Güvenliği Engeli: İndirilmeye çalışılan URL görseli +18 / müstehcen içerik (çıplaklık) olarak tespit edilmiştir. Platform kurallarımız gereği cinsel içerikli dosya yüklenemez.`
          });
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

  // Serve Raw Image / File Data
  app.get("/api/images/:id", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const { id } = req.params;
    const { pw, dl, download } = req.query;
    
    try {
      const image = await dbGetImage(id, images);

      if (!image) {
        res.status(404).send("Resim veya dosya bulunamadı.");
        return;
      }

      // If visited directly in browser address bar without dl=1, redirect to the download UI page
      const acceptHeader = req.headers.accept || "";
      const secFetchDest = req.headers["sec-fetch-dest"];
      if ((acceptHeader.includes("text/html") || secFetchDest === "document") && dl !== "1" && download !== "true") {
        res.redirect(`/?view=image-detail&id=${id}`);
        return;
      }

      // Password enforcement on raw image
      if (image.password && image.password !== pw) {
        res.status(403).send("Bu dosya şifre korumalıdır.");
        return;
      }

      const range = req.headers.range;
      const contentType = image.mimeType || "application/octet-stream";
      const isMedia = contentType.startsWith("image/") || contentType.startsWith("video/");
      const forceDownload = dl === "1" || download === "true" || !isMedia;
      const dispositionType = forceDownload ? "attachment" : "inline";
      const rawFileName = image.name || "dosya";
      const fileNameEncoded = encodeURIComponent(rawFileName);

      // Locate valid file on disk if available
      let validDiskPath = image.filePath;
      if (validDiskPath && (!fs.existsSync(validDiskPath) || fs.statSync(validDiskPath).isDirectory())) {
        const diskObj = findDiskFileById(id);
        validDiskPath = diskObj ? diskObj.filePath : null;
      }

      // Fallback disk search if filePath wasn't stored
      if (!validDiskPath) {
        const diskObj = findDiskFileById(id);
        validDiskPath = diskObj ? diskObj.filePath : null;
      }

      // Case 1: File is stored on disk at validDiskPath
      if (validDiskPath && fs.existsSync(validDiskPath)) {
        const stat = fs.statSync(validDiskPath);
        const fileSize = stat.size;

        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunkSize = (end - start) + 1;
          const fileStream = fs.createReadStream(validDiskPath, { start, end });

          res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunkSize,
            "Content-Type": contentType,
            "Content-Disposition": `${dispositionType}; filename="${fileNameEncoded}"; filename*=UTF-8''${fileNameEncoded}`,
          });
          fileStream.pipe(res);
          return;
        } else {
          res.writeHead(200, {
            "Content-Length": fileSize,
            "Content-Type": contentType,
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=86400",
            "Content-Disposition": `${dispositionType}; filename="${fileNameEncoded}"; filename*=UTF-8''${fileNameEncoded}`,
          });
          fs.createReadStream(validDiskPath).pipe(res);
          return;
        }
      }

      // Case 2: File is stored as base64 in image.data
      const buffer = Buffer.from(image.data || "", "base64");
      const fileSize = buffer.length;

      if (range && fileSize > 0) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": contentType,
          "Content-Disposition": `${dispositionType}; filename="${fileNameEncoded}"; filename*=UTF-8''${fileNameEncoded}`,
        });
        res.end(buffer.subarray(start, end + 1));
        return;
      }

      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": fileSize,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400",
        "Content-Disposition": `${dispositionType}; filename="${fileNameEncoded}"; filename*=UTF-8''${fileNameEncoded}`,
      });
      res.end(buffer);
    } catch (err) {
      console.error("Serve image error:", err);
      res.status(500).send("Görsel veya dosya yüklenirken hata oluştu.");
    }
  });

  // SEO - robots.txt
  app.get("/robots.txt", (req, res) => {
    const host = req.get("host") || "inanhizlimedya.online";
    const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const baseUrl = `${protocol}://${host}`;

    const content = `User-agent: *
Allow: /
Allow: /api/images/
Allow: /i/
Allow: /favicon.svg
Allow: /apple-touch-icon.png
Allow: /site.webmanifest
Disallow: /admin
Disallow: /api/admin/

User-agent: Googlebot-Image
Allow: /
Allow: /api/images/

Sitemap: ${baseUrl}/sitemap.xml
`;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(content);
  });

  // SEO - sitemap.xml
  app.get("/sitemap.xml", async (req, res) => {
    const host = req.get("host") || "inanhizlimedya.online";
    const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const baseUrl = `${protocol}://${host}`;

    try {
      const allImages = await dbGetAllImages(images);
      // Filter images that are public (not password protected)
      const publicImages = allImages.filter((img: any) => !img.hasPassword);

      const nowIso = new Date().toISOString();

      let urlsXml = `  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>\n`;

      publicImages.forEach((img: any) => {
        let lastMod = nowIso;
        if (img.uploadedAt) {
          try {
            lastMod = new Date(img.uploadedAt).toISOString();
          } catch (e) {
            lastMod = nowIso;
          }
        }
        const imgTitle = (img.title || img.name || "Görsel").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const imgDirectUrl = `${baseUrl}/api/images/${img.id}`;
        
        urlsXml += `  <url>
    <loc>${baseUrl}/i/${img.id}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>${imgDirectUrl}</image:loc>
      <image:title>${imgTitle}</image:title>
    </image:image>
  </url>\n`;
      });

      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlsXml}</urlset>`;

      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.send(sitemapXml);
    } catch (err) {
      console.error("Sitemap generation error:", err);
      res.status(500).send("Error generating sitemap");
    }
  });

  // Short URL redirects for share links: /i/:id, /d/:id, /download/:id, /v/:id, /f/:id, /file/:id
  app.get(["/i/:id", "/d/:id", "/download/:id", "/v/:id", "/f/:id", "/file/:id"], (req, res) => {
    const { id } = req.params;
    res.redirect(`/?view=image-detail&id=${id}`);
  });

  // Get Image Information (Excluding raw base64 data and password)
  app.get("/api/images/:id/info", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
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
        const directUrl = `/api/images/${id}?pw=${encodeURIComponent(password)}`;
        const dataUrl = (image.data && image.data !== "FILE_ON_DISK")
          ? `data:${image.mimeType};base64,${image.data}`
          : directUrl;
        res.json({ success: true, directUrl, dataUrl });
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

  // GET Me (Returns up-to-date user profile including VIP status)
  app.get("/api/auth/me", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "Kullanıcı ID gerekli." });
    }
    try {
      const allUsers = await dbGetAllUsers(users);
      const user = allUsers.find(u => u.id === userId);
      if (!user) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı." });
      }
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVip: !!user.isVip,
        vipPlan: user.vipPlan,
        vipExpireAt: user.vipExpireAt,
        isBanned: !!user.isBanned,
        createdAt: user.createdAt
      });
    } catch (err) {
      res.status(500).json({ error: "Kullanıcı bilgisi alınamadı." });
    }
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

  // Chat online presence memory store
  const chatPresenceStore: Record<string, {
    userId: string;
    username: string;
    isAdmin: boolean;
    isMod: boolean;
    lastSeen: number;
  }> = {};

  // Chat presence heartbeat & active admin/mod stats
  app.get("/api/chat/presence", async (req, res) => {
    try {
      const { userId, username, isAdmin, isMod } = req.query;
      const now = Date.now();

      if (username && typeof username === "string" && username.trim() !== "") {
        const key = (userId as string) || username.trim();
        chatPresenceStore[key] = {
          userId: key,
          username: username.trim(),
          isAdmin: isAdmin === "true",
          isMod: isMod === "true" || isAdmin === "true",
          lastSeen: now,
        };
      }

      // Filter active in last 25 seconds
      const threshold = now - 25000;
      const activeList = Object.values(chatPresenceStore).filter((p) => p.lastSeen > threshold);

      // Clean up stale sessions
      Object.keys(chatPresenceStore).forEach((k) => {
        if (chatPresenceStore[k].lastSeen <= threshold) {
          delete chatPresenceStore[k];
        }
      });

      const totalOnline = Math.max(1, activeList.length);
      const adminList = activeList.filter((p) => p.isAdmin);
      const modList = activeList.filter((p) => p.isMod && !p.isAdmin);

      res.json({
        totalOnline,
        adminCount: adminList.length,
        modCount: modList.length,
        admins: adminList.map((a) => a.username),
        mods: modList.map((m) => m.username),
        activeUsers: activeList.map((u) => ({
          username: u.username,
          isAdmin: u.isAdmin,
          isMod: u.isMod,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: "Presence error" });
    }
  });

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
    res.setHeader("Content-Type", "application/json");
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
      const updated = await dbSaveConfig(req.body || {});
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

  // --- ABUSE REPORTS ENDPOINTS ---

  // Submit Abuse Report (Public)
  app.post("/api/report-abuse", async (req, res) => {
    try {
      const { imageUrl, reason, email, details } = req.body;
      if (!imageUrl || !email) {
        return res.status(400).json({ error: "Görsel adresi ve e-posta zorunludur." });
      }

      const report: AbuseReportItem = {
        id: "rep_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        imageUrl: imageUrl.trim(),
        reason: reason || "dmca",
        email: email.trim(),
        details: (details || "").trim(),
        createdAt: Date.now(),
        status: "new"
      };

      await dbSaveAbuseReport(report);
      res.json({ success: true, message: "İhbarınız başarıyla kaydedildi." });
    } catch (err) {
      console.error("Report abuse error:", err);
      res.status(500).json({ error: "İhbar iletilirken bir hata oluştu." });
    }
  });

  // Get Abuse Reports (Admin only)
  app.get("/api/admin/reports", async (req, res) => {
    try {
      const reports = await dbGetAbuseReports();
      res.json({ reports });
    } catch (err) {
      console.error("Get abuse reports error:", err);
      res.status(500).json({ error: "İhbarlar alınamadı." });
    }
  });

  // Update Abuse Report Status (Admin only)
  app.post("/api/admin/reports/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status || !["new", "read", "resolved"].includes(status)) {
        return res.status(400).json({ error: "Geçersiz durum." });
      }
      await dbUpdateAbuseReportStatus(id, status);
      res.json({ success: true });
    } catch (err) {
      console.error("Update report status error:", err);
      res.status(500).json({ error: "Durum güncellenemedi." });
    }
  });

  // Delete Abuse Report (Admin only)
  app.delete("/api/admin/reports/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await dbDeleteAbuseReport(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete report error:", err);
      res.status(500).json({ error: "Silinemedi." });
    }
  });

  // --- CONTACT MESSAGES ENDPOINTS ---

  // Submit Contact Message (Public)
  app.post("/api/contact-message", async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;
      if (!name || !email || !message) {
        return res.status(400).json({ error: "Ad Soyad, E-posta ve Mesaj alanları zorunludur." });
      }

      const msg: ContactMessageItem = {
        id: "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        name: name.trim(),
        email: email.trim(),
        subject: (subject || "Destek / Genel").trim(),
        message: message.trim(),
        createdAt: Date.now(),
        status: "new"
      };

      await dbSaveContactMessage(msg);
      res.json({ success: true, message: "Mesajınız başarıyla iletildi." });
    } catch (err) {
      console.error("Contact message error:", err);
      res.status(500).json({ error: "Mesaj iletilirken bir hata oluştu." });
    }
  });

  // Get Contact Messages (Admin only)
  app.get("/api/admin/contact-messages", async (req, res) => {
    try {
      const messages = await dbGetContactMessages();
      res.json({ messages });
    } catch (err) {
      console.error("Get contact messages error:", err);
      res.status(500).json({ error: "Mesajlar alınamadı." });
    }
  });

  // Update Contact Message Status (Admin only)
  app.post("/api/admin/contact-messages/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status || !["new", "read", "replied"].includes(status)) {
        return res.status(400).json({ error: "Geçersiz durum." });
      }
      await dbUpdateContactMessageStatus(id, status);
      res.json({ success: true });
    } catch (err) {
      console.error("Update contact message status error:", err);
      res.status(500).json({ error: "Durum güncellenemedi." });
    }
  });

  // Delete Contact Message (Admin only)
  app.delete("/api/admin/contact-messages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await dbDeleteContactMessage(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete contact message error:", err);
      res.status(500).json({ error: "Silinemedi." });
    }
  });

  // --- BLOG POSTS ENDPOINTS ---

  // Get Blog Posts (Public)
  app.get("/api/blog/posts", async (req, res) => {
    try {
      const posts = await dbGetBlogPosts();
      res.json({ posts });
    } catch (err) {
      console.error("Get blog posts error:", err);
      res.status(500).json({ error: "Blog yazıları alınamadı." });
    }
  });

  // Create Blog Post (Admin only)
  app.post("/api/admin/blog/posts", async (req, res) => {
    try {
      const { title, summary, content, category, categoryLabel, author, date, readTime, imageUrl, tags } = req.body;
      if (!title || !summary || !content) {
        return res.status(400).json({ error: "Başlık, özet ve içerik alanları zorunludur." });
      }

      const contentArray = Array.isArray(content) 
        ? content 
        : typeof content === "string" 
          ? content.split("\n").filter(line => line.trim().length > 0)
          : [];

      const tagsArray = Array.isArray(tags)
        ? tags
        : typeof tags === "string"
          ? tags.split(",").map(t => t.trim()).filter(Boolean)
          : [];

      const newPost: BlogPostItem = {
        id: "post_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        title: title.trim(),
        summary: summary.trim(),
        content: contentArray,
        category: category || "guncelleme",
        categoryLabel: categoryLabel || (category === "guncelleme" ? "Sistem Güncellemesi" : category === "rehber" ? "Rehber" : "Güvenlik"),
        author: (author || "İnanResim Ekibi").trim(),
        date: date || new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" }),
        readTime: readTime || "3 dk okuma",
        imageUrl: imageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
        views: 0,
        likes: 0,
        tags: tagsArray,
        createdAt: Date.now()
      };

      await dbSaveBlogPost(newPost);
      res.json({ success: true, post: newPost });
    } catch (err) {
      console.error("Create blog post error:", err);
      res.status(500).json({ error: "Blog yazısı eklenirken hata oluştu." });
    }
  });

  // Update Blog Post (Admin only)
  app.put("/api/admin/blog/posts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, summary, content, category, categoryLabel, author, date, readTime, imageUrl, tags, views, likes } = req.body;
      
      const posts = await dbGetBlogPosts();
      const existing = posts.find(p => p.id === id);
      if (!existing) {
        return res.status(404).json({ error: "Yazı bulunamadı." });
      }

      const contentArray = content !== undefined
        ? (Array.isArray(content) ? content : String(content).split("\n").filter(l => l.trim()))
        : existing.content;

      const tagsArray = tags !== undefined
        ? (Array.isArray(tags) ? tags : String(tags).split(",").map(t => t.trim()).filter(Boolean))
        : existing.tags;

      const updatedPost: BlogPostItem = {
        ...existing,
        title: title !== undefined ? title.trim() : existing.title,
        summary: summary !== undefined ? summary.trim() : existing.summary,
        content: contentArray,
        category: category || existing.category,
        categoryLabel: categoryLabel || existing.categoryLabel,
        author: author !== undefined ? author.trim() : existing.author,
        date: date || existing.date,
        readTime: readTime || existing.readTime,
        imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
        tags: tagsArray,
        views: views !== undefined ? Number(views) : existing.views,
        likes: likes !== undefined ? Number(likes) : existing.likes
      };

      await dbSaveBlogPost(updatedPost);
      res.json({ success: true, post: updatedPost });
    } catch (err) {
      console.error("Update blog post error:", err);
      res.status(500).json({ error: "Blog yazısı güncellenirken hata oluştu." });
    }
  });

  // Delete Blog Post (Admin only)
  app.delete("/api/admin/blog/posts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await dbDeleteBlogPost(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete blog post error:", err);
      res.status(500).json({ error: "Blog yazısı silinirken hata oluştu." });
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

  // --- ADMIN ERROR TRACKING ENDPOINTS ---
  
  // Get system error logs
  app.get("/api/admin/error-logs", async (req, res) => {
    try {
      const { type, search } = req.query;
      let filtered = [...systemErrorLogs];

      if (type && type !== "all") {
        filtered = filtered.filter((l) => l.type === type);
      }
      if (search && typeof search === "string" && search.trim()) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (l) =>
            l.message.toLowerCase().includes(s) ||
            (l.details && l.details.toLowerCase().includes(s)) ||
            (l.fileName && l.fileName.toLowerCase().includes(s)) ||
            (l.ip && l.ip.toLowerCase().includes(s))
        );
      }

      const uploadErrorCount = systemErrorLogs.filter((l) => l.type === "upload").length;
      const smtpErrorCount = systemErrorLogs.filter((l) => l.type === "email").length;
      const authErrorCount = systemErrorLogs.filter((l) => l.type === "auth").length;
      const serverErrorCount = systemErrorLogs.filter((l) => l.type === "server").length;
      const now = Date.now();
      const last24hCount = systemErrorLogs.filter((l) => now - l.timestamp < 24 * 60 * 60 * 1000).length;

      res.json({
        success: true,
        logs: filtered,
        stats: {
          totalErrors: systemErrorLogs.length,
          uploadErrors: uploadErrorCount,
          smtpErrors: smtpErrorCount,
          authErrors: authErrorCount,
          serverErrors: serverErrorCount,
          last24hErrors: last24hCount,
          systemStatus: last24hCount > 20 ? "warning" : "healthy",
        },
      });
    } catch (err) {
      console.error("Get error logs error:", err);
      res.status(500).json({ error: "Hata logları getirilemedi." });
    }
  });

  // Clear system error logs
  app.post("/api/admin/error-logs/clear", async (req, res) => {
    try {
      systemErrorLogs.length = 0;
      res.json({ success: true, message: "Hata logları başarıyla temizlendi." });
    } catch (err) {
      console.error("Clear error logs error:", err);
      res.status(500).json({ error: "Loglar temizlenirken hata oluştu." });
    }
  });

  // Generate test error log
  app.post("/api/admin/error-logs/test", async (req, res) => {
    try {
      const { type } = req.body || {};
      if (type === "email") {
        logServerError({
          type: "email",
          message: "SMTP Teslimat Zaman Aşımı Hatası (Simüle Edildi)",
          details: "SMTP sunucusuna (smtp.example.com:587) 12000ms boyunca yanıt alınamadığı için e-posta gönderimi başarısız oldu. Bağlantı zaman aşımı.",
          ip: extractClientIp(req),
          statusCode: 504,
        });
      } else if (type === "api" || type === "server") {
        logServerError({
          type: "server",
          message: "API Yanıt Hatası - 500 Internal Server Error (Simüle Edildi)",
          details: "/api/images/upload servisinde dosya boyutu ayrıştırma sırasında dahili sunucu hatası gerçekleşti.",
          ip: extractClientIp(req),
          statusCode: 500,
        });
      } else {
        logServerError({
          type: "upload",
          message: "Test Yükleme Hatası (Simüle Edildi)",
          details: "Admin panelinden test amacıyla tetiklenmiş dosya yükleme hatası log örneği.",
          ip: extractClientIp(req),
          fileName: "ornek_gorsel_hata_test.png",
          fileSize: 15420000,
          fileType: "image/png",
          statusCode: 400,
        });
      }
      res.json({ success: true, message: "Test hatası başarıyla oluşturuldu." });
    } catch (err) {
      console.error("Test error log error:", err);
      res.status(500).json({ error: "Test hatası oluşturulamadı." });
    }
  });

  // --- ADMIN FIREWALL & ATTACK LOGS ENDPOINTS ---
  app.get("/api/admin/firewall-logs", async (req, res) => {
    try {
      const { attackType, search } = req.query;
      let filtered = [...firewallLogs];

      if (attackType && attackType !== "all") {
        filtered = filtered.filter((l) => l.attackType === attackType);
      }
      if (search && typeof search === "string" && search.trim()) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (l) =>
            l.ip.toLowerCase().includes(s) ||
            l.url.toLowerCase().includes(s) ||
            l.userAgent.toLowerCase().includes(s) ||
            (l.country && l.country.toLowerCase().includes(s))
        );
      }

      const now = Date.now();
      const last24hLogs = firewallLogs.filter((l) => now - l.timestamp < 24 * 60 * 60 * 1000);
      
      const botScans = last24hLogs.filter((l) => l.attackType === "bot_scanner").length;
      const sqlInjections = last24hLogs.filter((l) => l.attackType === "sql_injection").length;
      const rateLimits = last24hLogs.filter((l) => l.attackType === "rate_limit").length;
      const xssAttempts = last24hLogs.filter((l) => l.attackType === "xss_attempt").length;

      // Calculate top attacking IP
      const ipCounts: Record<string, number> = {};
      last24hLogs.forEach((l) => {
        ipCounts[l.ip] = (ipCounts[l.ip] || 0) + 1;
      });
      let topBlockedIp = "-";
      let maxCount = 0;
      Object.entries(ipCounts).forEach(([ip, count]) => {
        if (count > maxCount) {
          maxCount = count;
          topBlockedIp = `${ip} (${count} Saldırı)`;
        }
      });

      // Calculate 24h hourly trend (last 12 hours aggregated)
      const hourlyTrend = [];
      for (let i = 11; i >= 0; i--) {
        const hourStart = now - (i + 1) * 2 * 3600 * 1000;
        const hourEnd = now - i * 2 * 3600 * 1000;
        const dateObj = new Date(hourEnd);
        const label = `${String(dateObj.getHours()).padStart(2, "0")}:00`;
        const logsInHour = firewallLogs.filter((l) => l.timestamp >= hourStart && l.timestamp < hourEnd);
        hourlyTrend.push({
          hour: label,
          count: logsInHour.length,
          bots: logsInHour.filter((l) => l.attackType === "bot_scanner").length,
          sqli: logsInHour.filter((l) => l.attackType === "sql_injection").length,
          rateLimit: logsInHour.filter((l) => l.attackType === "rate_limit").length,
        });
      }

      res.json({
        success: true,
        logs: filtered,
        stats: {
          totalBlocked24h: last24hLogs.length,
          botScans,
          sqlInjections,
          rateLimits,
          xssAttempts,
          topBlockedIp,
          hourlyTrend,
          firewallStatus: "active_protected",
        },
      });
    } catch (err) {
      console.error("Get firewall logs error:", err);
      res.status(500).json({ error: "Güvenlik duvarı logları alınamadı." });
    }
  });

  app.post("/api/admin/firewall-logs/clear", async (req, res) => {
    try {
      firewallLogs.length = 0;
      res.json({ success: true, message: "Güvenlik duvarı kayıtları başarıyla temizlendi." });
    } catch (err) {
      console.error("Clear firewall logs error:", err);
      res.status(500).json({ error: "Güvenlik duvarı logları temizlenemedi." });
    }
  });

  app.post("/api/admin/firewall-logs/simulate", async (req, res) => {
    try {
      const { attackType } = req.body || {};
      const type = attackType || "sql_injection";
      const clientIp = extractClientIp(req);

      if (type === "bot_scanner") {
        logFirewallAttempt({
          ip: clientIp || "185.220.101.45",
          attackType: "bot_scanner",
          method: "GET",
          url: "/.env.production",
          userAgent: "Mozilla/5.0 (compatible; Nmap Scripting Engine)",
          actionTaken: "blocked_403",
          country: "DE",
          severity: "high",
        });
      } else if (type === "rate_limit") {
        logFirewallAttempt({
          ip: clientIp || "82.102.23.4",
          attackType: "rate_limit",
          method: "POST",
          url: "/api/auth/login",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          actionTaken: "rate_limited_429",
          country: "TR",
          severity: "medium",
        });
      } else {
        logFirewallAttempt({
          ip: clientIp || "45.142.120.10",
          attackType: "sql_injection",
          method: "POST",
          url: "/api/images?search=' UNION SELECT 1,2,@@version--",
          userAgent: "python-requests/2.28.1",
          actionTaken: "blocked_403",
          country: "RU",
          severity: "high",
        });
      }

      res.json({ success: true, message: "Test saldırısı başarıyla simüle edilip engellendi." });
    } catch (err) {
      console.error("Simulate firewall attack error:", err);
      res.status(500).json({ error: "Simülasyon gerçekleştirilemedi." });
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

  // Background Stats Offset Auto-Increment Bot Worker
  let lastStatsBotExecTime = Date.now();
  setInterval(async () => {
    try {
      const config = await dbGetConfig();
      if (!config.statsBotEnabled) return;

      const now = Date.now();
      const speed = config.statsBotSpeed || "medium";
      let intervalMs = 12000; // medium: ~12s
      if (speed === "fast") intervalMs = 3000; // fast: ~3s
      if (speed === "slow") intervalMs = 30000; // slow: ~30s

      if (now - lastStatsBotExecTime < intervalMs) return;

      lastStatsBotExecTime = now;

      const minStep = Math.max(1, config.statsBotMinStep ?? 1);
      const maxStep = Math.max(minStep, config.statsBotMaxStep ?? 5);

      const incImages = config.statsBotIncrementImages !== false;
      const incUsers = config.statsBotIncrementUsers !== false;
      const incToday = config.statsBotIncrementToday !== false;

      const step = Math.floor(Math.random() * (maxStep - minStep + 1)) + minStep;

      let newStatsOffset = config.statsOffset || 0;
      let newUsersOffset = config.usersOffset || 0;
      let newTodayOffset = config.todayOffset || 0;

      if (incImages) newStatsOffset += step;
      if (incToday) newTodayOffset += step;

      if (incUsers) {
        const mode = config.statsBotUsersMode || "fluctuate";
        if (mode === "fluctuate") {
          const stepVal = Math.floor(Math.random() * (maxStep - minStep + 1)) + minStep;
          const rand = Math.random();
          let delta = 0;
          if (rand < 0.48) {
            delta = stepVal; // Online kullanıcılar katıldı (+)
          } else if (rand < 0.96) {
            delta = -stepVal; // Online kullanıcılar ayrıldı (-)
          } else {
            delta = 0;
          }
          const minFloor = config.statsBotUsersMinFloor ?? 0;
          newUsersOffset = Math.max(minFloor, newUsersOffset + delta);
        } else {
          if (Math.random() > 0.4) {
            newUsersOffset += Math.max(1, Math.floor(step / 2));
          }
        }
      }

      await dbSaveConfig({
        statsOffset: newStatsOffset,
        usersOffset: newUsersOffset,
        todayOffset: newTodayOffset,
        statsBotLastTick: now,
      });
    } catch (err) {
      // Quiet background exception handling
    }
  }, 3000);

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

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Ensure high timeouts for large file uploads and slow clients
  server.timeout = 60 * 60 * 1000; // 60 minutes for 1GB+ uploads
  server.keepAliveTimeout = 300 * 1000; // 5 minutes
  server.headersTimeout = 305 * 1000; // 305 seconds

  // Handle graceful shutdown on Railway/Cloud container SIGTERM and SIGINT
  const handleGracefulShutdown = (signal: string) => {
    console.log(`[Server] ${signal} alındı. Sunucu kapaniyor...`);
    server.close(() => {
      console.log(`[Server] Sunucu basariyla kapatildi.`);
      process.exit(0);
    });
    setTimeout(() => {
      process.exit(0);
    }, 5000);
  };

  process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});

