/**
 * Otomatik Görsel ALT Metin Oluşturucu (SEO & Google Görseller Optimize Modülü)
 * 
 * Yüklenen görsellerin dosya adını temizleyip Türkçe dil kurallarına uygun,
 * açıklayıcı ve 'resim yükle' arama terimlerine göre SEO uyumlu alt metinler üretir.
 */

export function generateAltText(filename?: string, customAlt?: string, title?: string): string {
  if (customAlt && customAlt.trim().length > 0) {
    return customAlt.trim();
  }

  if (title && title.trim().length > 0) {
    const cleanTitle = title.trim();
    if (!cleanTitle.toLowerCase().includes("resim yükle") && !cleanTitle.toLowerCase().includes("görsel")) {
      return `${cleanTitle} - Hızlı Resim Yükle & Ücretsiz Görsel Paylaşımı`;
    }
    return cleanTitle;
  }

  if (!filename || filename.trim().length === 0) {
    return "Yüklenen Görsel Medyası - Hızlı Resim Yükle & Ücretsiz Görsel Barındırma";
  }

  // 1. Dosya uzantısını temizle (.png, .jpg, .jpeg, .webp, .gif, .mp4, vb.)
  let clean = filename.replace(/\.[a-zA-Z0-9]+$/i, "");

  // 2. Ayırıcı karakterleri (tire, alt çizgi, artı, nokta, URL encoding, çoklu boşluklar) temizle
  clean = clean
    .replace(/%20/g, " ")
    .replace(/[-_+\.\s]+/g, " ")
    .trim();

  // 3. Rastgele karmaşık hash/sayı dizisi kontrolü (örn. "a8f3b9c2" veya "1722851234901")
  const isHashOrNumber = /^[a-f0-9]{8,32}$/i.test(clean) || /^\d{8,20}$/.test(clean);
  if (isHashOrNumber || clean.length < 2) {
    return "Hızlı Resim Yükle - Yüksek Kaliteli Ücretsiz Görsel Barındırma Servisi";
  }

  // 4. Kelimelerin ilk harflerini büyük yap (Türkçe karakter duyarlı)
  const words = clean.split(" ").filter(Boolean);
  const capitalized = words
    .map((w) => {
      if (w.length === 0) return "";
      return w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1).toLocaleLowerCase("tr-TR");
    })
    .join(" ");

  // 5. Google Görseller arama motoru için SEO takısı ekle
  const lower = capitalized.toLowerCase();
  if (!lower.includes("resim") && !lower.includes("görsel") && !lower.includes("fotoğraf")) {
    return `${capitalized} Görseli - Hızlı Resim Yükle & Ücretsiz Paylaş`;
  }

  return `${capitalized} - Hızlı Resim Yükle & Sınırsız Görsel Barındırma`;
}

/**
 * Dosya adından saf başlık (slogan veya uzantı olmadan) üretir.
 */
export function generateCleanTitle(filename?: string): string {
  if (!filename) return "Görsel Medyası";
  let clean = filename.replace(/\.[a-zA-Z0-9]+$/i, "");
  clean = clean.replace(/%20/g, " ").replace(/[-_+\.\s]+/g, " ").trim();
  if (!clean || /^[a-f0-9]{8,32}$/i.test(clean) || /^\d{8,20}$/.test(clean)) {
    return "Yüklenen Medya Dosyası";
  }
  return clean.split(" ").map(w => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1).toLocaleLowerCase("tr-TR")).join(" ");
}
