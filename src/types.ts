export interface ClientUser {
  id: string;
  username: string;
  email: string;
  isVip?: boolean;
  vipExpireAt?: number;
  vipPlan?: "monthly" | "yearly";
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountHolder: string;
  iban: string;
  branchCode?: string;
  description?: string;
  isActive?: boolean;
}

export interface PaymentGatewayConfig {
  enabled: boolean;
  provider: "paytr" | "shopier" | "iyzico" | "stripe" | "custom";
  merchantId?: string;
  apiKey?: string;
  apiSecret?: string;
  shopierFormUrl?: string;
  customInstruction?: string;
}

export interface PaymentRequest {
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

export interface ClientImage {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: number;
  deleteAfter: "1h" | "1d" | "1w" | "1m" | "never";
  views: number;
  hasPassword?: boolean;
  deleteToken?: string;
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkColor?: string;
  watermarkSize?: number;
  watermarkPosition?: string;
  // Dynamic links calculated on client
  directUrl: string;
  previewUrl: string;
  bbCode: string;
  htmlCode: string;
  markdownCode: string;
}

export type ActiveTab = "home" | "url-upload" | "gallery" | "auth" | "image-detail" | "admin";

export interface AdBanner {
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

export interface AdRequest {
  id: string;
  senderName: string;
  senderEmail: string;
  senderMessage: string;
  createdAt: number;
  status: "new" | "read" | "contacted";
}

export interface AnnouncementItem {
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

export interface SiteConfig {
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
  appVersion?: string;
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
  vipEnabled?: boolean;
  vipMonthlyPrice?: number;
  vipAnnualDiscountPercent?: number;
  vipAnnualPrice?: number;
  vipFeatures?: string[];
  bankAccounts?: BankAccount[];
  paymentGatewayConfig?: PaymentGatewayConfig;
  // Security & Privacy Config
  securityIpLoggingEnabled?: boolean;
  securityHotlinkProtection?: boolean;
  securityWatermarkDefault?: boolean;
  securityForceHttpsHeaders?: boolean;
  securityKvkkNoticeEnabled?: boolean;
  securityMaxLoginAttempts?: number;
  privacyPolicyText?: string;
  termsOfServiceText?: string;
}
