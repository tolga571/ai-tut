"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import toast from "react-hot-toast";
import { UserMenu } from "@/components/UserMenu";
import { useTranslations, useLocale } from "next-intl";
import { FlagIcon } from "@/components/FlagIcon";

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

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState(0);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const convFromUrl = searchParams?.get("conv");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 1280;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
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

  useEffect(() => {
    fetch("/api/user/progress", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((d: { xp?: number } | null) => {
        if (d && typeof d.xp === "number") {
          setProgressPct(d.xp % 100);
        }
      })
      .catch(() => {});
  }, []);

  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    inputRef.current?.focus();
    if (isMobile) setSidebarOpen(false);
  };

  const handleSelectConversation = async (convId: string) => {
    if (convId === activeConvId) return;
    await loadConversation(convId);
    if (isMobile) setSidebarOpen(false);
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
        body: JSON.stringify({
          message: userMessage.content,
          ...(activeConvId ? { conversationId: activeConvId } : {}),
        }),
      });

      if (!res.ok) {
        let apiError = "Chat failed";
        try {
          const errorData = await res.json();
          if (errorData?.error) apiError = String(errorData.error);
        } catch {
          try {
            const textError = await res.text();
            if (textError?.trim()) apiError = textError.trim();
          } catch {
            // no-op
          }
        }
        throw new Error(`${apiError} (HTTP ${res.status})`);
      }

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
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sendError");
      toast.error(message || t("sendError"));
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
    return text.length > 28 ? `${text.slice(0, 28)}...` : text;
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

  const promptSuggestions = [t("suggestion1"), t("suggestion2"), t("suggestion3"), t("suggestion4")];
  const filteredConversations = conversations.filter((conv) =>
    searchQuery.trim() === "" || getConvTitle(conv).toLowerCase().includes(searchQuery.toLowerCase())
  );
  const desktopNavLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/progress", label: "Progress" },
    { href: "/profile", label: "Profile" },
  ] as const;
  const quickLinks = [
    { href: "/vocabulary", label: "Vocabulary" },
    { href: "/blogs", label: tNav("blogs") },
    { href: "/documents", label: tNav("documents") },
  ] as const;
  const headerNavLinkCls = "px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-colors";
  const quickLinkCls = "block rounded-xl px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors";

  return (
    <div className="h-full min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.35] dark:opacity-[0.2] [background-image:radial-gradient(circle_at_1px_1px,rgba(100,116,139,.25)_1px,transparent_0)] [background-size:18px_18px]" />
      </div>

      <div className="relative h-full p-3 sm:p-4 lg:p-5">
        {isMobile && sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-black/40 z-30 lg:hidden"
            aria-label={t("hideHistory")}
          />
        )}

        <div className="h-[calc(100vh-1.5rem)] sm:h-[calc(100vh-2rem)] grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_290px] gap-3">
          <aside
            className={`${
              isMobile
                ? `absolute top-3 left-3 right-3 z-40 max-h-[78vh] transform transition-all duration-300 ${sidebarOpen ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0 pointer-events-none"}`
                : "relative"
            } flex flex-col rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-gray-900/80 backdrop-blur-xl shadow-xl overflow-hidden`}
          >
            <div className="p-4 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold">
                    {(user?.name?.charAt(0) || "U").toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name || "User"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[160px]">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="xl:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label={t("hideHistory")}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="rounded-2xl bg-gray-100/80 dark:bg-white/5 p-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Your Progress</p>
                <div className="flex items-center justify-center">
                  <div
                    className="w-28 h-28 rounded-full grid place-items-center"
                    style={{
                      background: `conic-gradient(rgb(37 99 235) ${progressPct}%, rgb(209 213 219) 0%)`,
                    }}
                  >
                    <div className="w-20 h-20 rounded-full bg-white dark:bg-gray-900 grid place-items-center text-xl font-bold">
                      {progressPct}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 border-b border-gray-200 dark:border-white/10">
              <button
                onClick={handleNewChat}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t("newChat")}
              </button>
              <div className="relative mt-2">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="w-full pl-8 pr-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {loadingHistory ? (
                <div className="space-y-2 px-2 mt-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 bg-gray-200 dark:bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="px-3 py-10 text-center">
                  <p className="text-gray-500 dark:text-gray-500 text-sm">{t("noConversations")}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                        activeConvId === conv.id
                          ? "bg-blue-500/20 dark:bg-blue-600/20 border border-blue-500/30 text-gray-900 dark:text-white"
                          : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border border-transparent"
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

            <div className="p-3 border-t border-gray-200 dark:border-white/10">
              <button className="w-full rounded-full bg-blue-600 text-white text-sm font-medium py-3 hover:bg-blue-500 transition-colors inline-flex items-center justify-center gap-2">
                <FlagIcon code={targetLang} className="w-5 h-4" />
                <span>{targetLangName}</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </aside>

          <section className="min-w-0 rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-gray-900/70 backdrop-blur-xl shadow-xl overflow-hidden flex flex-col">
            <header className="px-4 py-3 border-b border-gray-200 dark:border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <button
                  onClick={() => setSidebarOpen((v) => !v)}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-all text-gray-600 dark:text-gray-400 xl:hidden"
                  title={sidebarOpen ? t("hideHistory") : t("showHistory")}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h1 className="font-semibold text-lg truncate">AiTut Chat</h1>
                <nav className="hidden xl:flex items-center gap-1 ml-3">
                  {desktopNavLinks.map((link) => (
                    <Link key={link.href} href={link.href} className={headerNavLinkCls}>
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <span className="hidden xl:inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <FlagIcon code={targetLang} className="w-5 h-4" />
                  {targetLangName}
                </span>
                <UserMenu user={user} role={user.role} />
              </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-6 py-5">
              {messages.length === 0 && !loading ? (
                <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center px-2">
                  <div className="w-14 h-14 rounded-full bg-blue-500/10 grid place-items-center mb-3">
                    <FlagIcon code={targetLang} className="w-8 h-6" />
                  </div>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t("startChat")}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("welcomeMsg", { lang: targetLangName })}</p>
                </div>
              ) : (
                <div className="space-y-5 max-w-4xl mx-auto">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "ai" && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 grid place-items-center text-xs font-semibold flex-shrink-0">
                          AI
                        </div>
                      )}
                      <div className={`group max-w-[80%] md:max-w-[68%] rounded-2xl px-4 py-3 border shadow-sm relative ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white border-blue-500/40"
                          : "bg-white dark:bg-gray-800/80 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700/50"
                      }`}>
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                        {msg.translation && msg.role === "ai" && (
                          <p className="text-sm mt-2 pt-2 border-t border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300">
                            {msg.translation}
                          </p>
                        )}
                        {msg.role === "ai" && (
                          <button
                            onClick={() => copyMessage(msg.id, msg.content)}
                            className="absolute -top-2 -right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 transition-all"
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
                        )}
                        {msg.correction && (
                          <div className="mt-2 text-xs rounded-lg px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300">
                            {msg.correction}
                          </div>
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 grid place-items-center text-xs font-semibold flex-shrink-0">
                          ME
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="flex">
                      <div className="bg-white dark:bg-gray-800/80 px-4 py-3 rounded-2xl flex items-center gap-2 border border-gray-200 dark:border-gray-700/50">
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}

                  <div ref={endRef} />
                </div>
              )}
            </div>

            <div className="px-3 sm:px-4 pb-4 pt-2 border-t border-gray-200 dark:border-white/10">
              <form onSubmit={sendMessage} className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/50 shadow-lg flex items-center px-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.focus()}
                  className="w-9 h-9 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                  placeholder={t("inputPlaceholder", { lang: targetLangName })}
                  className="flex-1 bg-transparent border-none text-gray-900 dark:text-white focus:ring-0 placeholder-gray-500 px-2 text-base h-12 outline-none"
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
                  className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-40 disabled:bg-gray-800 disabled:text-gray-500 transition-all mr-1"
                >
                  Send
                </button>
              </form>
            </div>
          </section>

          <aside className="hidden xl:flex flex-col rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-gray-900/80 backdrop-blur-xl shadow-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Practice</h2>
              <span className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <FlagIcon code={targetLang} className="w-4 h-3" />
                {targetLangName}
              </span>
            </div>

            <div className="space-y-2">
              {promptSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion);
                    inputRef.current?.focus();
                  }}
                  className="w-full text-left rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-200 dark:border-white/10 space-y-2 text-sm">
              {quickLinks.map((link) => (
                <Link key={link.href} href={link.href} className={quickLinkCls}>
                  {link.label}
                </Link>
              ))}
              {user.role === "admin" && (
                <Link href="/admin" className="block rounded-xl px-3 py-2 text-amber-500 hover:bg-amber-500/10 transition-colors">
                  {tNav("adminPanel")}
                </Link>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
