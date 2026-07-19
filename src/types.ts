export interface ClientUser {
  id: string;
  username: string;
  email: string;
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
  // Dynamic links calculated on client
  directUrl: string;
  previewUrl: string;
  bbCode: string;
  htmlCode: string;
  markdownCode: string;
}

export type ActiveTab = "home" | "url-upload" | "gallery" | "auth" | "image-detail" | "admin";

export interface SiteConfig {
  homepageTitle: string;
  homepageSubtitle: string;
  announcementEnabled: boolean;
  announcementText: string;
  announcements?: string[];
  statsOffset: number;
  usersOffset: number;
  todayOffset: number;
  appVersion?: string;
}
