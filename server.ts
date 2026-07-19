import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

interface StoredImage {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  data: string; // Base64 encoded string
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

  // In-memory data store
  const images: Record<string, StoredImage> = {};
  const users: Record<string, StoredUser> = {};

  // Seed user and image for illustration
  const seedUserId = "demo-user";
  users[seedUserId] = {
    id: seedUserId,
    username: "HizliResimFan",
    email: "demo@hizliresim.com",
    passwordHash: "demo123",
    createdAt: Date.now(),
  };

  // 1x1 Transparent pixel fallback
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
  app.get("/api/stats", (req, res) => {
    const totalCount = Object.keys(images).length;
    res.json({
      totalImages: totalCount + 1385420, // Add a realistic large seed
      activeUsers: Object.keys(users).length + 4210,
      uploadedToday: Math.min(totalCount + 342, 1200),
    });
  });

  // Handle Image Upload
  app.post("/api/upload", (req, res) => {
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

      images[id] = {
        id,
        name: name || "resim.jpg",
        mimeType: mimeType || "image/jpeg",
        size: size || 0,
        data: base64Data,
        uploadedAt: Date.now(),
        deleteAfter: deleteAfter || "never",
        password: password || undefined,
        deleteToken,
        views: 0,
        userId: userId || undefined,
      };

      res.status(200).json({
        success: true,
        id,
        name,
        size,
        deleteToken,
        uploadedAt: images[id].uploadedAt,
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

      images[id] = {
        id,
        name,
        mimeType,
        size: buffer.length,
        data: buffer.toString("base64"),
        uploadedAt: Date.now(),
        deleteAfter: deleteAfter || "never",
        password: password || undefined,
        deleteToken,
        views: 0,
        userId: userId || undefined,
      };

      res.status(200).json({
        success: true,
        id,
        name,
        size: buffer.length,
        deleteToken,
        uploadedAt: images[id].uploadedAt,
      });
    } catch (err: any) {
      console.error("URL upload error:", err);
      res.status(500).json({ error: "URL'den resim indirilirken bir sunucu hatası oluştu." });
    }
  });

  // Serve Raw Image Data
  app.get("/api/images/:id", (req, res) => {
    const { id } = req.params;
    const { pw } = req.query;
    const image = images[id];

    if (!image) {
      res.status(404).send("Resim bulunamadı.");
      return;
    }

    // Password enforcement on raw image
    if (image.password && image.password !== pw) {
      // In web browser direct view, if password fails, return a unauthorized view or simple prompt
      // To ensure embeds work if pw matches or if we just want to block unauthorized access:
      res.status(403).send("Bu resim şifre korumalıdır.");
      return;
    }

    try {
      const buffer = Buffer.from(image.data, "base64");
      res.writeHead(200, {
        "Content-Type": image.mimeType,
        "Content-Length": buffer.length,
        "Cache-Control": "public, max-age=86400",
      });
      res.end(buffer);
    } catch (err) {
      res.status(500).send("Görsel yüklenirken hata oluştu.");
    }
  });

  // Get Image Information (Excluding raw base64 data and password)
  app.get("/api/images/:id/info", (req, res) => {
    const { id } = req.params;
    const image = images[id];

    if (!image) {
      res.status(404).json({ error: "Resim bulunamadı." });
      return;
    }

    // Increment views
    image.views += 1;

    res.json({
      id: image.id,
      name: image.name,
      mimeType: image.mimeType,
      size: image.size,
      uploadedAt: image.uploadedAt,
      deleteAfter: image.deleteAfter,
      views: image.views,
      hasPassword: !!image.password,
      userId: image.userId,
    });
  });

  // Verify Image Password
  app.post("/api/images/:id/verify", (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    const image = images[id];

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
  });

  // Set/Lock Image Password after upload
  app.post("/api/images/:id/lock", (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    const image = images[id];

    if (!image) {
      res.status(404).json({ error: "Görsel bulunamadı." });
      return;
    }

    image.password = password;
    res.json({ success: true, message: "Görsel başarıyla şifrelendi." });
  });

  // Delete Image
  app.delete("/api/images/:id", (req, res) => {
    const { id } = req.params;
    const { token } = req.query;
    const image = images[id];

    if (!image) {
      res.status(404).json({ error: "Resim bulunamadı." });
      return;
    }

    if (image.deleteToken === token) {
      delete images[id];
      res.json({ success: true, message: "Resim başarıyla silindi." });
    } else {
      res.status(403).json({ error: "Geçersiz silme anahtarı!" });
    }
  });

  // --- USER AUTHENTICATION ---

  // Register
  app.post("/api/auth/register", (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: "Lütfen tüm alanları doldurun." });
      return;
    }

    const emailLower = email.toLowerCase();
    const existing = Object.values(users).find(u => u.email === emailLower || u.username === username);
    if (existing) {
      res.status(400).json({ error: "Bu kullanıcı adı veya e-posta zaten kullanımda." });
      return;
    }

    const id = "usr_" + generateId(8);
    users[id] = {
      id,
      username,
      email: emailLower,
      passwordHash: password, // For mock prototype, simple password matching is used
      createdAt: Date.now(),
    };

    res.json({
      success: true,
      user: { id, username, email: emailLower },
    });
  });

  // Login
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Lütfen tüm alanları doldurun." });
      return;
    }

    const emailLower = email.toLowerCase();
    const user = Object.values(users).find(u => u.email === emailLower && u.passwordHash === password);

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
  app.get("/api/user/uploads", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Yetkisiz işlem." });
      return;
    }

    const userId = authHeader.split(" ")[1];
    const userUploads = Object.values(images)
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

    res.json(userUploads);
  });

  // Background check for expired images (every 1 minute)
  setInterval(() => {
    const now = Date.now();
    let deletedCount = 0;
    Object.keys(images).forEach(id => {
      const img = images[id];
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
        delete images[id];
        deletedCount++;
      }
    });
    if (deletedCount > 0) {
      console.log(`Auto-cleaned ${deletedCount} expired images.`);
    }
  }, 60000);

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
