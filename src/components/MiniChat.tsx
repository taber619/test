import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, ChevronDown, ChevronUp, AlertCircle, ShieldAlert, Clock } from "lucide-react";

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !isJoined) return;

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
      text: text.trim(),
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
      setText("");
      setError(null);
      setLastSentTime(now);
      setMessages((prev) => [...prev, data]);
    } catch (err) {
      setError("Bağlantı hatası. Mesaj gönderilemedi.");
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans" id="mini-chat-wrapper">
      {/* Chat Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3.5 rounded-full shadow-xl hover:scale-105 transition-transform font-bold text-sm cursor-pointer"
          id="chat-toggle-btn"
        >
          <MessageCircle className="w-5 h-5 animate-pulse" />
          <span>Mini Sohbet</span>
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        </button>
      )}

      {/* Expanded Chat Box */}
      {isOpen && (
        <div
          className="w-80 sm:w-96 h-[480px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-colors"
          id="chat-box-container"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <span className="font-extrabold text-sm tracking-tight">Mini Sohbet Odası</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Join Form / Message List Screen */}
          {!isJoined ? (
            <div className="flex-grow p-6 flex flex-col justify-center items-center text-center bg-slate-50 dark:bg-slate-900/50">
              <MessageCircle className="w-12 h-12 text-blue-500 mb-3 opacity-80" />
              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Sohbete Katılın</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 max-w-[240px]">
                Diğer kullanıcılarla gerçek zamanlı sohbet etmek için bir rumuz (nickname) girin.
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
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Sohbete Başla
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Message Feed List */}
              <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/20">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-60 py-10">
                    <MessageCircle className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-xs text-slate-400 font-medium">Henüz mesaj yazılmamış.</p>
                    <p className="text-[10px] text-slate-400">İlk mesajı sen gönder!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const timeStr = new Date(msg.createdAt).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <div key={msg.id} className="flex flex-col items-start bg-white dark:bg-slate-950/40 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-sm max-w-[90%] break-all">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[11px] font-black text-indigo-600 dark:text-blue-400">
                            {msg.username}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium">
                            {timeStr}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                          {msg.text}
                        </p>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

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
              <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Mesajınızı buraya yazın..."
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (error) setError(null);
                  }}
                  className="flex-grow px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shrink-0 flex items-center justify-center cursor-pointer"
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
