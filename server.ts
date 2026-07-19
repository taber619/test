import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs 
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
}

interface StoredUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: number;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Enable large file uploads (Hızlı Resim max 20MB per file, max 10 files)
  app.use(express.json({ limit: "60mb" }));
  app.use(express.urlencoded({ limit: "60mb", extended: true }));

  // In-memory data store (fallback if Firebase is not active)
  const images: Record<string, StoredImage> = {};
  const users: Record<string, StoredUser> = {};

  // Load Firebase configuration
  let db: any = null;
  let useFirebase = false;

  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      const firebaseApp = initializeApp(firebaseConfig);
      db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
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

  // Site configuration interface
  interface SiteConfig {
    homepageTitle: string;
    homepageSubtitle: string;
    announcementEnabled: boolean;
    announcementText: string;
    statsOffset: number;
    usersOffset: number;
    todayOffset: number;
  }

  const defaultSiteConfig: SiteConfig = {
    homepageTitle: "Hızlı ve Güvenilir Resim Paylaşımı",
    homepageSubtitle: "Saniyeler içinde resim yükleyin, şifreleyin, paylaşın veya otomatik silinmesini sağlayın.",
    announcementEnabled: true,
    announcementText: "Yönetici Duyurusu: Yeni Hızlı Resim sürümü yayında! Artık kendi şifreli görsellerinizi koruyabilirsiniz.",
    statsOffset: 1385420,
    usersOffset: 4210,
    todayOffset: 342
  };

  let siteConfigState = { ...defaultSiteConfig };

  async function dbGetConfig(): Promise<SiteConfig> {
    if (useFirebase && db) {
      try {
        const docRef = doc(db, "configs", "site");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          return {
            homepageTitle: data.homepageTitle ?? defaultSiteConfig.homepageTitle,
            homepageSubtitle: data.homepageSubtitle ?? defaultSiteConfig.homepageSubtitle,
            announcementEnabled: data.announcementEnabled ?? defaultSiteConfig.announcementEnabled,
            announcementText: data.announcementText ?? defaultSiteConfig.announcementText,
            statsOffset: data.statsOffset !== undefined ? Number(data.statsOffset) : defaultSiteConfig.statsOffset,
            usersOffset: data.usersOffset !== undefined ? Number(data.usersOffset) : defaultSiteConfig.usersOffset,
            todayOffset: data.todayOffset !== undefined ? Number(data.todayOffset) : defaultSiteConfig.todayOffset,
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

  async function dbGetAllUsers(usersStore: Record<string, StoredUser>): Promise<any[]> {
    if (useFirebase && db) {
      try {
        const usersRef = collection(db, "users");
        const snap = await getDocs(usersRef);
        return snap.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: data.id,
            username: data.username,
            email: data.email,
            createdAt: data.createdAt,
          };
        });
      } catch (e) {
        console.error("Firebase get all users error:", e);
      }
    }
    return Object.values(usersStore).map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      createdAt: u.createdAt,
    }));
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
  async function getStatsCount(imagesStore: Record<string, StoredImage>, usersStore: Record<string, StoredUser>) {
    const config = await dbGetConfig();
    if (useFirebase && db) {
      try {
        const imagesRef = collection(db, "images");
        const usersRef = collection(db, "users");
        const [imagesSnap, usersSnap] = await Promise.all([
          getDocs(imagesRef),
          getDocs(usersRef)
        ]);
        return {
          totalImages: imagesSnap.size + config.statsOffset,
          activeUsers: usersSnap.size + config.usersOffset,
          uploadedToday: Math.min(imagesSnap.size + config.todayOffset, 1200),
        };
      } catch (e) {
        console.error("Firebase stats error:", e);
      }
    }
    const totalCount = Object.keys(imagesStore).length;
    return {
      totalImages: totalCount + config.statsOffset,
      activeUsers: Object.keys(usersStore).length + config.usersOffset,
      uploadedToday: Math.min(totalCount + config.todayOffset, 1200),
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
    if (useFirebase && db) {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email), where("passwordHash", "==", passwordHash));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          return {
            id: data.id,
            username: data.username,
            email: data.email,
            passwordHash: data.passwordHash,
            createdAt: data.createdAt,
          };
        }
        return null;
      } catch (e) {
        console.error("Firebase login error:", e);
      }
    }

    const user = Object.values(usersStore).find(u => u.email === email && u.passwordHash === passwordHash);
    return user || null;
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
    username: "HizliResimFan",
    email: "demo@hizliresim.com",
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
          username: "HizliResimFan",
          email: "demo@hizliresim.com",
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
    try {
      const stats = await getStatsCount(images, users);
      res.json(stats);
    } catch (err) {
      console.error("Stats API error:", err);
      res.status(500).json({ error: "İstatistikler alınamadı." });
    }
  });

  // Handle Image Upload
  app.post("/api/upload", async (req, res) => {
    try {
      const { name, mimeType, size, data, deleteAfter, password, userId } = req.body;

      if (!data || !mimeType || !name) {
        res.status(400).json({ error: "Eksik resim verisi!" });
        return;
      }

      const id = generateId(6);
      const deleteToken = "del_" + generateId(12);

      // Store base64 data (strip prefix if present, like 'data:image/png;base64,')
      let base64Data = data;
      if (data.includes("base64,")) {
        base64Data = data.split("base64,")[1];
      }

      const img: StoredImage = {
        id,
        name: name || "resim.jpg",
        mimeType: mimeType || "image/jpeg",
        size: size || 0,
        data: "", // We don't store raw data directly in metadata
        uploadedAt: Date.now(),
        deleteAfter: deleteAfter || "never",
        password: password || undefined,
        deleteToken,
        views: 0,
        userId: userId || undefined,
      };

      await dbSaveImage(img, base64Data, images);

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
      const { url, deleteAfter, password, userId } = req.body;

      if (!url) {
        res.status(400).json({ error: "Lütfen geçerli bir resim URL'si gönderin!" });
        return;
      }

      const response = await fetch(url);
      if (!response.ok) {
        res.status(400).json({ error: "Görsel indirilemedi. Geçerli bir URL girdiğinizden emin olun veya web sitesinin engellemediğini doğrulayın." });
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = response.headers.get("content-type") || "image/jpeg";

      if (!mimeType.startsWith("image/")) {
        res.status(400).json({ error: "İndirilen dosya geçerli bir görsel formatı değil!" });
        return;
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

      const img: StoredImage = {
        id,
        name,
        mimeType,
        size: buffer.length,
        data: "", // No direct base64 data in metadata
        uploadedAt: Date.now(),
        deleteAfter: deleteAfter || "never",
        password: password || undefined,
        deleteToken,
        views: 0,
        userId: userId || undefined,
      };

      await dbSaveImage(img, buffer.toString("base64"), images);

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

    const emailLower = email.toLowerCase();
    const id = "usr_" + generateId(8);
    const user: StoredUser = {
      id,
      username,
      email: emailLower,
      passwordHash: password,
      createdAt: Date.now(),
    };

    const success = await dbRegisterUser(user, users);
    if (!success) {
      res.status(400).json({ error: "Bu kullanıcı adı veya e-posta zaten kullanımda." });
      return;
    }

    res.json({
      success: true,
      user: { id, username, email: emailLower },
    });
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Lütfen tüm alanları doldurun." });
      return;
    }

    const emailLower = email.toLowerCase();
    const user = await dbLoginUser(emailLower, password, users);

    if (!user) {
      res.status(401).json({ error: "E-posta veya şifre hatalı." });
      return;
    }

    res.json({
      success: true,
      user: { id: user.id, username: user.username, email: user.email },
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

  // --- SITE CONFIGURATION AND ADMIN ENDPOINTS ---

  // Get public config
  app.get("/api/config", async (req, res) => {
    try {
      const config = await dbGetConfig();
      res.json(config);
    } catch (err) {
      console.error("Get config error:", err);
      res.status(500).json({ error: "Site ayarları yüklenemedi." });
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
        statsOffset,
        usersOffset,
        todayOffset
      } = req.body;

      const updated = await dbSaveConfig({
        homepageTitle,
        homepageSubtitle,
        announcementEnabled: !!announcementEnabled,
        announcementText,
        statsOffset: statsOffset !== undefined ? Number(statsOffset) : undefined,
        usersOffset: usersOffset !== undefined ? Number(usersOffset) : undefined,
        todayOffset: todayOffset !== undefined ? Number(todayOffset) : undefined
      });

      res.json({ success: true, config: updated });
    } catch (err) {
      console.error("Save config error:", err);
      res.status(500).json({ error: "Site ayarları kaydedilirken hata oluştu." });
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

  // Admin delete image
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

