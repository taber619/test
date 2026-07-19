import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, ChevronDown, ChevronUp, AlertCircle, Clock, Image as ImageIcon, Sparkles } from "lucide-react";

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  createdAt: number;
}

export default function MiniChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [username, setUsername] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warningCount, setWarningCount] = useState(0);
  const [slowMode, setSlowMode] = useState(false);
  const [lastSentTime, setLastSentTime] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generate or load persistent guest info or use logged-in user
  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("hizli_resim_user");
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setUsername(u.username);
        setIsJoined(true);
      } catch (e) {}
    } else {
      // Check for guest username
      const guestNick = localStorage.getItem("inanresim_guest_nick");
      if (guestNick) {
        setUsername(guestNick);
        setIsJoined(true);
      }
    }

    // Generate guest userId if not exists
    let guestId = localStorage.getItem("inanresim_guest_id");
    if (!guestId) {
      guestId = "guest_" + Math.random().toString(36).substring(2, 12);
      localStorage.setItem("inanresim_guest_id", guestId);
    }
  }, []);

  // Fetch messages and slowmode status
  const fetchMessages = () => {
    fetch("/api/chat/messages")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(data);
        }
      })
      .catch((err) => console.log("Fetch chat error", err));

    fetch("/api/chat/slowmode")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.slowMode !== undefined) {
          setSlowMode(data.slowMode);
        }
      })
      .catch((err) => console.log("Fetch slowmode error", err));
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    const cleanNick = username.trim().substring(0, 20);
    setUsername(cleanNick);
    localStorage.setItem("inanresim_guest_nick", cleanNick);
    setIsJoined(true);
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || !isJoined) return;

    const now = Date.now();
    // Front-end slowmode enforcement check
    if (slowMode && now - lastSentTime < 3000) {
      setError("Yavaş mod aktif! Lütfen 3 saniye bekleyin.");
      return;
    }

    // Determine current user details
    let userId = "";
    const storedUser = localStorage.getItem("hizli_resim_user");
    if (storedUser) {
      try {
        userId = JSON.parse(storedUser).id;
      } catch (e) {}
    }
    if (!userId) {
      userId = localStorage.getItem("inanresim_guest_id") || "guest_unknown";
    }

    const payload = {
      userId,
      username,
      text: messageText.trim(),
    };

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Mesaj gönderilemedi.");
        if (data.warningCount !== undefined) {
          setWarningCount(data.warningCount);
        }
        return;
      }

      // Success
      setError(null);
      setLastSentTime(now);
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    } catch (err) {
      setError("Bağlantı hatası. Mesaj gönderilemedi.");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentText = text;
    if (!currentText.trim()) return;
    setText("");
    await sendMessage(currentText);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("Görsel boyutu 10 MB sınırını aşamaz.");
      return;
    }

    setUploadingImage(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      if (!base64Data) {
        setUploadingImage(false);
        setError("Görsel dosyası okunamadı.");
        return;
      }

      let userId = "";
      const storedUser = localStorage.getItem("hizli_resim_user");
      if (storedUser) {
        try {
          userId = JSON.parse(storedUser).id;
        } catch (e) {}
      }
      if (!userId) {
        userId = localStorage.getItem("inanresim_guest_id") || "guest_unknown";
      }

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            mimeType: file.type,
            size: file.size,
            data: base64Data,
            deleteAfter: "never",
            userId: userId,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Görsel sunucuya yüklenemedi.");
          setUploadingImage(false);
          return;
        }

        // Send actual link to chat
        const imgPath = `/api/images/${data.id}`;
        await sendMessage(`[Görsel] ${imgPath}`);
      } catch (err) {
        setError("Bağlantı hatası. Görsel paylaşılamadı.");
      } finally {
        setUploadingImage(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans" id="mini-chat-wrapper">
      {/* Chat Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white px-5 py-3.5 rounded-full shadow-2xl hover:scale-105 hover:shadow-indigo-500/20 active:scale-95 transition-all duration-300 font-bold text-sm cursor-pointer border border-white/10"
          id="chat-toggle-btn"
        >
          <MessageCircle className="w-5 h-5 animate-pulse" />
          <span>Mini Sohbet Odası</span>
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        </button>
      )}

      {/* Expanded Chat Box */}
      {isOpen && (
        <div
          className="w-80 sm:w-96 h-[520px] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-fade-in"
          id="chat-box-container"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white py-3.5 px-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin-slow" />
              <span className="font-extrabold text-sm tracking-tight">Canlı Sohbet & Paylaşım</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-1 hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Join Form / Message List Screen */}
          {!isJoined ? (
            <div className="flex-grow p-6 flex flex-col justify-center items-center text-center bg-slate-50 dark:bg-slate-900/50">
              <MessageCircle className="w-12 h-12 text-indigo-500 mb-3 opacity-80" />
              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Sohbete Katılın</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 max-w-[240px]">
                Diğer kullanıcılarla gerçek zamanlı sohbet etmek ve anlık resim paylaşmak için bir rumuz girin.
              </p>
              <form onSubmit={handleJoin} className="w-full max-w-[240px] flex flex-col gap-2">
                <input
                  type="text"
                  required
                  maxLength={20}
                  placeholder="Rumuz girin..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer shadow-md shadow-indigo-200 dark:shadow-none"
                >
                  Sohbete Başla
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Message Feed List */}
              <div className="flex-grow overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-900/20">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-60 py-10">
                    <MessageCircle className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-xs text-slate-400 font-semibold">Henüz mesaj yazılmamış.</p>
                    <p className="text-[10px] text-slate-400">İlk mesajı ve resmi sen gönder!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.username === username;
                    const timeStr = new Date(msg.createdAt).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    // Parse image patterns
                    const hasImage = msg.text.includes("/api/images/");
                    let imageUrl = "";
                    let remainingText = msg.text;

                    if (hasImage) {
                      const match = msg.text.match(/\/api\/images\/[a-zA-Z0-9]+/);
                      if (match) {
                        imageUrl = match[0];
                        remainingText = msg.text
                          .replace(/\[Görsel\]\s*/i, "")
                          .replace(/\/api\/images\/[a-zA-Z0-9]+/, "")
                          .trim();
                      }
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[85%] animate-fade-in ${
                          isMe ? "ml-auto items-end" : "mr-auto items-start"
                        }`}
                      >
                        {/* Name and time */}
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span
                            className={`text-[10px] font-black ${
                              isMe ? "text-blue-600 dark:text-blue-400" : "text-indigo-600 dark:text-indigo-400"
                            }`}
                          >
                            {msg.username}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium tabular-nums">
                            {timeStr}
                          </span>
                        </div>

                        {/* Bubble */}
                        <div
                          className={`p-2.5 rounded-2xl shadow-sm border ${
                            isMe
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none border-blue-500/10"
                              : "bg-white dark:bg-slate-950/60 text-slate-800 dark:text-slate-100 rounded-tl-none border-slate-200/50 dark:border-slate-800/80"
                          } break-all`}
                        >
                          {imageUrl ? (
                            <div className="rounded-xl overflow-hidden bg-slate-100/10 max-w-full">
                              <a
                                href={imageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block relative group cursor-zoom-in"
                              >
                                <img
                                  src={imageUrl}
                                  alt="Sohbette Paylaşılan Görsel"
                                  className="max-h-36 object-cover w-full rounded-lg transition-transform duration-300 group-hover:scale-102 border border-black/10 dark:border-white/10"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-black uppercase tracking-widest rounded-lg">
                                  Tam Boyut Gör 🔍
                                </div>
                              </a>
                              {remainingText && (
                                <p className={`mt-2 text-xs font-semibold leading-relaxed ${isMe ? "text-white" : "text-slate-700 dark:text-slate-200"}`}>
                                  {remainingText}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className={`text-xs font-semibold leading-relaxed ${isMe ? "text-white" : "text-slate-700 dark:text-slate-200"}`}>
                              {msg.text}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Uploading Image Status Overlay */}
              {uploadingImage && (
                <div className="bg-blue-50/80 dark:bg-blue-950/20 border-t border-blue-100 dark:border-blue-950/30 py-2 px-4 flex items-center justify-between gap-2 animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400">Görsel yükleniyor ve paylaşılıyor...</span>
                  </div>
                </div>
              )}

              {/* Status and Error Alerts */}
              {error && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border-t border-rose-100 dark:border-rose-950/30 py-2 px-4 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-[10px] font-black text-rose-700 dark:text-rose-400">
                    {error}
                  </div>
                </div>
              )}

              {slowMode && (
                <div className="bg-amber-50 dark:bg-amber-950/10 border-t border-amber-100 dark:border-amber-950/20 py-1.5 px-4 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[10px] font-medium text-amber-800 dark:text-amber-400">
                    3 saniye yavaş mod aktif.
                  </span>
                </div>
              )}

              {/* Input Area Form */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white dark:bg-slate-900 border-t border-slate-150 dark:border-slate-800/80 flex items-center gap-2"
              >
                {/* File input selector button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-all shrink-0 flex items-center justify-center cursor-pointer border border-slate-200/40 dark:border-slate-700/40"
                  title="Anlık Görsel Paylaş"
                  disabled={uploadingImage}
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />

                <input
                  type="text"
                  required={!uploadingImage}
                  placeholder="Mesajınızı yazın..."
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (error) setError(null);
                  }}
                  className="flex-grow px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/80"
                />

                <button
                  type="submit"
                  disabled={uploadingImage || !text.trim()}
                  className="p-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white rounded-xl transition-all shrink-0 flex items-center justify-center cursor-pointer shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
