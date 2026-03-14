"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import toast from "react-hot-toast";
import { UserMenu } from "@/components/UserMenu";
import { useTranslations, useLocale } from "next-intl";
import { LANG_FLAG } from "@/constants/languages";
import { ThemeToggle } from "@/components/ThemeToggle";

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  translation?: string;
  correction?: string;
  createdAt?: string;
};

type Conversation = {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
};

export default function ChatInterface({ user }: { user: { name?: string | null; email?: string | null; targetLang?: string; nativeLang?: string; role?: string } }) {
  const t = useTranslations("chat");
  const tNav = useTranslations("nav");
  const tLangs = useTranslations("languages");
  const locale = useLocale();

  const targetLang = (user as { targetLang?: string }).targetLang?.toLowerCase() ?? "en";
  const targetLangName = tLangs(targetLang as Parameters<typeof tLangs>[0], { defaultValue: targetLang.toUpperCase() });
  const targetLangFlag = LANG_FLAG[targetLang] ?? "";

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const convFromUrl = searchParams?.get("conv");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      toast.error(t("loadError"));
    }
  }, [t]);

  useEffect(() => {
    const init = async () => {
      setLoadingHistory(true);
      const convs = await fetchConversations();
      if (convs.length > 0) {
        const targetId = convFromUrl && convs.some((c) => c.id === convFromUrl) ? convFromUrl : convs[0].id;
        await loadConversation(targetId);
      }
      setLoadingHistory(false);
    };
    init();
  }, [fetchConversations, loadConversation, convFromUrl]);

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
    if (!confirm(t("deleteConfirm"))) return;

    setDeletingId(convId);
    try {
      const res = await fetch(`/api/conversations/${convId}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (activeConvId === convId) {
          setActiveConvId(null);
          setMessages([]);
        }
        toast.success(t("deleted"));
      } else {
        toast.error(t("deleteError"));
      }
    } catch {
      toast.error(t("genericError"));
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
      toast.error(t("sendError"));
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const MAX_CHARS = 500;

  const copyMessage = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getConvTitle = (conv: Conversation): string => {
    const first = conv.messages[0];
    if (!first) return new Date(conv.createdAt).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US");
    const text = first.content;
    return text.length > 28 ? text.slice(0, 28) + "…" : text;
  };

  const getRelativeTime = (dateStr: string): string => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    const rtf = new Intl.RelativeTimeFormat(locale === "tr" ? "tr" : "en", { numeric: "auto" });
    if (mins < 1) return rtf.format(0, "seconds");
    if (mins < 60) return rtf.format(-mins, "minutes");
    if (hours < 24) return rtf.format(-hours, "hours");
    if (days < 7) return rtf.format(-days, "days");
    return new Date(dateStr).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="px-4 sm:px-6 py-3 sm:py-4 glass-nav border-b border-gray-200 dark:border-white/5 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-2 rounded-xl bg-white/90 dark:bg-gray-900/80 backdrop-blur border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            title={sidebarOpen ? t("hideHistory") : t("showHistory")}
            aria-label={sidebarOpen ? t("hideHistory") : t("showHistory")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="font-bold text-lg sm:text-xl bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500 bg-clip-text text-transparent truncate">
            AiTut Chat
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <div className="hidden sm:block text-sm text-gray-600 dark:text-gray-400">
            {t("learningLabel")}:{" "}
            <span className="text-gray-900 dark:text-white font-medium">{targetLangFlag} {targetLangName}</span>
          </div>
          <div className="sm:hidden text-sm text-gray-600 dark:text-gray-400 font-medium">
            {targetLangFlag || targetLang.toUpperCase()}
          </div>
          <UserMenu user={user} role={user.role} />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {isMobile && sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-black/40 z-20"
            aria-label={t("hideHistory")}
          />
        )}

        {/* Sidebar */}
        <div
          className={`${
            isMobile
              ? `absolute inset-y-0 left-0 z-30 w-72 max-w-[85vw] transform transition-transform duration-300 ${
                  sidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`
              : `${sidebarOpen ? "w-64" : "w-0"} flex-shrink-0 transition-all duration-300`
          } overflow-hidden bg-gray-100 dark:bg-gray-900/80 border-r border-gray-200 dark:border-white/5 flex flex-col`}
        >
          <div className="p-3 border-b border-gray-200 dark:border-white/5 flex-shrink-0 space-y-2">
            <button
              onClick={handleNewChat}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t("newChat")}
            </button>
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full pl-8 pr-3 py-2 bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-xs text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
            {loadingHistory ? (
              <div className="space-y-2 px-3 mt-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-gray-200 dark:bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-gray-500 dark:text-gray-500 text-sm">{t("noConversations")}</p>
                <p className="text-gray-600 dark:text-gray-600 text-xs mt-1">{t("startHint")}</p>
              </div>
            ) : (
              <div className="px-2 space-y-0.5">
                {conversations.filter((conv) =>
                  searchQuery.trim() === "" ||
                  getConvTitle(conv).toLowerCase().includes(searchQuery.toLowerCase())
                ).map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      activeConvId === conv.id
                        ? "bg-blue-500/20 dark:bg-blue-600/20 border border-blue-500/30 text-gray-900 dark:text-white"
                        : "hover:bg-gray-200 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border border-transparent"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-tight">{getConvTitle(conv)}</p>
                      <p className="text-xs text-gray-500 mt-0.5 dark:text-gray-500">{getRelativeTime(conv.updatedAt)}</p>
                    </div>

                    <button
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      disabled={deletingId === conv.id}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all flex-shrink-0 disabled:opacity-40"
                    >
                      {deletingId === conv.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Content nav */}
          <div className="p-3 border-t border-gray-200 dark:border-white/5 flex-shrink-0 space-y-0.5">
            <Link href="/vocabulary" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5 transition-all">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Vocabulary
            </Link>
            <Link href="/progress" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5 transition-all">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              My Progress
            </Link>
            <Link href="/blogs" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5 transition-all">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              {tNav("blogs")}
            </Link>
            <Link href="/pages" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5 transition-all">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {tNav("pages")}
            </Link>
            <Link href="/documents" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5 transition-all">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {tNav("documents")}
            </Link>
            {user.role === "admin" && (
              <Link href="/admin" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-all">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {tNav("adminPanel")}
              </Link>
            )}
          </div>

          {/* User footer */}
          <div className="p-3 border-t border-gray-200 dark:border-white/5 flex-shrink-0">
            <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-200 dark:hover:bg-white/5 transition-all group"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-white font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-200 truncate font-medium leading-tight">{user?.name || "User"}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-600 group-hover:text-gray-700 dark:group-hover:text-gray-400 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div className="flex-1 overflow-y-auto custom-scrollbar pt-4 pb-28 px-4 md:px-8">
            <div className="max-w-2xl mx-auto">
              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-6 px-2">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                      <span className="text-3xl">{targetLangFlag || "💬"}</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t("startChat")}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      {t("welcomeMsg", { lang: targetLangName })}
                    </p>
                  </div>
                  {/* Prompt suggestions */}
                  <div className="w-full max-w-lg space-y-2">
                    <p className="text-xs text-gray-400 dark:text-gray-600 text-center uppercase tracking-wider font-medium">
                      {t("suggestionsLabel")}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { icon: "👋", text: t("suggestion1") },
                        { icon: "🛒", text: t("suggestion2") },
                        { icon: "✏️", text: t("suggestion3") },
                        { icon: "🗣️", text: t("suggestion4") },
                      ].map((s) => (
                        <button
                          key={s.text}
                          onClick={() => { setInput(s.text); inputRef.current?.focus(); }}
                          className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-left text-sm text-gray-700 dark:text-gray-300 transition-all group"
                        >
                          <span className="text-base flex-shrink-0">{s.icon}</span>
                          <span className="group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors leading-snug">{s.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${msg.role === "user" ? "self-end items-end ml-auto" : "self-start items-start mr-auto"}`}
                  >
                    {msg.role === "user" ? (
                      <div className="bg-blue-600/90 hover:bg-blue-600 px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-md transition-all text-[15px] leading-relaxed break-words border border-blue-500/30">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="space-y-2 w-full">
                        <div className="bg-gray-100 dark:bg-gray-800/90 backdrop-blur border border-gray-200 dark:border-gray-700/50 px-5 py-3.5 rounded-2xl rounded-tl-sm shadow-lg overflow-hidden group transition-all relative">
                          <p className="text-[16px] leading-relaxed text-gray-800 dark:text-blue-50">{msg.content}</p>
                          {msg.translation && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/5">
                              <p className="text-[14px] leading-relaxed text-gray-600 dark:text-gray-400 font-light group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                                {msg.translation}
                              </p>
                            </div>
                          )}
                          <button
                            onClick={() => copyMessage(msg.id, msg.content)}
                            className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-500 dark:text-gray-400 transition-all"
                            title="Copy"
                          >
                            {copiedId === msg.id ? (
                              <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        {msg.correction && (
                          <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                            <span className="text-amber-400 text-sm flex-shrink-0 mt-0.5">✏️</span>
                            <p className="text-xs text-amber-300/90 leading-relaxed">{msg.correction}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex self-start mr-auto">
                    <div className="bg-gray-100 dark:bg-gray-800/80 px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-2 shadow-sm border border-gray-200 dark:border-gray-700/50">
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
          <div className="absolute bottom-0 left-0 right-0 px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-white via-white/95 to-transparent dark:from-gray-950 dark:via-gray-950/90 dark:to-transparent">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-2xl backdrop-blur-2xl transition-all focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20">
                <form onSubmit={sendMessage} className="flex items-center px-2 py-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                    placeholder={t("inputPlaceholder", { lang: targetLangName })}
                    className="flex-1 bg-transparent border-none text-gray-900 dark:text-white focus:ring-0 placeholder-gray-500 px-4 text-base h-12 outline-none"
                    autoComplete="off"
                    disabled={loading}
                  />
                  {input.length > 0 && (
                    <span className={`text-xs px-2 flex-shrink-0 ${input.length >= MAX_CHARS ? "text-red-400" : input.length > MAX_CHARS * 0.8 ? "text-amber-400" : "text-gray-400 dark:text-gray-500"}`}>
                      {input.length}/{MAX_CHARS}
                    </span>
                  )}
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
