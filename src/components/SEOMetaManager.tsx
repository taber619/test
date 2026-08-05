import React, { useEffect } from "react";
import { ActiveTab, SiteConfig } from "../types";
import { generateAltText, generateCleanTitle } from "../utils/altTextGenerator";

interface SEOMetaManagerProps {
  activeTab: ActiveTab;
  selectedDetailId?: string | null;
  imageMeta?: {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    uploadedAt: number;
    views?: number;
  } | null;
  activeInfoModal?: "faq" | "privacy" | "abuse" | "contact" | null;
  siteConfig?: SiteConfig | null;
}

export default function SEOMetaManager({
  activeTab,
  selectedDetailId,
  imageMeta,
  activeInfoModal,
  siteConfig,
}: SEOMetaManagerProps) {
  useEffect(() => {
    const origin = window.location.origin;
    const siteName = siteConfig?.siteName || "İnan Hızlı Medya";
    const baseKeywords = "resim yükle, hızlı resim yükle, resim yükleme, görsel yükle, hızlı resim, ücretsiz resim yükle, fotoğraf yükle, resim barındırma, hızlı görsel paylaşımı, resim hızlı yükle";

    let title = `${siteName} - Hızlı Resim Yükle & Ücretsiz Sınırsız Görsel Barındırma`;
    let description = "Hızlı resim yükle! Ücretsiz, üyeliksiz, sınırsız ve yüksek hızlı resim yükleme ve görsel barındırma servisi. Görsellerinizi doğrudan HTML, BBCode ve Markdown kodlarıyla paylaşın.";
    let keywords = baseKeywords;
    let ogType = "website";
    let ogImage = `${origin}/favicon.ico`;
    let pageUrl = origin;
    let schemaObj: any = null;

    // Determine target route & metadata based on activeTab / modals
    if (activeInfoModal === "contact" || activeTab === "contact") {
      title = `İletişim & Destek - ${siteName} | Resim Yükle Servisi`;
      description = `${siteName} iletişim ve destek sayfası. Resim yükleme servisi hakkında sorularınız, reklam teklifleriniz ve görüşleriniz için bize ulaşın.`;
      keywords = `iletişim, ${baseKeywords}, destek, reklam verme, resim yükle destek`;
      pageUrl = `${origin}/?view=contact`;
      schemaObj = {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        "name": title,
        "description": description,
        "url": pageUrl,
        "mainEntity": {
          "@type": "Organization",
          "name": siteName,
          "url": origin,
          "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer service",
            "availableLanguage": "Turkish"
          }
        }
      };
    } else if (activeInfoModal === "faq" || activeTab === "faq") {
      title = `Sıkça Sorulan Sorular (SSS) - Hızlı Resim Yükle | ${siteName}`;
      description = "Resim nasıl yüklenir? Yükleme limitleri nedir? Görseller siliniyor mu? Hızlı resim yükleme ve barındırma servisi hakkında merak edilen tüm sorular ve yanıtları.";
      keywords = `sıkça sorulan sorular, resim yükleme rehberi, ${baseKeywords}, sss`;
      pageUrl = `${origin}/?view=faq`;
      schemaObj = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "name": title,
        "description": description,
        "url": pageUrl,
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Resim yükleme servisi ücretsiz mi?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Evet, İnan Hızlı Medya resim yükleme servisi tamamen ücretsizdir ve üyelik gerektirmeden hızlıca resim yüklemenizi sağlar."
            }
          },
          {
            "@type": "Question",
            "name": "Yüklenen resimler ne kadar süre saklanır?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Seçiminize göre resimleriniz süresiz kalıcı olarak veya belirlediğiniz otomatik silinme süresine göre güvenle saklanır."
            }
          },
          {
            "@type": "Question",
            "name": "Hangi dosya formatları destekleniyor?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "JPG, PNG, WEBP, GIF, SVG, BMP, MP4, MOV, WEBM ve arşiv formatları desteklenmektedir."
            }
          }
        ]
      };
    } else if (activeTab === "image-detail" && (imageMeta || selectedDetailId)) {
      const imgId = imageMeta?.id || selectedDetailId;
      const cleanName = generateCleanTitle(imageMeta?.name);
      const generatedAlt = generateAltText(imageMeta?.name, undefined, cleanName);

      title = `${cleanName} - Resim Yükle & Görsel Paylaş | ${siteName}`;
      description = `"${generatedAlt}" - Bu görsel ${siteName} üzerinden hızlı ve güvenli şekilde yüklendi. Yüksek çözünürlüklü indirme ve direkt link paylaşımı.`;
      keywords = `${cleanName}, ${generatedAlt}, resim yükle, hızlı resim indir, ${baseKeywords}`;
      ogType = imageMeta?.mimeType?.startsWith("video/") ? "video.other" : "article";
      ogImage = `${origin}/api/images/${imgId}`;
      pageUrl = `${origin}/i/${imgId}`;

      schemaObj = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "ImageObject",
            "@id": pageUrl,
            "url": `${origin}/api/images/${imgId}`,
            "contentUrl": `${origin}/api/images/${imgId}`,
            "name": cleanName,
            "description": generatedAlt,
            "caption": generatedAlt,
            "encodingFormat": imageMeta?.mimeType || "image/png",
            "contentSize": imageMeta?.size ? `${imageMeta.size}` : undefined,
            "uploadDate": imageMeta?.uploadedAt ? new Date(imageMeta.uploadedAt).toISOString() : new Date().toISOString(),
            "thumbnailUrl": `${origin}/api/images/${imgId}`,
            "author": {
              "@type": "Organization",
              "name": siteName,
              "url": origin
            },
            "keywords": `resim yükle, ${cleanName}, ${generatedAlt}, hızlı görsel`
          },
          {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Ana Sayfa - Resim Yükle",
                "item": origin
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Görsel Detayı",
                "item": pageUrl
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": cleanName,
                "item": pageUrl
              }
            ]
          }
        ]
      };
    } else if (activeTab === "gallery") {
      title = `Görsel Galerisi & Yüklenen Resimler - Resim Yükle | ${siteName}`;
      description = "Hesabınızdaki ve kamuya açık en yeni görseller, fotoğraflar ve videolar. Yüksek hızlı ücretsiz resim yükleme ve galeri yönetimi.";
      keywords = `görsel galerisi, yüklenen resimler, ${baseKeywords}, resim arşivim`;
      pageUrl = `${origin}/?view=gallery`;
      schemaObj = {
        "@context": "https://schema.org",
        "@type": "ImageGallery",
        "name": title,
        "description": description,
        "url": pageUrl
      };
    } else if (activeTab === "blog") {
      title = `Blog & SEO Rehberleri - Resim Yükleme ve Görsel İpuçları | ${siteName}`;
      description = "Resim yükleme, web siteleri için resim optimizasyonu, Google Görseller SEO ve görsel formatları hakkında en güncel ipuçları ve makaleler.";
      keywords = `resim yükle blog, resim optimizasyonu, görsellerde seo, ${baseKeywords}`;
      pageUrl = `${origin}/?view=blog`;
      schemaObj = {
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": title,
        "description": description,
        "url": pageUrl,
        "publisher": {
          "@type": "Organization",
          "name": siteName,
          "logo": {
            "@type": "ImageObject",
            "url": `${origin}/favicon.ico`
          }
        }
      };
    } else if (activeTab === "url-upload") {
      title = `URL ile Resim Yükle & İnternetten Görsel Aktar - ${siteName}`;
      description = "İnternetteki herhangi bir görselin URL adresini yapıştırarak anında sunucularımıza hızlıca yükleyin ve paylaşım linkleri oluşturun.";
      keywords = `url ile resim yükle, internetten resim aktar, linkten resim yükleme, ${baseKeywords}`;
      pageUrl = `${origin}/?view=url-upload`;
    } else if (activeTab === "about") {
      title = `Hakkımızda - Sınırsız & Ücretsiz Resim Yükleme Servisi | ${siteName}`;
      description = `${siteName} yüksek hızlı, güvenli ve kolay kullanımlı ücretsiz resim yükleme platformudur. Görsellerinizi saniyeler içinde yükleyin ve paylaşın.`;
      keywords = `hakkımızda, resim yükle nedir, ${baseKeywords}`;
      pageUrl = `${origin}/?view=about`;
    } else if (activeTab === "terms") {
      title = `Kullanım Şartları & Hizmet Koşulları - ${siteName}`;
      description = `${siteName} resim yükleme servisinin kullanım şartları, yükleme kuralları ve hizmet koşulları.`;
      pageUrl = `${origin}/?view=terms`;
    } else if (activeTab === "privacy") {
      title = `Gizlilik Politikası & KVKK - ${siteName}`;
      description = `${siteName} gizlilik politikası. Kullanıcı verilerinin korunması, veri güvenliği ve resim yükleme gizlilik taahhüdümüz.`;
      pageUrl = `${origin}/?view=privacy`;
    } else if (activeTab === "api-docs") {
      title = `Resim Yükleme API Dokümantasyonu - ${siteName}`;
      description = "Kendi web siteniz veya uygulamanız üzerinden hızlı resim yükleme servisimizi entegre edin. Ücretsiz REST API dokümanı.";
      keywords = `resim yükleme api, image upload api, ${baseKeywords}`;
      pageUrl = `${origin}/?view=api-docs`;
    } else {
      // Default Home / Main Upload View
      title = `${siteName} - Hızlı Resim Yükle & Ücretsiz Sınırsız Görsel Barındırma`;
      description = "Hızlı resim yükle! Ücretsiz, üyeliksiz, sınırsız ve yüksek hızlı resim yükleme ve görsel barındırma servisi. Görsellerinizi doğrudan HTML, BBCode ve Markdown kodlarıyla paylaşın.";
      keywords = baseKeywords;
      pageUrl = origin;

      schemaObj = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": `${origin}/#website`,
            "url": origin,
            "name": `${siteName} - Hızlı Resim Yükle`,
            "alternateName": ["Hızlı Resim", "İnan Resim Yükle", "Resim Yükle"],
            "description": description,
            "inLanguage": "tr-TR",
            "potentialAction": {
              "@type": "SearchAction",
              "target": `${origin}/?q={search_term_string}`,
              "query-input": "required name=search_term_string"
            }
          },
          {
            "@type": "WebApplication",
            "@id": `${origin}/#webapp`,
            "url": origin,
            "name": `${siteName} Hızlı Resim Yükleme`,
            "applicationCategory": "MultimediaApplication",
            "operatingSystem": "All",
            "browserRequirements": "Requires JavaScript. Requires HTML5.",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "TRY"
            },
            "featureList": [
              "Hızlı Resim Yükleme",
              "Sınırsız Görsel Barındırma",
              "Şifre Korumalı Dosya Yükleme",
              "Otomatik Silinme Süreleri",
              "Filigran (Watermark) Ekleme",
              "Direct Link, BBCode, HTML ve Markdown Çıktıları"
            ]
          },
          {
            "@type": "Organization",
            "@id": `${origin}/#organization`,
            "name": siteName,
            "url": origin,
            "logo": {
              "@type": "ImageObject",
              "url": `${origin}/favicon.ico`
            }
          }
        ]
      };
    }

    // 1. Update Document Title
    document.title = title;

    // 2. Helper to set or update meta tag
    const setMetaTag = (selector: string, attrName: string, attrVal: string, content: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attrName, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    setMetaTag('meta[name="description"]', 'name', 'description', description);
    setMetaTag('meta[name="keywords"]', 'name', 'keywords', keywords);
    setMetaTag('meta[name="robots"]', 'name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');

    // OpenGraph Tags
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', title);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', ogType);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', pageUrl);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', ogImage);
    setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', siteName);

    // Twitter Card Tags
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage);

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", pageUrl);

    // 3. Update Schema.org JSON-LD script
    let schemaScript = document.getElementById("schema-jsonld");
    if (!schemaScript) {
      schemaScript = document.createElement("script");
      schemaScript.id = "schema-jsonld";
      schemaScript.setAttribute("type", "application/ld+json");
      document.head.appendChild(schemaScript);
    }

    if (schemaObj) {
      schemaScript.textContent = JSON.stringify(schemaObj, null, 2);
    } else {
      schemaScript.textContent = "";
    }

  }, [activeTab, selectedDetailId, imageMeta, activeInfoModal, siteConfig]);

  return null; // Side-effect component only
}
