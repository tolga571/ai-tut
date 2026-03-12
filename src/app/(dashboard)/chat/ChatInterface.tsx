"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { UserMenu } from "@/components/UserMenu";

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  translation?: string;
  createdAt?: string;
};

type Conversation = {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
};

// Target language names in Turkish
const LANG_TR: Record<string, string> = {
  en: "İngilizce", tr: "Türkçe", de: "Almanca", fr: "Fransızca",
  es: "İspanyolca", it: "İtalyanca", pt: "Portekizce", ru: "Rusça",
  zh: "Çince", ja: "Japonca", ko: "Korece", ar: "Arapça",
};

const LANG_FLAG: Record<string, string> = {
  en: "🇬🇧", tr: "🇹🇷", de: "🇩🇪", fr: "🇫🇷",
  es: "🇪🇸", it: "🇮🇹", pt: "🇵🇹", ru: "🇷🇺",
  zh: "🇨🇳", ja: "🇯🇵", ko: "🇰🇷", ar: "🇸🇦",
};

export default function ChatInterface({ user }: { user: any }) {
  const targetLang = user?.targetLang?.toLowerCase() ?? "en";
  const targetLangName = LANG_TR[targetLang] ?? targetLang.toUpperCase();
  const targetLangFlag = LANG_FLAG[targetLang] ?? "";
  const welcomePlaceholder = `${targetLangName} öğrenmek için bir şeyler yaz`;
  const inputPlaceholder = `${targetLangName} dilinde bir şeyler yaz...`;
  const learningLabel = "Öğrenilen dil";

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const fetchConversations = useCallback(async (): Promise<Conversation[]> => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        return data;
      }
    } catch {
      // silent
    }
    return [];
  }, []);

  const loadConversation = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/chat?id=${convId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveConvId(data.id || null);
        setMessages(data.messages || []);
      }
    } catch {
      toast.error("Failed to load conversation");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoadingHistory(true);
      const convs = await fetchConversations();
      if (convs.length > 0) {
        await loadConversation(convs[0].id);
      }
      setLoadingHistory(false);
    };
    init();
  }, [fetchConversations, loadConversation]);

  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    inputRef.current?.focus();
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleSelectConversation = async (convId: string) => {
    if (convId === activeConvId) return;
    await loadConversation(convId);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (!confirm("Bu konuşmayı silmek istediğinize emin misiniz?")) return;

    setDeletingId(convId);
    try {
      const res = await fetch(`/api/conversations/${convId}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (activeConvId === convId) {
          setActiveConvId(null);
          setMessages([]);
        }
        toast.success("Konuşma silindi");
      } else {
        toast.error("Silinemedi");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setDeletingId(null);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content, conversationId: activeConvId }),
      });

      if (!res.ok) throw new Error("Chat failed");

      const data = await res.json();
      const newConvId = data.conversationId;

      if (!activeConvId) {
        setActiveConvId(newConvId);
        await fetchConversations();
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === newConvId ? { ...c, updatedAt: new Date().toISOString() } : c
          )
        );
      }

      setMessages((prev) => [...prev, data.message]);
    } catch {
      toast.error("Mesaj gönderilemedi. Tekrar deneyin.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const getConvTitle = (conv: Conversation): string => {
    const first = conv.messages[0];
    if (!first) return new Date(conv.createdAt).toLocaleDateString("tr-TR");
    const text = first.content;
    return text.length > 28 ? text.slice(0, 28) + "…" : text;
  };

  const getRelativeTime = (dateStr: string): string => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 1) return "Az önce";
    if (mins < 60) return `${mins}dk önce`;
    if (hours < 24) return `${hours}sa önce`;
    if (days === 1) return "Dün";
    if (days < 7) return `${days} gün önce`;
    return new Date(dateStr).toLocaleDateString("tr-TR");
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <header className="px-6 py-4 glass-nav border-b border-white/5 flex items-center justify-between z-10 flex-shrink-0">
        <div className="font-bold text-xl bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          AiTut Chat
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400">
            {learningLabel}: <span className="text-white font-medium">{targetLangFlag} {targetLangName}</span>
          </div>
          <UserMenu user={user} />
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
      {/* ── Sidebar ── */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } flex-shrink-0 overflow-hidden transition-all duration-300 bg-gray-900/80 border-r border-white/5 flex flex-col`}
      >
        {/* New chat button */}
        <div className="p-3 border-b border-white/5 flex-shrink-0">
          <button
            onClick={handleNewChat}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Yeni Chat
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          {loadingHistory ? (
            <div className="space-y-2 px-3 mt-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-gray-500 text-sm">Henüz konuşma yok</p>
              <p className="text-gray-600 text-xs mt-1">Bir mesaj göndererek başlayın</p>
            </div>
          ) : (
            <div className="px-2 space-y-0.5">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    activeConvId === conv.id
                      ? "bg-blue-600/20 border border-blue-500/30 text-white"
                      : "hover:bg-white/5 text-gray-400 hover:text-gray-200 border border-transparent"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-tight">
                      {getConvTitle(conv)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{getRelativeTime(conv.updatedAt)}</p>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    disabled={deletingId === conv.id}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all flex-shrink-0 disabled:opacity-40"
                    title="Sil"
                  >
                    {deletingId === conv.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User footer → profile */}
        <div className="p-3 border-t border-white/5 flex-shrink-0">
          <Link
            href="/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-all group"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-white font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200 truncate font-medium leading-tight">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <svg
              className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 flex-shrink-0 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Sidebar toggle button */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="absolute top-4 left-4 z-10 p-2 rounded-xl bg-gray-900/80 backdrop-blur border border-white/10 hover:bg-gray-800 transition-all text-gray-400 hover:text-white"
          title={sidebarOpen ? "Geçmişi gizle" : "Geçmişi göster"}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Messages scroll area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pt-16 pb-28 px-4 md:px-8">
          <div className="max-w-2xl mx-auto">
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400 space-y-4">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-2xl">👋</span>
                </div>
                <p className="text-lg font-medium text-gray-300">Konuşmaya başla</p>
                <p className="text-sm text-center">
                  {welcomePlaceholder}
                </p>
              </div>
            )}

            <div className="space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] ${
                    msg.role === "user"
                      ? "self-end items-end ml-auto"
                      : "self-start items-start mr-auto"
                  }`}
                >
                  {msg.role === "user" ? (
                    <div className="bg-blue-600/90 hover:bg-blue-600 px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-md transition-all text-[15px] leading-relaxed break-words border border-blue-500/30">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="bg-gray-800/90 backdrop-blur border border-gray-700/50 px-5 py-3.5 rounded-2xl rounded-tl-sm shadow-lg overflow-hidden group transition-all">
                      <p className="text-[16px] leading-relaxed text-blue-50">{msg.content}</p>
                      {msg.translation && (
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <p className="text-[14px] leading-relaxed text-gray-400 font-light group-hover:text-gray-300 transition-colors">
                            {msg.translation}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex self-start mr-auto">
                  <div className="bg-gray-800/80 px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-2 shadow-sm border border-gray-700/50">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 pt-3 bg-gradient-to-t from-gray-950 via-gray-950/90 to-transparent">
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl backdrop-blur-2xl transition-all focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20">
              <form onSubmit={sendMessage} className="flex items-center px-2 py-2 gap-2">
                <span className="inline-flex items-center justify-center px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-gray-300 whitespace-nowrap">
                  Coach
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={inputPlaceholder}
                  className="flex-1 bg-transparent border-none text-white focus:ring-0 placeholder-gray-500 px-4 text-base h-12 outline-none"
                  autoComplete="off"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="w-12 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white disabled:opacity-40 disabled:bg-gray-800 disabled:text-gray-500 transition-all active:scale-95 mx-1"
                >
                  <svg className="w-5 h-5 translate-x-[1px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
