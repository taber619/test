import React, { useState, useEffect, useRef } from "react";
import { 
  MessageCircle, 
  Send, 
  ChevronDown, 
  AlertCircle, 
  Clock, 
  Image as ImageIcon, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Dices, 
  Video, 
  Smile, 
  User, 
  Check, 
  Maximize2,
  Minimize2,
  Search,
  Copy,
  MessageSquare,
  Users,
  Activity,
  Flame,
  Coins,
  HelpCircle,
  Sparkle,
  Volume1,
  X,
  RefreshCw,
  Shield,
  Ban,
  ShieldCheck,
  Lock,
  Unlock,
  Trash2,
  Mail,
  Award,
  Trophy,
  Zap,
  Star,
  UserPlus,
  Pin,
  PinOff,
  BarChart2,
  Vote,
  CheckCircle2,
  Plus
} from "lucide-react";

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  createdAt: number;
  isMod?: boolean;
  isAdmin?: boolean;
}

interface PinnedMessage {
  id?: string;
  text: string;
  pinnedBy: string;
  createdAt: number;
}

interface PollOption {
  id: string;
  text: string;
  votes: string[];
}

interface ChatPoll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  createdById: string;
  createdAt: number;
  isActive: boolean;
}

interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  text: string;
  createdAt: number;
}

interface UserProfileData {
  userId: string;
  username: string;
  xp: number;
  level: number;
  messageCount: number;
  gameCount: number;
  badges: string[];
}

export default function MiniChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [username, setUsername] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warningCount, setWarningCount] = useState(0);
  const [slowMode, setSlowMode] = useState(false);
  const [lastSentTime, setLastSentTime] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundType, setSoundType] = useState<"beep" | "pop">("pop"); // Sound options!

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showEmojiHelper, setShowEmojiHelper] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Moderator & Blocking State Variables
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return typeof window !== "undefined" && localStorage.getItem("inanresim_admin_token") === "true";
  });
  const [isModerator, setIsModerator] = useState(false);
  const canModerate = isModerator || isAdmin;
  const [showModLogin, setShowModLogin] = useState(false);
  const [modPassword, setModPassword] = useState("");
  const [modLoginError, setModLoginError] = useState<string | null>(null);
  const [selectedUserToBlock, setSelectedUserToBlock] = useState<{ userId: string; username: string } | null>(null);
  const [blockDuration, setBlockDuration] = useState("5"); // default 5 minutes
  const [blockLoading, setBlockLoading] = useState(false);

  // Auto-hide 5-second chat cleared notice state & ref
  const [chatClearedNotice, setChatClearedNotice] = useState<string | null>(null);
  const clearNoticeTimerRef = useRef<any>(null);
  const prevMessagesLengthRef = useRef<number>(0);

  const triggerChatClearedNotice = (msgText = "🧹 Tüm sohbet geçmişi yetkili tarafından temizlendi.") => {
    setChatClearedNotice(msgText);
    if (clearNoticeTimerRef.current) {
      clearTimeout(clearNoticeTimerRef.current);
    }
    clearNoticeTimerRef.current = setTimeout(() => {
      setChatClearedNotice(null);
    }, 5000); // Automatically clears info text after 5 seconds
  };

  // DM (Direct Messages) & Level/XP States
  const [activeChatTab, setActiveChatTab] = useState<"public" | "dm">("public");
  const [dmConversations, setDmConversations] = useState<
    { targetId: string; targetName: string; lastMessage: string; lastTime: number }[]
  >([]);
  const [activeDMTarget, setActiveDMTarget] = useState<{ id: string; name: string } | null>(null);
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [dmText, setDmText] = useState("");
  const [sendingDm, setSendingDm] = useState(false);

  // User Profile Card & XP / Badges
  const [userProfileModal, setUserProfileModal] = useState<UserProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [myProfile, setMyProfile] = useState<UserProfileData | null>(null);

  // Pinned Message States
  const [pinnedMessage, setPinnedMessage] = useState<PinnedMessage | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [customPinText, setCustomPinText] = useState("");
  const [pinningLoading, setPinningLoading] = useState(false);

  // Poll States
  const [activePoll, setActivePoll] = useState<ChatPoll | null>(null);
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptionsInput, setPollOptionsInput] = useState<string[]>(["", ""]);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [votingOptionId, setVotingOptionId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load guest details or user details
  useEffect(() => {
    const storedUser = localStorage.getItem("hizli_resim_user");
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setUsername(u.username);
        setIsJoined(true);
      } catch (e) {}
    } else {
      const guestNick = localStorage.getItem("inanresim_guest_nick");
      if (guestNick) {
        setUsername(guestNick);
        setIsJoined(true);
      }
    }

    let guestId = localStorage.getItem("inanresim_guest_id");
    if (!guestId) {
      guestId = "guest_" + Math.random().toString(36).substring(2, 12);
      localStorage.setItem("inanresim_guest_id", guestId);
    }

    // Restore moderator session
    const isModSession = localStorage.getItem("chat_moderator_session") === "true";
    if (isModSession) {
      setIsModerator(true);
    }
  }, []);

  // Sync Admin & Moderator status from localStorage dynamically
  useEffect(() => {
    const checkAdminState = () => {
      if (typeof window === "undefined") return;
      const isAd = localStorage.getItem("inanresim_admin_token") === "true";
      const isModSession = localStorage.getItem("chat_moderator_session") === "true";
      
      setIsAdmin(isAd);
      setIsModerator(isModSession);
    };
    checkAdminState();
    window.addEventListener("storage", checkAdminState);
    const interval = setInterval(checkAdminState, 1000);
    return () => {
      window.removeEventListener("storage", checkAdminState);
      clearInterval(interval);
    };
  }, []);

  // Fetch messages and slowmode status
  const fetchMessages = () => {
    fetch("/api/chat/messages")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Play notification sound if new message arrives and chat is open
          if (soundEnabled && messages.length > 0 && data.length > messages.length) {
            const lastNewMessage = data[data.length - 1];
            const savedUser = localStorage.getItem("hizli_resim_user");
            let myUsername = username;
            if (savedUser) {
              try { myUsername = JSON.parse(savedUser).username; } catch(e){}
            }
            if (lastNewMessage.username !== myUsername) {
              playSoundNotification();
            }
          }

          // Detect if chat was cleared remotely
          if (prevMessagesLengthRef.current > 0 && data.length === 0) {
            triggerChatClearedNotice("🧹 Tüm sohbet geçmişi yetkili tarafından başarıyla temizlendi.");
          }
          prevMessagesLengthRef.current = data.length;

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

  const fetchPinnedMessage = () => {
    fetch("/api/chat/pinned")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.pinnedMessage !== undefined) {
          setPinnedMessage(data.pinnedMessage);
        }
      })
      .catch(() => {});
  };

  const fetchActivePoll = () => {
    fetch("/api/chat/poll/active")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.poll !== undefined) {
          setActivePoll(data.poll);
        }
      })
      .catch(() => {});
  };

  const handlePinMessage = async (msgText: string) => {
    if (!canModerate) return;
    setPinningLoading(true);
    try {
      const res = await fetch("/api/chat/pinned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: msgText,
          pinnedBy: username || "Moderatör"
        })
      });
      const data = await res.json();
      if (data.success) {
        setPinnedMessage(data.pinnedMessage);
        setShowPinModal(false);
        setCustomPinText("");
      }
    } catch (e) {
      console.error("Pin error", e);
    } finally {
      setPinningLoading(false);
    }
  };

  const handleUnpinMessage = async () => {
    if (!canModerate) return;
    try {
      const res = await fetch("/api/chat/pinned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unpin: true, pinnedBy: username })
      });
      const data = await res.json();
      if (data.success) {
        setPinnedMessage(null);
      }
    } catch (e) {}
  };

  const handleCreatePoll = async () => {
    if (!canModerate) return;
    if (!pollQuestion.trim()) return;
    const validOpts = pollOptionsInput.map(o => o.trim()).filter(Boolean);
    if (validOpts.length < 2) return;

    setCreatingPoll(true);
    let myId = localStorage.getItem("inanresim_guest_id") || "";
    const storedUser = localStorage.getItem("hizli_resim_user");
    if (storedUser) {
      try { myId = JSON.parse(storedUser).id || myId; } catch (e) {}
    }

    try {
      const res = await fetch("/api/chat/poll/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: pollQuestion,
          options: validOpts,
          createdBy: username || "Kullanıcı",
          createdById: myId
        })
      });
      const data = await res.json();
      if (data.success) {
        setActivePoll(data.poll);
        setShowCreatePollModal(false);
        setPollQuestion("");
        setPollOptionsInput(["", ""]);
        fetchMessages();
      }
    } catch (e) {
      console.error("Create poll error", e);
    } finally {
      setCreatingPoll(false);
    }
  };

  const handleVotePoll = async (pollId: string, optionId: string) => {
    let myId = localStorage.getItem("inanresim_guest_id") || "";
    const storedUser = localStorage.getItem("hizli_resim_user");
    if (storedUser) {
      try { myId = JSON.parse(storedUser).id || myId; } catch (e) {}
    }
    if (!myId) return;

    setVotingOptionId(optionId);
    try {
      const res = await fetch("/api/chat/poll/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, optionId, userId: myId })
      });
      const data = await res.json();
      if (data.success) {
        setActivePoll(data.poll);
      }
    } catch (e) {
      console.error("Vote poll error", e);
    } finally {
      setVotingOptionId(null);
    }
  };

  const handleClosePoll = async (pollId: string) => {
    try {
      await fetch("/api/chat/poll/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId })
      });
      setActivePoll(null);
    } catch (e) {}
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      fetchMyProfile();
      fetchPinnedMessage();
      fetchActivePoll();
      if (activeChatTab === "dm") {
        fetchDMConversations();
        if (activeDMTarget) {
          fetchDMMessages(activeDMTarget.id);
        }
      }
      const interval = setInterval(() => {
        fetchMessages();
        fetchPinnedMessage();
        fetchActivePoll();
        if (activeChatTab === "dm") {
          fetchDMConversations();
          if (activeDMTarget) {
            fetchDMMessages(activeDMTarget.id);
          }
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, activeChatTab, activeDMTarget?.id, messages.length]);

  // Fetch DM Conversations
  const fetchDMConversations = () => {
    let myId = localStorage.getItem("inanresim_guest_id") || "";
    const storedUser = localStorage.getItem("hizli_resim_user");
    if (storedUser) {
      try { myId = JSON.parse(storedUser).id || myId; } catch (e) {}
    }
    if (!myId) return;

    fetch(`/api/chat/dm/conversations?userId=${encodeURIComponent(myId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDmConversations(data);
        }
      })
      .catch(() => {});
  };

  // Fetch DM Messages
  const fetchDMMessages = (targetId: string) => {
    let myId = localStorage.getItem("inanresim_guest_id") || "";
    const storedUser = localStorage.getItem("hizli_resim_user");
    if (storedUser) {
      try { myId = JSON.parse(storedUser).id || myId; } catch (e) {}
    }
    if (!myId || !targetId) return;

    fetch(`/api/chat/dm/messages?userId=${encodeURIComponent(myId)}&targetId=${encodeURIComponent(targetId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          if (soundEnabled && dmMessages.length > 0 && data.length > dmMessages.length) {
            playSoundNotification();
          }
          setDmMessages(data);
        }
      })
      .catch(() => {});
  };

  // Fetch My XP Profile
  const fetchMyProfile = () => {
    let myId = localStorage.getItem("inanresim_guest_id") || "";
    const storedUser = localStorage.getItem("hizli_resim_user");
    if (storedUser) {
      try { myId = JSON.parse(storedUser).id || myId; } catch (e) {}
    }
    if (!myId) return;

    fetch(`/api/chat/profile/${encodeURIComponent(myId)}?username=${encodeURIComponent(username)}&isMod=${isModerator}&isAdmin=${isAdmin}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.level) {
          setMyProfile(data);
        }
      })
      .catch(() => {});
  };

  // Send Direct Message (DM)
  const handleSendDM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDMTarget || !dmText.trim() || sendingDm) return;

    let myId = localStorage.getItem("inanresim_guest_id") || "guest_unknown";
    const storedUser = localStorage.getItem("hizli_resim_user");
    if (storedUser) {
      try { myId = JSON.parse(storedUser).id || myId; } catch (e) {}
    }

    setSendingDm(true);
    try {
      const res = await fetch("/api/chat/dm/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: myId,
          senderName: username || "Kullanıcı",
          receiverId: activeDMTarget.id,
          receiverName: activeDMTarget.name,
          text: dmText.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDmMessages((prev) => [...prev, data]);
        setDmText("");
        fetchDMConversations();
        fetchMyProfile();
      } else {
        setError(data.error || "Özel mesaj gönderilemedi.");
      }
    } catch (err) {
      setError("Bağlantı hatası.");
    } finally {
      setSendingDm(false);
    }
  };

  // Open User Profile Card
  const openUserProfile = async (uId: string, uName: string) => {
    setLoadingProfile(true);
    setUserProfileModal({
      userId: uId,
      username: uName,
      xp: 0,
      level: 1,
      messageCount: 0,
      gameCount: 0,
      badges: [],
    });
    try {
      let myId = localStorage.getItem("inanresim_guest_id") || "guest_unknown";
      const storedUser = localStorage.getItem("hizli_resim_user");
      if (storedUser) {
        try { myId = JSON.parse(storedUser).id || myId; } catch (e) {}
      }
      const isTargetMe = uId === myId;
      const targetIsAdmin = isTargetMe ? isAdmin : false;
      const targetIsMod = isTargetMe ? isModerator : false;

      const res = await fetch(`/api/chat/profile/${encodeURIComponent(uId)}?username=${encodeURIComponent(uName)}&isMod=${targetIsMod}&isAdmin=${targetIsAdmin}`);
      const data = await res.json();
      if (res.ok) {
        setUserProfileModal(data);
      }
    } catch (e) {
    } finally {
      setLoadingProfile(false);
    }
  };

  // Start DM with User
  const startDMWithUser = (uId: string, uName: string) => {
    setActiveDMTarget({ id: uId, name: uName });
    setActiveChatTab("dm");
    setUserProfileModal(null);
    fetchDMMessages(uId);
  };

  // Mini Game XP Grant
  const handleMiniGameXP = () => {
    let myId = localStorage.getItem("inanresim_guest_id") || "guest_unknown";
    const storedUser = localStorage.getItem("hizli_resim_user");
    if (storedUser) {
      try { myId = JSON.parse(storedUser).id || myId; } catch (e) {}
    }
    fetch("/api/chat/xp/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: myId, username }),
    })
      .then((res) => res.json())
      .then(() => fetchMyProfile())
      .catch(() => {});
  };

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Premium Audio Sound Notifications
  const playSoundNotification = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (soundType === "pop") {
        // Modern soft pop sound
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else {
        // Classic game beep
        osc.type = "sine";
        osc.frequency.setValueAtTime(580, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {}
  };

  // Generate Deterministic Avatar Colors based on Username
  const getAvatarColor = (name: string) => {
    const colors = [
      "from-rose-500 to-pink-600 shadow-rose-500/20 text-white",
      "from-orange-500 to-amber-600 shadow-orange-500/20 text-white",
      "from-emerald-500 to-teal-600 shadow-emerald-500/20 text-white",
      "from-blue-500 to-indigo-600 shadow-blue-500/20 text-white",
      "from-violet-500 to-purple-600 shadow-violet-500/20 text-white",
      "from-fuchsia-500 to-pink-600 shadow-fuchsia-500/20 text-white",
      "from-cyan-500 to-blue-600 shadow-cyan-500/20 text-white",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/[\s_]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase().substring(0, 2);
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Generate Fun Random Guest Nicknames
  const generateRandomNick = () => {
    const prefixes = ["Hızlı", "Uçan", "Gizemli", "Sessiz", "Parlak", "Cesur", "Deli", "Akıllı", "Sakin", "Efsanevi", "Zeki", "Pofuduk", "Mutlu", "Süper", "Karizmatik", "Zarif", "Asil", "Çılgın"];
    const suffixes = ["Kedi", "Şahin", "Kaplan", "Bulut", "Gözcü", "Savaşçı", "Rüzgar", "Kurt", "Yıldız", "Gezgin", "Gölge", "Aslan", "Korsan", "Tavşan", "Kartal", "Ejderha", "KutupAyısı"];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const randomNumber = Math.floor(Math.random() * 90) + 10; // 10 to 99
    
    const nick = `${randomPrefix}${randomSuffix}${randomNumber}`;
    setUsername(nick);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    const cleanNick = username.trim().substring(0, 20);
    setUsername(cleanNick);
    localStorage.setItem("inanresim_guest_nick", cleanNick);
    setIsJoined(true);
    playSoundNotification();
  };

  // Moderator Auth Submission
  const handleModLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setModLoginError(null);
    try {
      const res = await fetch("/api/mod/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: modPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsModerator(true);
        setShowModLogin(false);
        setModPassword("");
        localStorage.setItem("chat_moderator_session", "true");
        playSoundNotification();
      } else {
        setModLoginError(data.error || "Geçersiz moderatör / özel üye şifresi!");
      }
    } catch (err) {
      setModLoginError("Bağlantı hatası oluştu.");
    }
  };

  // Moderator / Admin Logout
  const handleModLogout = () => {
    setIsModerator(false);
    setIsAdmin(false);
    localStorage.removeItem("chat_moderator_session");
    localStorage.removeItem("inanresim_admin_token");
    localStorage.removeItem("inanresim_admin_visible");
    window.dispatchEvent(new Event("storage"));
    playSoundNotification();
  };

  // Block/Ban User Call
  const handleBlockUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToBlock) return;
    setBlockLoading(true);
    setError(null);

    const { userId, username: blockUsername } = selectedUserToBlock;

    try {
      let res;
      if (blockDuration === "permanent") {
        // Permanent Ban
        res = await fetch("/api/admin/chat/ban", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, username: blockUsername }),
        });
      } else {
        // Temporary Mute
        res = await fetch("/api/admin/chat/mute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            userId, 
            username: blockUsername, 
            durationMinutes: parseInt(blockDuration, 10) 
          }),
        });
      }

      const data = await res.json();
      if (res.ok) {
        // Success
        setSelectedUserToBlock(null);
        // Add visual feedback
        setError(`Başarılı: @${blockUsername} adlı kullanıcı ${blockDuration === "permanent" ? "kalıcı olarak yasaklandı" : `${blockDuration} dakika engellendi`}.`);
        fetchMessages();
      } else {
        setError(data.error || "Engelleme işlemi başarısız oldu.");
      }
    } catch (err) {
      setError("Bağlantı hatası nedeniyle engelleme yapılamadı.");
    } finally {
      setBlockLoading(false);
    }
  };

  // Delete Single Message Call
  const handleDeleteSingleMessage = async (msgId: string) => {
    try {
      const res = await fetch("/api/admin/chat/delete-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msgId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
        setError("Mesaj silindi.");
        setTimeout(() => setError(null), 3000);
      } else {
        setError(data.error || "Mesaj silinemedi.");
      }
    } catch (err) {
      setError("Bağlantı hatası.");
    }
  };

  // Delete All Messages Of A User Call
  const handleDeleteUserAllMessages = async (uId: string, uName: string) => {
    if (!uId) return;
    if (!window.confirm(`@${uName} adlı kullanıcının TÜM mesajlarını silmek istediğinizden emin misiniz?`)) return;
    try {
      const res = await fetch("/api/admin/chat/delete-user-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.userId !== uId));
        setSelectedUserToBlock(null);
        setError(`@${uName} adlı kullanıcının tüm mesajları temizlendi.`);
        setTimeout(() => setError(null), 3000);
      } else {
        setError(data.error || "Mesajlar silinemedi.");
      }
    } catch (err) {
      setError("Bağlantı hatası.");
    }
  };

  // Toggle Slowmode
  const handleToggleSlowmode = async () => {
    try {
      const nextMode = !slowMode;
      const res = await fetch("/api/admin/chat/slowmode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slowMode: nextMode }),
      });
      if (res.ok) {
        setSlowMode(nextMode);
        setError(`Yavaş mod ${nextMode ? "aktif edildi" : "pasif edildi"}.`);
        setTimeout(() => setError(null), 3000);
      }
    } catch (e) {}
  };

  // Clear All Chat Messages
  const handleClearAllChat = async () => {
    if (!window.confirm("TÜM sohbet geçmişini temizlemek istediğinizden emin misiniz?")) return;
    try {
      const res = await fetch("/api/admin/chat/clear", { method: "POST" });
      if (res.ok) {
        setMessages([]);
        prevMessagesLengthRef.current = 0;
        triggerChatClearedNotice("🧹 Tüm sohbet geçmişi yetkili tarafından başarıyla temizlendi.");
      } else {
        setError("Sohbet temizlenemedi.");
      }
    } catch (e) {
      setError("Bağlantı hatası oluştu.");
    }
  };

  // Extract active chatters from loaded messages (active in last 30 minutes)
  const getActiveChatters = () => {
    const uniqueUsers: { [username: string]: { lastSeen: number; id: string } } = {};
    const cutoff = Date.now() - 30 * 60 * 1000; // 30 minutes active
    
    messages.forEach((msg) => {
      if (msg.createdAt > cutoff) {
        uniqueUsers[msg.username] = {
          lastSeen: msg.createdAt,
          id: msg.userId
        };
      }
    });

    // Fallbacks to keep active sidebar interesting
    if (Object.keys(uniqueUsers).length < 2) {
      uniqueUsers["DestekRobotu"] = { lastSeen: Date.now(), id: "support" };
      uniqueUsers["SistemOdaGözcüsü"] = { lastSeen: Date.now(), id: "moderator" };
    }

    return Object.entries(uniqueUsers).map(([name, data]) => ({
      username: name,
      ...data
    })).sort((a, b) => b.lastSeen - a.lastSeen);
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || !isJoined) return;

    const now = Date.now();
    if (slowMode && now - lastSentTime < 3000) {
      setError("Yavaş mod aktif! Lütfen 3 saniye bekleyin.");
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

    const checkIsAdmin = typeof window !== "undefined" && (localStorage.getItem("inanresim_admin_token") === "true" || localStorage.getItem("inanresim_admin_visible") === "true");

    const payload = {
      userId,
      username,
      text: messageText.trim(),
      isMod: isModerator || checkIsAdmin || isAdmin,
      isAdmin: checkIsAdmin || isAdmin,
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

  // Fun Slash Commands & Games!
  const triggerSlashCommand = async (cmd: "zar" | "yazitura" | "fal" | "ask" | "saka") => {
    let resultText = "";
    if (cmd === "zar") {
      const diceValue1 = Math.floor(Math.random() * 6) + 1;
      const diceValue2 = Math.floor(Math.random() * 6) + 1;
      const emojis = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
      resultText = `🎲 [Zar Düellosu] Çift zar attım! Gelen zarlar: ${emojis[diceValue1 - 1]} ${diceValue1} ve ${emojis[diceValue2 - 1]} ${diceValue2} (Toplam: ${diceValue1 + diceValue2})`;
    } else if (cmd === "yazitura") {
      const coinSide = Math.random() < 0.5 ? "🪙 YAZI" : "🪙 TURA";
      resultText = `🪙 [Yazı-Tura] Madeni parayı havaya fırlattım... Havada 3 tur döndü ve yere düştü: ${coinSide} geldi!`;
    } else if (cmd === "fal") {
      const fortunes = [
        "🔮 Yakında harika bir görsel yükleyeceksin, beğeni rekoru kıracak!",
        "🔮 Şans kapını çalmak üzere! Bir dostundan hiç beklemediğin sürpriz bir mesaj alacaksın.",
        "🔮 Kalbinden geçen o büyük dilek, hiç tahmin etmediğin kadar hızlı gerçekleşecek.",
        "🔮 Bugün yaratıcılığın zirvede! Yeni tasarımlar veya fikirler üretmek için mükemmel bir gün.",
        "🔮 Kafandaki o kararsızlığı bir kenara bırak, ilk adımı atarsan kazanan sen olacaksın!",
        "🔮 Hayatında tatlı bir yolculuk gözüküyor, belki de yakın zamanda yeni bir şehri gezeceksin.",
        "🔮 Şanslı sayın: 7! Bugün gün boyunca karşına çıkacak fırsatları iyi değerlendir."
      ];
      resultText = fortunes[Math.floor(Math.random() * fortunes.length)];
    } else if (cmd === "ask") {
      const rate = Math.floor(Math.random() * 101);
      let comment = "Biraz daha çaba gerekiyor... 💔";
      if (rate >= 80) comment = "İnanılmaz! Ruh ikizisiniz! ❤️‍🔥🏆";
      else if (rate >= 50) comment = "Güzel bir elektrik var, zamanla artabilir! 💖";
      resultText = `❤️ [Aşk Ölçer] Bugünün sohbet odası aşk enerjisi analiz edildi: %${rate}! ${comment}`;
    } else if (cmd === "saka") {
      const jokes = [
        "😄 Bilgisayarım neden soğuk algınlığı oldu? Çünkü penceresi (Windows) açık kalmış!",
        "😄 Garsona 'Bana bir çay ver' dedim, 'Demli mi olsun?' dedi. 'Yok, Porselen olsun' dedim!",
        "😄 Neden yazılımcılar gözlük takar? Çünkü C#'ı göremiyorlar!",
        "😄 Bir adam varmış, ikinci adam gelememiş çünkü trafik varmış!",
        "😄 İnternet bağımlısı olan balığa ne denir? Ağ'a takılan balık!"
      ];
      resultText = jokes[Math.floor(Math.random() * jokes.length)];
    }

    playSoundNotification();
    await sendMessage(resultText);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const limit = file.type.startsWith("video/") ? 35 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > limit) {
      setError(`Seçilen dosya boyutu limitini aşmaktadır (${file.type.startsWith("video/") ? "35" : "15"} MB).`);
      return;
    }

    setUploadingMedia(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      if (!base64Data) {
        setUploadingMedia(false);
        setError("Dosya okunamadı.");
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
          setError(data.error || "Dosya sunucuya yüklenemedi.");
          setUploadingMedia(false);
          return;
        }

        const isVid = file.type.startsWith("video/");
        const imgPath = `/api/images/${data.id}`;
        await sendMessage(isVid ? `[Video] ${imgPath}` : `[Görsel] ${imgPath}`);
      } catch (err) {
        setError("Bağlantı hatası. Dosya paylaşılamadı.");
      } finally {
        setUploadingMedia(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  // Copy message to clipboard
  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Tag/Reply username helper
  const handleReplyUser = (userNick: string) => {
    setText((prev) => `@${userNick} ` + prev);
    setError(null);
  };

  // Filter messages based on search query
  const filteredMessages = messages.filter((msg) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      msg.text.toLowerCase().includes(query) ||
      msg.username.toLowerCase().includes(query)
    );
  });

  const popularEmojis = ["👍", "❤️", "😂", "🔥", "🚀", "😮", "🎉", "💯", "👏", "👀", "💎", "⭐"];
  const quickWords = ["Selam!", "Eline sağlık", "Çok iyi!", "Hayırlı olsun", "Harika!", "Test"];

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 font-sans transition-all duration-300 ${
        isMaximized && isOpen ? "inset-4 sm:inset-12 bottom-6 right-6 flex items-center justify-center pointer-events-none" : ""
      }`} 
      id="mini-chat-wrapper"
    >
      {/* Sleek Pulse Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            playSoundNotification();
          }}
          className="flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white px-5 py-3.5 rounded-full shadow-[0_8px_30px_rgb(79,70,229,0.35)] hover:shadow-[0_12px_40px_rgb(79,70,229,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 font-bold text-sm cursor-pointer border border-white/20 group"
          id="chat-toggle-btn"
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
          </div>
          <span>Mini Sohbet Odası</span>
        </button>
      )}

      {/* Expanded Chat Box (Supports standard and maximized sizing) */}
      {isOpen && (
        <div
          className={`relative bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-[0_20px_50px_rgba(79,70,229,0.22)] flex overflow-hidden transition-all duration-300 animate-fade-in pointer-events-auto ${
            isMaximized 
              ? "w-full h-full max-w-5xl max-h-[750px]" 
              : "w-80 sm:w-96 h-[560px]"
          }`}
          id="chat-box-container"
        >
          {/* Main Chat Column */}
          <div className="flex flex-col flex-grow h-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 text-white py-4 px-4 flex items-center justify-between shadow-md relative shrink-0">
              {/* Ambient subtle glow background */}
              <div className="absolute inset-0 bg-white/5 pointer-events-none"></div>
              
              <div className="flex items-center gap-2.5 z-10">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 shadow-sm">
                  <Sparkles className="w-4.5 h-4.5 text-yellow-300 animate-pulse" />
                </div>
                <div>
                  <span className="font-extrabold text-xs sm:text-sm tracking-tight block">Canlı Sohbet Odası</span>
                  <span className="flex items-center gap-1.5 text-[10px] text-indigo-200/90 font-bold">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Çevrimiçi Paylaşım & İletişim
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 z-10">
                {/* Moderator Shield Button */}
                <button
                  onClick={() => {
                    if (isModerator) {
                      if (confirm("Moderatör yetkilendirmesinden çıkış yapmak istiyor musunuz?")) {
                        handleModLogout();
                      }
                    } else {
                      setShowModLogin(true);
                    }
                  }}
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                    isModerator 
                      ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 animate-pulse" 
                      : "text-white/75 hover:text-white hover:bg-white/10"
                  }`}
                  title={isModerator ? "Moderatör Modu Aktif (Kapatmak için tıkla)" : "Yönetici / Moderatör Girişi"}
                >
                  <Shield className="w-4 h-4" />
                </button>

                {/* Search Toggle */}
                <button
                  onClick={() => {
                    setShowSearch(!showSearch);
                    if (showSearch) setSearchQuery("");
                  }}
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${showSearch ? "bg-white/20 text-yellow-300" : "text-white/75 hover:text-white hover:bg-white/10"}`}
                  title="Sohbette Ara"
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* Sound Options Popover Button */}
                <button
                  onClick={() => {
                    if (!soundEnabled) {
                      setSoundEnabled(true);
                      setSoundType("pop");
                    } else if (soundType === "pop") {
                      setSoundType("beep");
                    } else {
                      setSoundEnabled(false);
                    }
                    playSoundNotification();
                  }}
                  className="text-white/75 hover:text-white p-1.5 hover:bg-white/10 rounded-xl transition-all cursor-pointer flex items-center gap-0.5"
                  title={
                    !soundEnabled 
                      ? "Sesi Aç (Pop)" 
                      : soundType === "pop" 
                        ? "Bip Sesine Geç" 
                        : "Sesi Kapat"
                  }
                >
                  {!soundEnabled ? (
                    <VolumeX className="w-4 h-4 text-white/45" />
                  ) : soundType === "pop" ? (
                    <Volume2 className="w-4 h-4 text-emerald-300" />
                  ) : (
                    <Volume1 className="w-4 h-4 text-amber-300" />
                  )}
                </button>

                {/* Maximize Toggle */}
                <button
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="text-white/75 hover:text-white p-1.5 hover:bg-white/10 rounded-xl transition-all cursor-pointer hidden md:block"
                  title={isMaximized ? "Küçült" : "Geniş Ekran Modu"}
                >
                  {isMaximized ? <Minimize2 className="w-4.5 h-4.5" /> : <Maximize2 className="w-4.5 h-4.5" />}
                </button>
                
                {/* Close Panel */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/75 hover:text-white p-1.5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                  title="Kapat"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Room & DM Tab Navigation Bar */}
            {isJoined && (
              <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-1 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveChatTab("public")}
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeChatTab === "public"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Genel Oda</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveChatTab("dm");
                      fetchDMConversations();
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer relative ${
                      activeChatTab === "dm"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 text-amber-300" />
                    <span>Özel DM</span>
                    {dmConversations.length > 0 && (
                      <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                        {dmConversations.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* My Level / XP Badge Button */}
                {myProfile && (
                  <button
                    onClick={() => openUserProfile(myProfile.userId, username)}
                    className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-[10px] font-black flex items-center gap-1 hover:scale-103 transition-all cursor-pointer shadow-xs border border-yellow-300/40"
                    title="Benim Seviyem ve Rozetlerim"
                  >
                    <Trophy className="w-3 h-3 text-slate-950" />
                    <span>Lv.{myProfile.level} ({myProfile.xp} XP)</span>
                  </button>
                )}
              </div>
            )}

            {/* Live Search Bar inside Body if enabled */}
            {showSearch && (
              <div className="px-4 py-2 bg-indigo-50 dark:bg-slate-900/60 border-b border-indigo-100 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 animate-fade-in">
                <div className="relative flex-grow flex items-center">
                  <Search className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 absolute left-3" />
                  <input
                    type="text"
                    placeholder="Mesaj veya kullanıcı adı ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 pl-8 pr-8 py-1.5 rounded-xl border border-indigo-150 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery("");
                  }}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                >
                  Kapat
                </button>
              </div>
            )}

            {/* Moderator Active Banner Bar */}
            {canModerate && (
              <div className="px-3.5 py-2 bg-slate-900 border-b border-amber-500/30 text-white flex items-center justify-between gap-2 shrink-0 animate-fade-in shadow-sm">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                  <span className="text-[10px] font-extrabold tracking-wider uppercase text-amber-300 truncate">
                    {isAdmin ? "🌟 VIP Yetki Modu" : "⚡ Özel Denetim Modu"}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setSelectedUserToBlock({ userId: "", username: "" })}
                    className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/40 text-rose-300 rounded-lg text-[9px] font-extrabold cursor-pointer transition-all flex items-center gap-1"
                    title="Kullanıcı Engelle / Sustur"
                  >
                    <Ban className="w-3 h-3 text-rose-400" />
                    <span>Sustur / Ban</span>
                  </button>

                  <button
                    onClick={handleToggleSlowmode}
                    className={`px-2 py-1 rounded-lg text-[9px] font-extrabold cursor-pointer transition-all border flex items-center gap-1 ${
                      slowMode
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                        : "bg-white/10 border-white/20 text-slate-300 hover:bg-white/20"
                    }`}
                    title="Yavaş Mod Ayarını Değiştir"
                  >
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>{slowMode ? "Yavaş Mod AÇIK" : "Yavaş Mod KAPALI"}</span>
                  </button>

                  <button
                    onClick={handleClearAllChat}
                    className="px-2 py-1 bg-red-600/30 hover:bg-red-600/50 border border-red-500/40 text-red-200 rounded-lg text-[9px] font-extrabold cursor-pointer transition-all flex items-center gap-1"
                    title="Tüm Sohbetti Temizle"
                  >
                    <Trash2 className="w-3 h-3 text-red-300" />
                    <span>Temizle</span>
                  </button>

                  <button
                    onClick={handleModLogout}
                    className="p-1 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg cursor-pointer transition-all"
                    title="Moderatör Oturumunu Kapat"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Quick Interactive Tool Bar: Zar, Yazı-Tura, Fal, Aşk Ölçer, Espri Yap Buttons */}
            {isJoined && (
              <div className="px-3.5 py-1.5 bg-slate-100/60 dark:bg-slate-900/40 border-b border-slate-200/40 dark:border-slate-800/30 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 shrink-0 select-none mr-1">Eğlence:</span>
                
                <button
                  onClick={() => triggerSlashCommand("zar")}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100/50 dark:border-indigo-900/20 shadow-xs cursor-pointer transition-all hover:scale-103"
                  title="Çift Zar At"
                >
                  <Dices className="w-3 h-3 text-indigo-500" />
                  Zar At
                </button>

                <button
                  onClick={() => triggerSlashCommand("yazitura")}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-100/50 dark:border-amber-900/20 shadow-xs cursor-pointer transition-all hover:scale-103"
                  title="Yazı-Tura At"
                >
                  <Coins className="w-3 h-3 text-amber-500" />
                  Yazı Tura
                </button>

                <button
                  onClick={() => triggerSlashCommand("fal")}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-50 hover:bg-purple-100/80 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-100/50 dark:border-purple-900/20 shadow-xs cursor-pointer transition-all hover:scale-103"
                  title="Günün Kehanet Falını Oku"
                >
                  <Sparkle className="w-3 h-3 text-purple-500" />
                  Günün Falı
                </button>

                <button
                  onClick={() => triggerSlashCommand("ask")}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-100/50 dark:border-rose-900/20 shadow-xs cursor-pointer transition-all hover:scale-103"
                  title="Odanın Aşk Enerjisini Hesapla"
                >
                  <Flame className="w-3 h-3 text-rose-500" />
                  Aşk Ölçer
                </button>

                <button
                  onClick={() => triggerSlashCommand("saka")}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100/50 dark:border-emerald-900/20 shadow-xs cursor-pointer transition-all hover:scale-103"
                  title="Espri / Komik Söz Söyle"
                >
                  <Smile className="w-3 h-3 text-emerald-500" />
                  Espri Yap
                </button>

                {canModerate && (
                  <button
                    onClick={() => {
                      setShowCreatePollModal(true);
                      setPollOptionsInput(["", ""]);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-50 hover:bg-blue-100/80 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-100/50 dark:border-blue-900/20 shadow-xs cursor-pointer transition-all hover:scale-103 shrink-0"
                    title="Sohbet Odasına Anket Ekle (Sadece Yetkililer)"
                  >
                    <BarChart2 className="w-3 h-3 text-blue-500" />
                    Anket Başlat
                  </button>
                )}

                {canModerate && (
                  <button
                    onClick={() => {
                      setShowPinModal(true);
                      setCustomPinText("");
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-100/50 dark:border-amber-900/20 shadow-xs cursor-pointer transition-all hover:scale-103 shrink-0"
                    title="Üst Barda Duyuru/Mesaj Sabitle (Sadece Yetkililer)"
                  >
                    <Pin className="w-3 h-3 text-amber-500" />
                    Duyuru Sabitle
                  </button>
                )}
              </div>
            )}

            {/* Body Screen */}
            {!isJoined ? (
              /* Premium Nick Selection Screen */
              <div className="flex-grow p-6 flex flex-col justify-center items-center text-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/40 dark:to-slate-950">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center mb-4 shadow-sm border border-indigo-100/50 dark:border-indigo-900/30">
                  <MessageCircle className="w-8 h-8 animate-bounce" />
                </div>
                <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-base tracking-tight">Sohbete Katılın</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 mb-6 max-w-[260px] leading-relaxed">
                  Diğer kullanıcılarla gerçek zamanlı sohbet edin, özel mesajlaşın (DM) ve seviye kazanıp rozetler toplayın!
                </p>
                
                <form onSubmit={handleJoin} className="w-full max-w-[260px] flex flex-col gap-3">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      maxLength={20}
                      placeholder="Havalı bir rumuz girin..."
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-3 text-xs border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/80 focus:border-indigo-500 transition-all font-semibold shadow-sm"
                    />
                    {/* Dice Nick Generator Button */}
                    <button
                      type="button"
                      onClick={generateRandomNick}
                      className="absolute right-2.5 p-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all cursor-pointer"
                      title="Rastgele Üret"
                    >
                      <Dices className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-xs rounded-2xl transition-all cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none hover:shadow-lg active:scale-98"
                  >
                    Sohbete Başla 🚀
                  </button>
                </form>
              </div>
            ) : activeChatTab === "dm" ? (
              /* Direct Messaging (DM) Screen */
              <div className="flex flex-col flex-grow overflow-hidden bg-slate-50/50 dark:bg-slate-900/20">
                {activeDMTarget ? (
                  <>
                    {/* Active DM Header */}
                    <div className="px-3.5 py-2 bg-indigo-50/80 dark:bg-slate-900 border-b border-indigo-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveDMTarget(null)}
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-extrabold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer shadow-2xs"
                        >
                          ← Konuşmalar
                        </button>
                        <div
                          onClick={() => openUserProfile(activeDMTarget.id, activeDMTarget.name)}
                          className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black uppercase text-white shadow-xs bg-gradient-to-br ${getAvatarColor(activeDMTarget.name)}`}>
                            {getInitials(activeDMTarget.name)}
                          </div>
                          <div>
                            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 block">
                              @{activeDMTarget.name}
                            </span>
                            <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold">Özel DM Sohbeti</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DM Messages Feed */}
                    <div className="flex-grow overflow-y-auto p-3.5 space-y-3 scrollbar-thin">
                      {dmMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-70 py-12">
                          <Mail className="w-8 h-8 text-indigo-400 mb-2 animate-bounce" />
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                            @{activeDMTarget.name} ile özel mesajlaşmayı başlatın.
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">İlk mesajınızı aşağıya yazıp gönderin!</p>
                        </div>
                      ) : (
                        dmMessages.map((dm) => {
                          const isMyDm = dm.senderName === username;
                          const dmTime = new Date(dm.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

                          return (
                            <div key={dm.id} className={`flex flex-col max-w-[85%] ${isMyDm ? "ml-auto items-end" : "mr-auto items-start"}`}>
                              <div className="flex items-center gap-1 mb-0.5 px-1">
                                <span className="text-[9px] font-bold text-slate-400">{dm.senderName}</span>
                                <span className="text-[8px] text-slate-400">{dmTime}</span>
                              </div>
                              <div className={`p-2.5 rounded-2xl text-xs font-semibold leading-relaxed border shadow-2xs ${
                                isMyDm
                                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-tr-none border-indigo-500/20"
                                  : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-tl-none border-slate-200 dark:border-slate-800"
                              }`}>
                                {dm.text}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* DM Send Input Form */}
                    <form onSubmit={handleSendDM} className="p-3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
                      <input
                        type="text"
                        required
                        placeholder={`@${activeDMTarget.name} kullanıcısına mesaj...`}
                        value={dmText}
                        onChange={(e) => setDmText(e.target.value)}
                        className="flex-grow px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                      <button
                        type="submit"
                        disabled={sendingDm || !dmText.trim()}
                        className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer shadow-sm"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </>
                ) : (
                  /* Conversations List */
                  <div className="p-3.5 flex flex-col flex-grow overflow-y-auto space-y-2">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1 mb-1">
                      Özel Mesaj Konuşmaları ({dmConversations.length})
                    </div>

                    {dmConversations.length === 0 ? (
                      <div className="flex-grow flex flex-col items-center justify-center text-center p-6 text-slate-400">
                        <Mail className="w-8 h-8 mb-2 text-indigo-400/60" />
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Henüz özel mesajınız yok.</p>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-[220px]">
                          Genel odadaki herhangi bir kullanıcının adına tıklayıp "DM Gönder" butonunu kullanabilirsiniz!
                        </p>
                      </div>
                    ) : (
                      dmConversations.map((c) => (
                        <div
                          key={c.targetId}
                          onClick={() => {
                            setActiveDMTarget({ id: c.targetId, name: c.targetName });
                            fetchDMMessages(c.targetId);
                          }}
                          className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all hover:shadow-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black uppercase text-white shrink-0 bg-gradient-to-br ${getAvatarColor(c.targetName)}`}>
                              {getInitials(c.targetName)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 block truncate">
                                @{c.targetName}
                              </span>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {c.lastMessage}
                              </p>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                            Aç 💬
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Message Feed Stream */}
                <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/10 scrollbar-thin relative">
                  {chatClearedNotice && (
                    <div className="sticky top-0 z-30 my-1 mx-1 p-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl text-xs font-black text-center shadow-xl flex items-center justify-center gap-2 animate-bounce border border-white/20">
                      <span className="text-sm">📢</span>
                      <span>{chatClearedNotice}</span>
                    </div>
                  )}

                  {/* Pinned Message Banner */}
                  {pinnedMessage && (
                    <div className="sticky top-0 z-20 my-1 mx-0.5 p-3 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 dark:border-amber-700/40 rounded-2xl shadow-sm backdrop-blur-md flex items-start gap-2.5 animate-fade-in">
                      <div className="p-1.5 bg-amber-500 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
                        <Pin className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            📌 Sabitlenmiş Duyuru
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold">
                            @{pinnedMessage.pinnedBy}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug break-words">
                          {pinnedMessage.text}
                        </p>
                      </div>
                      {canModerate && (
                        <button
                          onClick={handleUnpinMessage}
                          className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all shrink-0 cursor-pointer"
                          title="Sabitlemeyi Kaldır"
                        >
                          <PinOff className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Active Poll Card */}
                  {activePoll && (
                    <div className="my-2 mx-0.5 p-3.5 bg-gradient-to-br from-indigo-50/90 via-violet-50/80 to-purple-50/90 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-slate-900/60 border border-indigo-200/80 dark:border-indigo-800/40 rounded-2xl shadow-sm relative group/poll animate-fade-in">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="p-1 bg-indigo-600 text-white rounded-lg text-xs">
                            <BarChart2 className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-700 dark:text-indigo-300">
                            Canlı Anket
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                            @{activePoll.createdBy}
                          </span>
                          {(canModerate || activePoll.createdById === (localStorage.getItem("inanresim_guest_id") || "")) && (
                            <button
                              onClick={() => handleClosePoll(activePoll.id)}
                              className="ml-1 text-[9px] font-extrabold text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/30 px-1.5 py-0.5 rounded-md cursor-pointer transition-all"
                              title="Anketi Bitir / Kapat"
                            >
                              Bitir
                            </button>
                          )}
                        </div>
                      </div>

                      <h5 className="text-xs font-black text-slate-900 dark:text-slate-100 mb-2.5 leading-snug">
                        {activePoll.question}
                      </h5>

                      {/* Options List */}
                      <div className="space-y-1.5">
                        {(() => {
                          const myId = localStorage.getItem("inanresim_guest_id") || "";
                          const totalVotes = activePoll.options.reduce((acc, opt) => acc + opt.votes.length, 0);

                          return activePoll.options.map((opt) => {
                            const voteCount = opt.votes.length;
                            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                            const hasVotedThis = opt.votes.includes(myId);

                            return (
                              <div
                                key={opt.id}
                                onClick={() => handleVotePoll(activePoll.id, opt.id)}
                                className={`relative overflow-hidden p-2 rounded-xl border text-xs font-extrabold cursor-pointer transition-all ${
                                  hasVotedThis
                                    ? "border-indigo-500 bg-indigo-600/10 text-indigo-900 dark:text-indigo-200 shadow-xs"
                                    : "border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-700"
                                }`}
                              >
                                {/* Progress fill bar */}
                                <div
                                  className="absolute inset-y-0 left-0 bg-indigo-500/15 dark:bg-indigo-500/25 transition-all duration-500 pointer-events-none"
                                  style={{ width: `${percentage}%` }}
                                />

                                <div className="relative z-10 flex items-center justify-between gap-2">
                                  <span className="flex items-center gap-1.5 min-w-0 truncate">
                                    {hasVotedThis ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                    ) : (
                                      <span className="w-2.5 h-2.5 rounded-full border border-slate-400 shrink-0" />
                                    )}
                                    <span className="truncate">{opt.text}</span>
                                  </span>
                                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 shrink-0">
                                    %{percentage} ({voteCount})
                                  </span>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                      
                      <div className="mt-2 text-[9px] text-slate-400 font-semibold text-right">
                        Toplam Oy: {activePoll.options.reduce((acc, opt) => acc + opt.votes.length, 0)}
                      </div>
                    </div>
                  )}
                  {filteredMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-70 py-16">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 mb-3 border border-slate-200/50 dark:border-slate-800/50">
                        <MessageCircle className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                        {searchQuery ? "Aramanızla eşleşen sonuç bulunamadı." : "Burada henüz kimse yok."}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {searchQuery ? "Lütfen farklı anahtar kelimeler deneyin." : "İlk selamı verip bir görsel veya video paylaşın!"}
                      </p>
                    </div>
                  ) : (
                    filteredMessages.map((msg) => {
                      const isMe = msg.username === username;
                      const timeStr = new Date(msg.createdAt).toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      // Parse media URL
                      const hasMedia = msg.text.includes("/api/images/");
                      let mediaUrl = "";
                      let isVideoType = false;
                      let remainingText = msg.text;

                      if (hasMedia) {
                        const match = msg.text.match(/\/api\/images\/[a-zA-Z0-9]+/);
                        if (match) {
                          mediaUrl = match[0];
                          isVideoType = msg.text.toLowerCase().includes("[video]");
                          remainingText = msg.text
                            .replace(/\[Görsel\]\s*/i, "")
                            .replace(/\[Video\]\s*/i, "")
                            .replace(/\/api\/images\/[a-zA-Z0-9]+/, "")
                            .trim();
                        }
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-start gap-2.5 max-w-[90%] group/msg animate-fade-in ${
                            isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                          }`}
                        >
                          {/* Circle Initials Avatar */}
                          <div
                            onClick={() => openUserProfile(msg.userId, msg.username)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-wider shrink-0 shadow-sm border border-white/15 bg-gradient-to-br cursor-pointer hover:scale-105 active:scale-95 transition-all ${getAvatarColor(
                              msg.username
                            )}`}
                            title={`${msg.username} Profil Kartını Görmek İçin Tıkla`}
                          >
                            {getInitials(msg.username)}
                          </div>

                          {/* Speech Bubble Column */}
                          <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                            {/* Sender name & Time */}
                            <div className="flex items-center gap-1.5 mb-1 px-1 flex-wrap">
                              <span 
                                onClick={() => openUserProfile(msg.userId, msg.username)}
                                className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors flex items-center gap-1"
                              >
                                {msg.username}
                              </span>
                              {(isMe ? isAdmin : msg.isAdmin) ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-[8px] font-black uppercase text-white tracking-wider animate-pulse shadow-sm shadow-indigo-500/20 border border-indigo-400/30">
                                  <span>👑</span> Admin
                                </span>
                              ) : (isMe ? isModerator : msg.isMod) ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-[8px] font-black uppercase text-white tracking-wider animate-pulse shadow-sm shadow-amber-500/10 border border-yellow-400/20">
                                  <span>🛡️</span> Moderatör
                                </span>
                              ) : null}
                              <span className="text-[9px] text-slate-400 font-medium tabular-nums">
                                {timeStr}
                              </span>
                              {canModerate && !isMe && (
                                <button
                                  onClick={() => setSelectedUserToBlock({ userId: msg.userId, username: msg.username })}
                                  className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 dark:text-rose-400 rounded-md text-[9px] font-extrabold cursor-pointer transition-all"
                                  title="Kullanıcıyı Yönet / Banla / Sustur"
                                >
                                  <Ban className="w-2.5 h-2.5 text-rose-500" />
                                  <span>Yönet / Ban</span>
                                </button>
                              )}
                            </div>

                            {/* Bubble Container */}
                            <div className="relative group">
                              <div
                                className={`p-3 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] border text-sm relative transition-all duration-200 ${
                                  isMe
                                    ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-none border-indigo-500/10"
                                    : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-tl-none border-slate-150 dark:border-slate-850"
                                } break-all`}
                              >
                                {mediaUrl ? (
                                  <div className="rounded-xl overflow-hidden bg-slate-900/5 max-w-full">
                                    <a
                                      href={`/?view=image-detail&id=${mediaUrl.split("/").pop()}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="block relative group cursor-pointer"
                                    >
                                      {isVideoType ? (
                                        <div className="relative rounded-lg overflow-hidden max-h-36 bg-black flex items-center justify-center">
                                          <video
                                            src={mediaUrl}
                                            className="max-h-36 w-full object-contain"
                                            controls={false}
                                            muted
                                            playsInline
                                          />
                                          {/* Visual watermarked symbol inside mini video */}
                                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                                            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                                              <Video className="w-4 h-4 text-white" />
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <img
                                          src={mediaUrl}
                                          alt="Sohbette Paylaşılan Görsel"
                                          className="max-h-36 object-cover w-full rounded-lg transition-transform duration-300 group-hover:scale-102 border border-black/5"
                                          referrerPolicy="no-referrer"
                                        />
                                      )}
                                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-black uppercase tracking-widest rounded-lg">
                                        Dosyayı Gör 🔍
                                      </div>
                                    </a>
                                    {remainingText && (
                                      <p className={`mt-2 text-xs font-semibold leading-relaxed ${isMe ? "text-indigo-50" : "text-slate-700 dark:text-slate-200"}`}>
                                        {remainingText}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <p className={`text-xs font-semibold leading-relaxed ${isMe ? "text-indigo-50" : "text-slate-700 dark:text-slate-200"}`}>
                                    {msg.text}
                                  </p>
                                )}
                              </div>

                              {/* Hover Tool Actions: Yanıtla & Kopyala */}
                              <div 
                                className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-all duration-150 pointer-events-auto z-10 ${
                                  isMe ? "left-0 -translate-x-full pr-2" : "right-0 translate-x-full pl-2"
                                }`}
                              >
                                <button
                                  onClick={() => handleCopyMessage(msg.id, msg.text)}
                                  className="p-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 shadow-sm cursor-pointer"
                                  title="Kopyala"
                                >
                                  {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                                {!isMe && (
                                  <>
                                    <button
                                      onClick={() => startDMWithUser(msg.userId, msg.username)}
                                      className="p-1 bg-white dark:bg-slate-800 hover:bg-amber-50 hover:border-amber-200 dark:hover:bg-amber-950 border border-slate-200 dark:border-slate-700 rounded-lg text-amber-500 dark:text-amber-400 hover:text-amber-600 shadow-sm cursor-pointer"
                                      title="Özel Mesaj (DM) Gönder"
                                    >
                                      <Mail className="w-3 h-3 text-amber-500" />
                                    </button>
                                    <button
                                      onClick={() => handleReplyUser(msg.username)}
                                      className="p-1 bg-white dark:bg-slate-800 hover:bg-indigo-50 hover:border-indigo-200 dark:hover:bg-indigo-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 shadow-sm cursor-pointer"
                                      title="Yanıtla"
                                    >
                                      <MessageSquare className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                                {canModerate && !isMe && (
                                  <button
                                    onClick={() => setSelectedUserToBlock({ userId: msg.userId, username: msg.username })}
                                    className="p-1 bg-white dark:bg-slate-800 hover:bg-rose-50 hover:border-rose-200 dark:hover:bg-rose-950 border border-slate-200 dark:border-slate-700 rounded-lg text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 shadow-sm cursor-pointer"
                                    title="Kullanıcıyı Engelle / Yasakla"
                                  >
                                    <Ban className="w-3 h-3 text-rose-500" />
                                  </button>
                                )}
                                {canModerate && (
                                  <button
                                    onClick={() => handlePinMessage(msg.text)}
                                    className="p-1 bg-white dark:bg-slate-800 hover:bg-amber-50 hover:border-amber-200 dark:hover:bg-amber-950 border border-slate-200 dark:border-slate-700 rounded-lg text-amber-500 dark:text-amber-400 hover:text-amber-600 shadow-sm cursor-pointer"
                                    title="Bu Mesajı Sabitle"
                                  >
                                    <Pin className="w-3 h-3 text-amber-500" />
                                  </button>
                                )}
                                {canModerate && (
                                  <button
                                    onClick={() => handleDeleteSingleMessage(msg.id)}
                                    className="p-1 bg-white dark:bg-slate-800 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-950 border border-slate-200 dark:border-slate-700 rounded-lg text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 shadow-sm cursor-pointer"
                                    title="Bu Mesajı Sil"
                                  >
                                    <Trash2 className="w-3 h-3 text-red-500" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Uploading Media Indicator */}
                {uploadingMedia && (
                  <div className="bg-indigo-50/90 dark:bg-indigo-950/35 border-t border-indigo-100/40 dark:border-indigo-900/30 py-2.5 px-4 flex items-center gap-2.5 animate-pulse shrink-0">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-indigo-600 border-t-transparent"></div>
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400">Dosya yükleniyor ve paylaşılıyor...</span>
                  </div>
                )}

                {/* Status and Error Alerts */}
                {error && (
                  <div className="bg-rose-50 dark:bg-rose-950/20 border-t border-rose-100 dark:border-rose-950/30 py-2.5 px-4 flex items-start gap-2 animate-fade-in shrink-0">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-[10px] font-black text-rose-700 dark:text-rose-400 leading-relaxed">
                      {error}
                    </div>
                  </div>
                )}

                {/* SlowMode Bar */}
                {slowMode && (
                  <div className="bg-amber-50 dark:bg-amber-950/10 border-t border-amber-100 dark:border-amber-950/20 py-1.5 px-4 flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-400">
                      3 saniye yavaş mod aktif.
                    </span>
                  </div>
                )}

                {/* Popular Emojis Shortcut Bar just above input */}
                <div className="px-3.5 py-1 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900/60 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
                    {popularEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setText((prev) => prev + emoji);
                          setError(null);
                        }}
                        className="text-sm hover:scale-125 transition-transform p-0.5 cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowEmojiHelper(!showEmojiHelper)}
                    className={`p-1 rounded-lg text-[10px] font-bold shrink-0 transition-colors cursor-pointer ${showEmojiHelper ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    Hazır İfadeler
                  </button>
                </div>

                {/* Predefined Quick Expressions/Words Helper Panel */}
                {showEmojiHelper && (
                  <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 animate-fade-in">
                    {quickWords.map((word) => (
                      <button
                        key={word}
                        type="button"
                        onClick={() => {
                          setText((prev) => {
                            const trimmed = prev.trim();
                            return trimmed ? trimmed + " " + word : word;
                          });
                          setShowEmojiHelper(false);
                          setError(null);
                        }}
                        className="px-2.5 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer transition-colors shrink-0"
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                )}

                {/* Form Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3.5 bg-white dark:bg-slate-950 border-t border-slate-150 dark:border-slate-900 flex items-center gap-2 shrink-0"
                >
                  {/* Hidden media selector input */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400 text-slate-500 dark:text-slate-400 rounded-xl transition-all shrink-0 flex items-center justify-center cursor-pointer border border-slate-200/50 dark:border-slate-800/40"
                    title="Görsel veya Video Paylaş"
                    disabled={uploadingMedia}
                  >
                    <ImageIcon className="w-4.5 h-4.5" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleMediaUpload}
                    accept="image/*,video/*"
                    className="hidden"
                  />

                  <input
                    type="text"
                    required={!uploadingMedia}
                    placeholder="Bir şeyler yazın..."
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      if (error) setError(null);
                    }}
                    className="flex-grow px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/80 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium"
                  />

                  <button
                    type="submit"
                    disabled={uploadingMedia || !text.trim()}
                    className="p-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl transition-all shrink-0 flex items-center justify-center cursor-pointer shadow-sm shadow-indigo-100 dark:shadow-none"
                  >
                    <Send className="w-4.5 h-4.5" />
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Maximized View Side Panel: List of Active Chatters */}
          {isMaximized && isJoined && (
            <div className="w-64 bg-slate-50 dark:bg-slate-900 border-l border-slate-200/80 dark:border-slate-800/80 flex flex-col h-full shrink-0">
              {/* Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                <span className="font-extrabold text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider">Aktif Üyeler ({getActiveChatters().length})</span>
              </div>

              {/* Chatters List */}
              <div className="flex-grow overflow-y-auto p-3 space-y-2.5">
                {getActiveChatters().map((u) => {
                  const isCurrent = u.username === username;
                  const isSupport = u.username === "DestekRobotu";
                  const isMod = u.username === "SistemOdaGözcüsü";
                  
                  return (
                    <div 
                      key={u.username}
                      onClick={() => !isCurrent && handleReplyUser(u.username)}
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-slate-950 hover:bg-indigo-50/70 dark:hover:bg-slate-900 border border-slate-150 dark:border-slate-850/60 transition-all cursor-pointer group"
                      title={isCurrent ? "Siz" : `${u.username} için yanıt ekle`}
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase tracking-wider shrink-0 shadow-sm border border-white/10 bg-gradient-to-br ${getAvatarColor(u.username)}`}>
                        {getInitials(u.username)}
                      </div>

                      {/* Detail */}
                      <div className="flex-grow min-w-0">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {u.username}
                          {isCurrent && <span className="text-[9px] text-indigo-500 ml-1 font-semibold">(Siz)</span>}
                        </span>
                        
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                            {isSupport ? "Destek Botu" : isMod ? "Moderatör" : "Çevrimiçi"}
                          </span>
                        </div>
                      </div>

                      {isModerator && !isCurrent && !isSupport && !isMod && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // prevent reply action
                            setSelectedUserToBlock({ userId: u.id, username: u.username });
                          }}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/25 dark:hover:bg-rose-900/30 border border-rose-100/50 dark:border-rose-900/10 rounded-lg text-rose-500 dark:text-rose-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0"
                          title="Kullanıcıyı Engelle / Yasakla"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Help Tips Area */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed font-semibold">
                <div className="flex items-center gap-1 mb-1.5 font-bold text-slate-500 dark:text-slate-400">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Kısayol Bilgisi
                </div>
                Kullanıcı adına tıklayarak etiketleyebilir, zarlar fırlatabilir, fal bakabilir veya dosya seçerek hemen paylaşabilirsiniz!
              </div>
            </div>
          )}

          {/* Moderator Login Form Overlay */}
          {showModLogin && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs z-50 flex flex-col justify-center items-center p-6 text-center animate-fade-in pointer-events-auto">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl max-w-[290px] w-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-800">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm tracking-tight">Özel Üye / Moderatör Girişi</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 mb-4 leading-relaxed">
                  Sohbet odasını denetlemek ve kullanıcı engellemek için Moderatör şifrenizi girin.
                </p>
                
                <form onSubmit={handleModLogin} className="flex flex-col gap-2.5">
                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder="Moderatör Şifresi..."
                    value={modPassword}
                    onChange={(e) => setModPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-semibold"
                  />
                  
                  {modLoginError && (
                    <p className="text-[9px] font-bold text-rose-500 leading-tight text-center">
                      {modLoginError}
                    </p>
                  )}
                  
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModLogin(false);
                        setModPassword("");
                        setModLoginError(null);
                      }}
                      className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px] rounded-xl transition-all cursor-pointer"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-[10px] rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      Doğrula
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Block/Ban User Overlay Form */}
          {selectedUserToBlock && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs z-50 flex flex-col justify-center items-center p-6 text-center animate-fade-in pointer-events-auto">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl max-w-[290px] w-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-800">
                <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Ban className="w-6 h-6 text-rose-500 animate-bounce" />
                </div>
                <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm tracking-tight">Kullanıcı Moderasyonu</h4>
                <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 mb-4 font-bold">
                  {selectedUserToBlock.username ? `@${selectedUserToBlock.username} kullanıcısını yönetiyorsunuz.` : "Modere edilecek kullanıcı bilgilerini seçin."}
                </p>
                
                <form onSubmit={handleBlockUserSubmit} className="flex flex-col gap-3">
                  {!selectedUserToBlock.username && (
                    <div className="text-left">
                      <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 pl-1">
                        Kullanıcı Adı
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: HızlıKedi42"
                        value={selectedUserToBlock.username}
                        onChange={(e) => setSelectedUserToBlock({ ...selectedUserToBlock, username: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  <div className="text-left">
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 pl-1">
                      Engel Süresi / Türü
                    </label>
                    <select
                      value={blockDuration}
                      onChange={(e) => setBlockDuration(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold cursor-pointer text-xs"
                    >
                      <option value="5">5 Dakika Geçici Engelle</option>
                      <option value="15">15 Dakika Geçici Engelle</option>
                      <option value="60">1 Saat Geçici Engelle</option>
                      <option value="1440">24 Saat (1 Gün) Geçici Engelle</option>
                      <option value="permanent">Kalıcı Olarak Yasakla (Sınırsız)</option>
                    </select>
                  </div>
                  
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      disabled={blockLoading}
                      onClick={() => setSelectedUserToBlock(null)}
                      className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px] rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={blockLoading}
                      className="flex-1 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-[10px] rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {blockLoading ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : "Uygula"}
                    </button>
                  </div>

                  {selectedUserToBlock.userId && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUserAllMessages(selectedUserToBlock.userId, selectedUserToBlock.username)}
                      className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-extrabold text-[10px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 mt-1"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Kullanıcının Tüm Mesajlarını Sil</span>
                    </button>
                  )}
                </form>
              </div>
            </div>
          )}
          {/* User Profile Card & Badges Modal */}
          {userProfileModal && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in pointer-events-auto">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 max-w-[310px] w-full shadow-2xl relative text-center">
                {/* Close button */}
                <button
                  onClick={() => setUserProfileModal(null)}
                  className="absolute top-3.5 right-3.5 p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Avatar */}
                <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-lg font-black uppercase text-white shadow-md border-2 border-white/20 bg-gradient-to-br ${getAvatarColor(userProfileModal.username)}`}>
                  {getInitials(userProfileModal.username)}
                </div>

                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base mt-2.5 tracking-tight flex items-center justify-center gap-1.5">
                  @{userProfileModal.username}
                </h3>

                {/* Level & XP Progress Bar */}
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-200 mb-1.5">
                    <span className="flex items-center gap-1 text-amber-500">
                      <Trophy className="w-3.5 h-3.5 text-amber-500" /> Seviye {userProfileModal.level}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">{userProfileModal.xp} XP</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (userProfileModal.xp % 100))}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 font-semibold block mt-1">
                    Sonraki Seviyeye: {100 - (userProfileModal.xp % 100)} XP
                  </span>
                </div>

                {/* Badges List */}
                <div className="mt-3 text-left">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Kazanılan Rozetler ({userProfileModal.badges?.length || 0}):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {userProfileModal.badges && userProfileModal.badges.length > 0 ? (
                      userProfileModal.badges.map((b) => (
                        <span key={b} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-extrabold shadow-2xs">
                          {b}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Henüz özel rozet kazanılmadı</span>
                    )}
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                  <div className="p-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Mesajlar</span>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                      {userProfileModal.messageCount || 0}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Aktivite/Oyun</span>
                    <span className="text-xs font-black text-amber-500">
                      {userProfileModal.gameCount || 0}
                    </span>
                  </div>
                </div>

                {/* Direct Message Action Button */}
                {userProfileModal.username !== username && (
                  <button
                    onClick={() => startDMWithUser(userProfileModal.userId, userProfileModal.username)}
                    className="mt-4 w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Özel Mesaj (DM) Gönder</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Create Poll Modal */}
          {showCreatePollModal && canModerate && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs z-50 flex flex-col justify-center items-center p-4 animate-fade-in pointer-events-auto">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl max-w-[310px] w-full shadow-2xl border border-slate-100 dark:border-slate-800 relative">
                <button
                  type="button"
                  onClick={() => setShowCreatePollModal(false)}
                  className="absolute top-3.5 right-3.5 p-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 rounded-full cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Mini Anket Başlat</h4>
                    <p className="text-[10px] text-slate-400 font-bold">Odaya canlı oylama sunun</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Anket Sorusu
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: Bugün hangi kategoriyi yükleyelim?"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        Seçenekler
                      </label>
                      {pollOptionsInput.length < 5 && (
                        <button
                          type="button"
                          onClick={() => setPollOptionsInput([...pollOptionsInput, ""])}
                          className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                        >
                          <Plus className="w-2.5 h-2.5" /> Seçenek Ekle
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {pollOptionsInput.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder={`Seçenek ${idx + 1}`}
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...pollOptionsInput];
                              newOpts[idx] = e.target.value;
                              setPollOptionsInput(newOpts);
                            }}
                            className="flex-grow px-2.5 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          {pollOptionsInput.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newOpts = pollOptionsInput.filter((_, i) => i !== idx);
                                setPollOptionsInput(newOpts);
                              }}
                              className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreatePollModal(false)}
                      className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      İptal
                    </button>
                    <button
                      type="button"
                      disabled={creatingPoll || !pollQuestion.trim() || pollOptionsInput.filter(o => o.trim()).length < 2}
                      onClick={handleCreatePoll}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1"
                    >
                      {creatingPoll ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "Yayınla"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Custom Pin Message Modal */}
          {showPinModal && canModerate && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs z-50 flex flex-col justify-center items-center p-4 animate-fade-in pointer-events-auto">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl max-w-[310px] w-full shadow-2xl border border-slate-100 dark:border-slate-800 relative">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="absolute top-3.5 right-3.5 p-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 rounded-full cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
                    <Pin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Mesaj / Duyuru Sabitle</h4>
                    <p className="text-[10px] text-slate-400 font-bold">Sohbetin en üst bandında görünür</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Duyuru Metni
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Örn: Hoş geldiniz! Lütfen topluluk kurallarına riayet ediniz..."
                      value={customPinText}
                      onChange={(e) => setCustomPinText(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPinModal(false)}
                      className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      İptal
                    </button>
                    <button
                      type="button"
                      disabled={pinningLoading || !customPinText.trim()}
                      onClick={() => handlePinMessage(customPinText)}
                      className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1"
                    >
                      {pinningLoading ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "Sabitle"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
