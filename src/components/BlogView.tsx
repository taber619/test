import React, { useState } from "react";
import { 
  BookOpen, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  ArrowLeft, 
  Sparkles, 
  Tag, 
  Share2, 
  MessageCircle, 
  ThumbsUp, 
  Eye, 
  ChevronRight,
  Send,
  CheckCircle2,
  Upload
} from "lucide-react";

interface BlogPost {
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
}

interface BlogViewProps {
  onNavigateHome: () => void;
  onOpenVipModal?: () => void;
}

export default function BlogView({ onNavigateHome, onOpenVipModal }: BlogViewProps) {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, { author: string; text: string; time: string }[]>>({
    "post-1": [
      { author: "Ahmet Y.", text: "PRO VIP üyelik özellikleri gerçekten harika olmuş, 5 GB yükleme çok işimize yarayacak!", time: "2 saat önce" },
      { author: "Zeynep K.", text: "Özel filigran ekleme özelliğini test ettim, fotoğraflarımı korumak için mükemmel çalışıyor.", time: "5 saat önce" }
    ]
  });
  const [newCommentText, setNewCommentText] = useState("");
  const [newCommentName, setNewCommentName] = useState("");
  const [commentAdded, setCommentAdded] = useState(false);

  const posts: BlogPost[] = [
    {
      id: "post-1",
      title: "İnanResim 2.0 Yayında: 5 GB VIP Transfer, Özel Filigran ve Yeni Sunucu Altyapısı!",
      summary: "Türkiye'nin en hızlı resim yükleme platformu İnanResim yenilendi! PRO VIP üyeler için 5 GB tek seferlik transfer, şifreli klasörleme ve filigran motoru aktif edildi.",
      category: "guncelleme",
      categoryLabel: "Sistem Güncellemesi",
      author: "İnanResim Sistem Ekibi",
      date: "02 Ağustos 2026",
      readTime: "3 dk okuma",
      imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      views: 1420,
      likes: 89,
      tags: ["Güncelleme", "VIP", "Filigran", "Yüksek Hız"],
      content: [
        "Değerli İnanResim kullanıcıları, sizlerden gelen geri bildirimler doğrultusunda platformumuzu baştan aşağı yenilemekten gurur duyuyoruz!",
        "Yeni 2.0 sürümümüz ile birlikte sunucu altyapımızı 10 Gbps uç bağlantılı yüksek hızlı NVMe SSD depolama ünitelerine taşıdık. Artık görselleriniz mikro saniyeler içinde işleniyor ve dünyanın her yerinden anında açılıyor.",
        "Pro VIP Üyeler İçin Yeni Ayrıcalıklar:",
        "• Tek seferde 5 GB (5000 MB) dosya, görsel ve video yükleme kapasitesi.\n• Görsellerinizin üzerine otomatik filigran (Watermark) ve şeffaf logo ekleme motoru.\n• Yüklediğiniz içerikler için SÜRESİZ ve KALICI depolama garantisi.\n• Forumlar için otomatik toplu BBCode ve Markdown aktarım paneli.",
        "Ücretsiz kullanıcılarımız da unutulmadı! Kayıtlı üyelerimiz için tek seferde yükleme limitini 1 GB'a (1000 MB) çıkardık. Keyifli paylaşımlar dileriz!"
      ]
    },
    {
      id: "post-2",
      title: "Fotoğrafçılık Rehberi: Resim Sıkıştırma ve Kalite Kaybını Önleme Teknikleri",
      summary: "Web siteleriniz ve forum paylaşımlarınız için yüksek çözünürlüklü fotoğrafları kalite kaybı yaşamadan nasıl optimize edebilirsiniz? Detaylı teknik rehberimiz.",
      category: "rehber",
      categoryLabel: "Fotoğrafçılık & Rehber",
      author: "Murat Can (Kıdemli Tasarımcı)",
      date: "28 Temmuz 2026",
      readTime: "5 dk okuma",
      imageUrl: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1000&q=80",
      views: 2150,
      likes: 134,
      tags: ["Rehber", "Optimizasyon", "WEBP", "Sıkıştırma"],
      content: [
        "Dijital çağda görsellerin hızı ve netliği kullanıcı deneyiminin temel taşıdır. Büyük boyutlu ham fotoğraflar sitelerin geç açılmasına ve mobil kota harcamalarına sebep olur.",
        "WEBP Formatının Gücü:",
        "WEBP formatı, geleneksel JPEG ve PNG formatlarına göre %30 ila %50 oranında daha küçük dosya boyutu sunarken gözle görülür hiçbir kalite kaybı yaşatmaz. İnanResim entegre sıkıştırma motoru yüklediğiniz tüm görselleri tarayıcı uyumlu en ideal formatta sunar.",
        "Daha Hızlı Yükleme İçin Tavsiyeler:",
        "1. Fotoğraflarınızı yüklemeden önce çözünürlüğünü 1920px genişliğe sabitleyin.\n2. Hareketli görsellerde GIF yerine MP4 veya WEBM video formatlarını tercih edin.\n3. İnanResim dahili editörünü kullanarak gereksiz kenar boşluklarını kırpın."
      ]
    },
    {
      id: "post-3",
      title: "Siber Güvenlik: Şifreli Resim Paylaşımı ve Anonim Veri Gizliliği",
      summary: "Özel görsellerinizi ve belgelerinizi internette güvenle paylaşmanın yolları. Parola koruması, otomatik silinme zamanlayıcısı ve EXIF veri temizliği.",
      category: "guvenlik",
      categoryLabel: "Güvenlik & Gizlilik",
      author: "Güvenlik & Analiz Uzmanı",
      date: "15 Temmuz 2026",
      readTime: "4 dk okuma",
      imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1000&q=80",
      views: 980,
      likes: 67,
      tags: ["Güvenlik", "Şifreleme", "EXIF", "Gizlilik"],
      content: [
        "İnternet üzerinde kişisel görsellerinizi paylaşırken gizliliğinizi korumak her zamankinden daha önemli hale geldi.",
        "Görsellerde Gizlenen EXIF Verileri Nedir?",
        "Akıllı telefonlarla çekilen her fotoğrafta çekildiği konum (GPS koordinatları), cihaz modeli, tarih ve saat gibi hassas bilgiler saklanır. İnanResim güvenlik duvarı, yüklediğiniz görsellerden kişisel konum verilerini (EXIF) otomatik temizleyerek anonimliğinizi korur.",
        "Şifreli Görsel Paylaşımı Nasıl Çalışır?",
        "İnanResim üzerinde yüklediğiniz her görsele özel bir parola belirleyebilirsiniz. Şifre koyduğunuz görseller yalnızca sizin belirlediğiniz kişilere parolayı girdiklerinde gösterilir. Ayrıca 1 saat veya 1 gün gibi süreli silinme opsiyonları ile verileriniz zamanı geldiğinde sunuculardan tamamen yok edilir."
      ]
    }
  ];

  const filteredPosts = posts.filter((post) => {
    const matchesCategory = selectedCategory === "all" || post.category === selectedCategory;
    const matchesSearch = 
      searchQuery.trim() === "" ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleLike = (postId: string) => {
    setLikedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handleAddComment = (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const name = newCommentName.trim() || "Aramıza Katılan Misafir";
    const newEntry = {
      author: name,
      text: newCommentText.trim(),
      time: "Az önce"
    };

    setComments(prev => ({
      ...prev,
      [postId]: [newEntry, ...(prev[postId] || [])]
    }));

    setNewCommentText("");
    setCommentAdded(true);
    setTimeout(() => setCommentAdded(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8 animate-fade-in" id="blog-page-container">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={selectedPost ? () => setSelectedPost(null) : onNavigateHome}
              className="p-2.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all cursor-pointer flex items-center justify-center shadow-sm"
              title="Geri Dön"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                  Resmi Yayın Organı
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                İnanResim Blog & Duyurular
              </h1>
            </div>
          </div>

          <button
            onClick={onNavigateHome}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>Hemen Resim Yükle</span>
          </button>
        </div>

        {/* SINGLE ARTICLE READER MODE */}
        {selectedPost ? (
          <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            {/* Post Banner Image */}
            <div className="relative rounded-3xl overflow-hidden aspect-video sm:aspect-[21/9] shadow-2xl border border-slate-200 dark:border-slate-800">
              <img 
                src={selectedPost.imageUrl} 
                alt={selectedPost.title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
              
              <div className="absolute bottom-6 left-6 right-6 space-y-3">
                <span className="px-3 py-1 bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg inline-block">
                  {selectedPost.categoryLabel}
                </span>
                <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
                  {selectedPost.title}
                </h2>
                
                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-300 pt-1">
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-blue-400" />
                    {selectedPost.author}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    {selectedPost.date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    {selectedPost.readTime}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-purple-400" />
                    {selectedPost.views + (likedPosts[selectedPost.id] ? 1 : 0)} Okunma
                  </span>
                </div>
              </div>
            </div>

            {/* Post Main Body Content */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-lg space-y-6">
              <p className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-200 leading-relaxed border-l-4 border-blue-500 pl-4 py-1 bg-blue-50/50 dark:bg-blue-950/20 rounded-r-xl">
                {selectedPost.summary}
              </p>

              <div className="space-y-4 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                {selectedPost.content.map((paragraph, idx) => (
                  <p key={idx} className="whitespace-pre-line">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Tags & Interaction Controls */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag className="w-4 h-4 text-slate-400 mr-1" />
                  {selectedPost.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-lg">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleLike(selectedPost.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                      likedPosts[selectedPost.id]
                        ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>{selectedPost.likes + (likedPosts[selectedPost.id] ? 1 : 0)} Beğeni</span>
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href);
                      alert("Yazı bağlantısı kopyalandı!");
                    }}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Paylaş</span>
                  </button>
                </div>
              </div>
            </div>

            {/* VIP CTA Banner */}
            <div className="p-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-3xl text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-black text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  Siz de PRO VIP Ayrıcalıklarını Keşfedin!
                </h4>
                <p className="text-xs text-purple-100 mt-1">
                  5 GB tek seferlik dosya yükleme, özel filigran motoru ve süresiz kalıcı saklama.
                </p>
              </div>
              {onOpenVipModal && (
                <button
                  onClick={onOpenVipModal}
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer shrink-0"
                >
                  PRO VIP Paketleri İncele
                </button>
              )}
            </div>

            {/* COMMENTS SECTION */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                Yorumlar ({comments[selectedPost.id]?.length || 0})
              </h3>

              {/* Add Comment Form */}
              <form onSubmit={(e) => handleAddComment(selectedPost.id, e)} className="space-y-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                {commentAdded && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Yorumunuz başarıyla yayınlandı!</span>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Adınız (Opsiyonel)"
                    value={newCommentName}
                    onChange={(e) => setNewCommentName(e.target.value)}
                    className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <textarea
                  rows={3}
                  required
                  placeholder="Yazı hakkındaki düşüncelerinizi paylaşın..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                ></textarea>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Yorum Yap</span>
                  </button>
                </div>
              </form>

              {/* Existing Comments List */}
              <div className="space-y-3">
                {(comments[selectedPost.id] || []).map((c, idx) => (
                  <div key={idx} className="p-4 bg-slate-50/80 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-500" />
                        {c.author}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">{c.time}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                      {c.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* BLOG LIST VIEW */
          <div className="space-y-8">
            
            {/* Search & Category Filter Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              {/* Category Pills */}
              <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                {[
                  { id: "all", label: "Tüm Yazılar" },
                  { id: "guncelleme", label: "Sistem Güncellemeleri" },
                  { id: "rehber", label: "Rehberler & İpuçları" },
                  { id: "guvenlik", label: "Güvenlik & Gizlilik" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72 shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Blogda ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Featured Main Article Card */}
            {filteredPosts.length > 0 && selectedCategory === "all" && !searchQuery && (
              <div 
                onClick={() => setSelectedPost(posts[0])}
                className="group relative bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer grid grid-cols-1 lg:grid-cols-12"
              >
                <div className="lg:col-span-7 relative h-64 lg:h-auto overflow-hidden">
                  <img 
                    src={posts[0].imageUrl} 
                    alt={posts[0].title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-blue-600 text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow-lg flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Öne Çıkan
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <span className="text-[11px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                      {posts[0].categoryLabel}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                      {posts[0].title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {posts[0].summary}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-400">
                    <div className="flex items-center gap-3">
                      <span>{posts[0].date}</span>
                      <span>•</span>
                      <span>{posts[0].readTime}</span>
                    </div>
                    <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1 font-black group-hover:translate-x-1 transition-transform">
                      Yazıyı Oku <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Posts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="group bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Thumbnail */}
                    <div className="relative aspect-video overflow-hidden">
                      <img 
                        src={post.imageUrl} 
                        alt={post.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-3 left-3 px-2.5 py-1 bg-slate-950/80 backdrop-blur-md text-white font-black text-[10px] uppercase tracking-wider rounded-lg border border-white/10">
                        {post.categoryLabel}
                      </span>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 space-y-2.5">
                      <h3 className="font-black text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {post.summary}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-5 pt-0 flex items-center justify-between text-[11px] font-bold text-slate-400 border-t border-slate-100 dark:border-slate-800/80 mt-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{post.date}</span>
                    </div>
                    <span className="text-blue-600 dark:text-blue-400 font-extrabold flex items-center gap-1">
                      Devamını Oku <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {filteredPosts.length === 0 && (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="font-black text-base text-slate-800 dark:text-slate-200">Aramanıza Uygun Yazı Bulunamadı</h3>
                <p className="text-xs text-slate-500">Farklı anahtar kelimeler aramayı veya filtreleri değiştirmeyi deneyebilirsiniz.</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Tüm Yazıları Göster
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
