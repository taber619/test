import React, { useState } from "react";
import { Code, Terminal, Copy, Check, Server, Zap, ShieldCheck, Key, ArrowLeft, Upload, FileText } from "lucide-react";
import { SiteConfig } from "../types";

interface ApiDocsViewProps {
  onNavigateHome: () => void;
  siteConfig?: SiteConfig | null;
}

export default function ApiDocsView({ onNavigateHome, siteConfig }: ApiDocsViewProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<"curl" | "javascript" | "python" | "php">("curl");

  const domain = siteConfig?.siteDomain || "resimresim.com";
  const baseUrl = `https://${domain}/api/upload`;

  const codeExamples = {
    curl: `curl -X POST "${baseUrl}" \\
  -H "Accept: application/json" \\
  -F "file=@/path/to/image.jpg" \\
  -F "autoDeleteSeconds=0"`,

    javascript: `const formData = new FormData();
formData.append('file', imageFileInput.files[0]);

fetch('${baseUrl}', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => console.log('Görsel URL:', data.url))
.catch(error => console.error('Hata:', error));`,

    python: `import requests

url = "${baseUrl}"
files = {'file': open('image.jpg', 'rb')}

response = requests.post(url, files=files)
data = response.json()

print("Resim Adresi:", data['url'])`,

    php: `<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "${baseUrl}");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, [
    'file' => new CURLFile('/path/to/image.jpg')
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
echo "Resim Linki: " . $data['url'];
?>`
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8 animate-fade-in" id="api-docs-page-container">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="p-2.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all cursor-pointer flex items-center justify-center shadow-sm"
              title="Anasayfaya Dön"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800/40">
                Developer API Portal v2
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                REST API & Entegrasyon Dokümantasyonu
              </h1>
            </div>
          </div>

          <button
            onClick={onNavigateHome}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>Resim Yükle</span>
          </button>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm space-y-2">
            <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-black text-sm text-slate-900 dark:text-white">Ultra Hızlı Yanıt</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Global CDN altyapısı sayesinde ortalama 120ms içinde JSON yanıtı teslim edilir.
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm space-y-2">
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-black text-sm text-slate-900 dark:text-white">Kişisel Veri Koruması</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Yüklenen medya içeriklerindeki GPS ve EXIF bilgileri API düzeyinde otomatik silinir.
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm space-y-2">
            <div className="w-10 h-10 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <h3 className="font-black text-sm text-slate-900 dark:text-white">CORS & Açık Erişim</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Her türlü web sitesi, mobil uygulama veya masaüstü yazılımından doğrudan çağrılabilir.
            </p>
          </div>
        </div>

        {/* API Endpoint Details Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="font-black text-xs text-blue-500 uppercase tracking-widest">HTTP Yöntemi</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-3 py-1 bg-emerald-500 text-white font-black text-xs rounded-xl uppercase">POST</span>
                <code className="text-xs sm:text-sm font-mono font-bold bg-slate-100 dark:bg-slate-950 px-3 py-1 rounded-xl text-slate-800 dark:text-slate-200">
                  {baseUrl}
                </code>
              </div>
            </div>

            <button
              onClick={() => copyToClipboard(baseUrl, "endpoint")}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              {copiedCode === "endpoint" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode === "endpoint" ? "Kopyalandı!" : "Endpoint'i Kopyala"}</span>
            </button>
          </div>

          {/* Form Parameters Table */}
          <div className="space-y-3">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-500" />
              İstek Parametreleri (multipart/form-data)
            </h3>

            <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-extrabold text-slate-500 dark:text-slate-400">
                    <th className="p-3">Parametre</th>
                    <th className="p-3">Tip</th>
                    <th className="p-3">Zorunlu mu?</th>
                    <th className="p-3">Açıklama</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  <tr>
                    <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">file</td>
                    <td className="p-3 font-mono">File (Binary)</td>
                    <td className="p-3 text-rose-500 font-bold">Evet</td>
                    <td className="p-3">Yüklenecek resim, video veya GIF dosyası (Max 5 GB).</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">autoDeleteSeconds</td>
                    <td className="p-3 font-mono">Integer</td>
                    <td className="p-3 text-slate-400">Hayır</td>
                    <td className="p-3">Otomatik silinme süresi (Saniye). 0 = Süresiz kalıcı.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">password</td>
                    <td className="p-3 font-mono">String</td>
                    <td className="p-3 text-slate-400">Hayır</td>
                    <td className="p-3">Görselin görüntülenmesi için özel erişim şifresi.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Code Generator */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-purple-500" />
                Kod Örnekleri
              </h3>

              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                {(["curl", "javascript", "python", "php"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`px-3 py-1 text-[11px] font-extrabold rounded-xl transition-all cursor-pointer uppercase ${
                      selectedLanguage === lang
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative group rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 text-slate-100 p-4 font-mono text-xs">
              <button
                onClick={() => copyToClipboard(codeExamples[selectedLanguage], "code")}
                className="absolute top-3 right-3 p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
                title="Kopyala"
              >
                {copiedCode === "code" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {codeExamples[selectedLanguage]}
              </pre>
            </div>
          </div>

          {/* JSON Response Example */}
          <div className="space-y-3 pt-2">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-500" />
              Başarılı Yanıt Örneği (HTTP 200 OK)
            </h3>

            <div className="rounded-2xl bg-slate-950 border border-slate-800 text-emerald-400 p-4 font-mono text-xs leading-relaxed overflow-x-auto">
{`{
  "success": true,
  "id": "img_98a7f21e",
  "url": "https://${domain}/i/img_98a7f21e",
  "directUrl": "https://${domain}/uploads/img_98a7f21e.png",
  "deleteUrl": "https://${domain}/delete/del_x92a0012",
  "bbCode": "[url=https://${domain}/i/img_98a7f21e][img]https://${domain}/uploads/img_98a7f21e.png[/img][/url]",
  "markdown": "![İnanResim](https://${domain}/uploads/img_98a7f21e.png)"
}`}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
