"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import toast from "react-hot-toast";
import { splitTextForSpeechPauses, WARM_TTS } from "@/lib/speechTts";
import { UserMenu } from "@/components/UserMenu";
import { useTranslations, useLocale } from "next-intl";
import { FlagIcon } from "@/components/FlagIcon";
import { useTheme } from "next-themes";

// ── Types ─────────────────────────────────────────────────────────────────────

type WordOfDay = {
  word: string;
  translation: string;
  pronunciation: string;
  partOfSpeech: string;
  example: string;
  exampleTranslation: string;
  tip: string;
};

type VocabWord = { word: string; definition: string };

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  translation?: string;
  correction?: string;
  createdAt?: string;
  words?: VocabWord[];
};

type Conversation = {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  topicId?: string | null;
  topicLabel?: string | null;
};

type UserProp = {
  id?: string;
  name?: string | null;
  email?: string | null;
  targetLang?: string;
  nativeLang?: string;
  role?: string;
  cefrLevel?: string;
  xp?: number;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const CONVERSATIONS_CACHE_KEY_PREFIX = "chat_conversations_cache_v1";
const MAX_CHARS = 2000;
const DAILY_GOAL = 20;

const CHAT_TOPICS = [
  { id: "cafe",         label: "Kafede sipariş",  description: "Baristadan kahve siparişi ver.", icon: "☕" },
  { id: "travel-hotel", label: "Otel resepsiyonu", description: "Check-in, oda ve kahvaltı.",    icon: "✈️" },
  { id: "job-interview",label: "İş görüşmesi",     description: "Kendini tanıt, deneyimlerini anlat.", icon: "💼" },
  { id: "friends",      label: "Günlük sohbet",    description: "Günlük hayat ve planlar.",       icon: "🌤️" },
  { id: "small-talk",   label: "Small talk",        description: "Hava durumu, hobiler.",          icon: "🗣️" },
] as const;

const TOPIC_ICONS: Record<string, string> = {
  cafe: "☕", "travel-hotel": "✈️", "job-interview": "💼", friends: "🌤️", "small-talk": "🗣️",
};

const CEFR_GRAMMAR: Record<string, { title: string; session: string; topics: { label: string; done: boolean }[] }> = {
  A1: { title: "Present Simple",   session: "Temel Zaman Kipi",    topics: [{ label: "Özne + fiil yapısı", done: true }, { label: "Olumlu/Olumsuz cümle", done: true }, { label: "Soru cümlesi", done: false }] },
  A2: { title: "Past Simple",      session: "Geçmiş Zaman",        topics: [{ label: "Regular Verbs (-ed)", done: true }, { label: "Irregular Verbs", done: true }, { label: "Was / Were", done: false }] },
  B1: { title: "Present Perfect",  session: "Deneyim & Sonuç",     topics: [{ label: "Have / Has kullanımı", done: true }, { label: "Regular past participle", done: true }, { label: "Irregular verbs", done: false }] },
  B2: { title: "Conditionals",     session: "Koşul Cümleleri",     topics: [{ label: "Zero & First Conditional", done: true }, { label: "Second Conditional", done: true }, { label: "Third Conditional", done: false }] },
  C1: { title: "Advanced Modals",  session: "İleri Kiplik Fiiller", topics: [{ label: "Deduction & Speculation", done: true }, { label: "Perfect Modals", done: true }, { label: "Passive Modals", done: false }] },
  C2: { title: "Nuance & Style",   session: "Üst Düzey Üslup",    topics: [{ label: "Inversion structures", done: true }, { label: "Cleft sentences", done: false }, { label: "Discourse markers", done: false }] },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseCorrection(text: string): { original: string; corrected: string; rule: string } | null {
  const cleaned = text.replace(/^✏️\s*/, "").trim();
  const arrowIdx = cleaned.indexOf("→");
  if (arrowIdx === -1) return null;
  const original = cleaned.slice(0, arrowIdx).trim();
  const rest = cleaned.slice(arrowIdx + 1).trim();
  const dashIdx = rest.indexOf("—");
  if (dashIdx === -1) return { original, corrected: rest, rule: "" };
  return { original, corrected: rest.slice(0, dashIdx).trim(), rule: rest.slice(dashIdx + 1).trim() };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatInterface({ user }: { user: UserProp }) {
  const t        = useTranslations("chat");
  const tNav     = useTranslations("nav");
  const tLangs   = useTranslations("languages");
  const locale   = useLocale();
  const { theme, setTheme } = useTheme();
  const isDark   = theme !== "light";

  const targetLang      = user.targetLang?.toLowerCase() ?? "en";
  const cefrLevel       = user.cefrLevel ?? "A1";
  const userXp          = user.xp ?? 0;
  const cacheKey        = `${CONVERSATIONS_CACHE_KEY_PREFIX}:${user.id ?? user.email ?? "anon"}`;
  const targetLangName  = tLangs(targetLang as Parameters<typeof tLangs>[0], { defaultValue: targetLang.toUpperCase() });
  const grammar         = CEFR_GRAMMAR[cefrLevel] ?? CEFR_GRAMMAR["B1"];

  // ── State ─────────────────────────────────────────────────────────────────

  const [conversations,  setConversations]  = useState<Conversation[]>([]);
  const [activeConvId,   setActiveConvId]   = useState<string | null>(null);
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [input,          setInput]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isMobile,       setIsMobile]       = useState(false);
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [deletingId,     setDeletingId]     = useState<string | null>(null);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [copiedId,       setCopiedId]       = useState<string | null>(null);
  const [speakingId,     setSpeakingId]     = useState<string | null>(null);
  const [progressPct,    setProgressPct]    = useState(0);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [selectedTopic,  setSelectedTopic]  = useState<string | null>(null);
  const [wordOfDay,      setWordOfDay]      = useState<WordOfDay | null>(null);
  const [wodLoading,     setWodLoading]     = useState(true);
  const [activeTab,      setActiveTab]      = useState<"chat" | "grammar" | "vocab">("chat");

  const endRef        = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLTextAreaElement>(null);
  const comingSoonRef = useRef<HTMLDivElement>(null);
  const searchParams  = useSearchParams();
  const convFromUrl   = searchParams?.get("conv");

  // Daily messages count (user messages in loaded messages)
  const dailyMsgCount = messages.filter((m) => m.role === "user").length;
  const goalPct       = Math.min(Math.round((dailyMsgCount / DAILY_GOAL) * 100), 100);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (comingSoonRef.current && !comingSoonRef.current.contains(e.target as Node))
        setShowComingSoon(false);
    };
    if (showComingSoon) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showComingSoon]);

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

  useEffect(() => {
    fetch("/api/user/progress", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((d: { xp?: number } | null) => { if (d && typeof d.xp === "number") setProgressPct(d.xp % 100); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setWodLoading(true);
    fetch("/api/word-of-day", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((d: WordOfDay | null) => { if (d?.word) setWordOfDay(d); })
      .catch(() => {})
      .finally(() => setWodLoading(false));
  }, []);

  // ── Cache helpers ─────────────────────────────────────────────────────────

  const readCache = useCallback((): Conversation[] => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Conversation[]) : [];
    } catch { return []; }
  }, [cacheKey]);

  useEffect(() => {
    const cached = readCache();
    setConversations(cached.length > 0 ? cached : []);
  }, [readCache]);

  useEffect(() => {
    try { localStorage.setItem(cacheKey, JSON.stringify(conversations)); } catch { /* ignore */ }
  }, [conversations, cacheKey]);

  // ── API handlers ──────────────────────────────────────────────────────────

  const fetchConversations = useCallback(async (): Promise<Conversation[]> => {
    try {
      const res = await fetch("/api/conversations", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const normalized = Array.isArray(data) ? (data as Conversation[]) : [];
      setConversations(normalized);
      return normalized;
    } catch {
      const cached = readCache();
      if (cached.length > 0) { setConversations(cached); return cached; }
    }
    return [];
  }, [readCache]);

  const loadConversation = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/chat?id=${convId}&limit=100`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setActiveConvId(data.id || null);
        setMessages(data.messages || []);
      }
    } catch { toast.error(t("loadError")); }
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

  // ── UI handlers ───────────────────────────────────────────────────────────

  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setSelectedTopic(null);
    inputRef.current?.focus();
    if (isMobile) setSidebarOpen(false);
  };

  const handleSelectTopic = (topicId: string) => {
    setSelectedTopic(topicId === selectedTopic ? null : topicId);
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
        if (activeConvId === convId) { setActiveConvId(null); setMessages([]); }
        toast.success(t("deleted"));
      } else { toast.error(t("deleteError")); }
    } catch { toast.error(t("genericError")); }
    finally { setDeletingId(null); }
  };

  // ── Send message ──────────────────────────────────────────────────────────

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          ...(activeConvId   ? { conversationId: activeConvId } : {}),
          ...(selectedTopic  ? { topicId: selectedTopic }       : {}),
        }),
      });

      if (!res.ok) {
        let apiError = "Chat failed";
        try {
          const err = await res.json();
          if (err?.error) apiError = String(err.error);
        } catch {
          try { const txt = await res.text(); if (txt?.trim()) apiError = txt.trim(); } catch { /* noop */ }
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
          prev.map((c) => c.id === newConvId ? { ...c, updatedAt: new Date().toISOString() } : c)
        );
      }
      setMessages((prev) => [...prev, data.message]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("sendError"));
      setMessages((prev) => prev.slice(0, -1));
    } finally { setLoading(false); }
  };

  // ── Copy & TTS ────────────────────────────────────────────────────────────

  const copyMessage = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toSpeechLang = (code: string) => {
    const c = code.toLowerCase();
    const map: Record<string, string> = { en: "en-US", tr: "tr-TR", de: "de-DE", fr: "fr-FR", es: "es-ES", ja: "ja-JP", zh: "zh-CN", "zh-cn": "zh-CN" };
    return map[c] ?? code;
  };

  const pickVoice = (langCode: string) => {
    const voices = typeof window !== "undefined" ? window.speechSynthesis.getVoices?.() ?? [] : [];
    const desired = langCode.toLowerCase();
    return voices.find((v) => v.lang.toLowerCase().startsWith(desired)) ?? voices[0];
  };

  const speakMessage = (id: string, text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (speakingId === id) { window.speechSynthesis.cancel(); setSpeakingId(null); return; }
    window.speechSynthesis.cancel();
    const chunks = splitTextForSpeechPauses(text);
    const lang   = toSpeechLang(targetLang);
    const voice  = pickVoice(lang);
    const utts   = chunks.map((chunk) => {
      const u = new SpeechSynthesisUtterance(chunk);
      u.lang = lang; u.rate = WARM_TTS.rate; u.pitch = WARM_TTS.pitch; u.volume = 1;
      if (voice) u.voice = voice;
      return u;
    });
    setSpeakingId(id);
    let idx = 0;
    const next = () => {
      if (idx >= utts.length) { setSpeakingId(null); return; }
      const u = utts[idx++];
      u.onend  = () => { if (idx >= utts.length) { setSpeakingId(null); return; } window.setTimeout(next, WARM_TTS.interChunkMs); };
      u.onerror = () => setSpeakingId(null);
      window.speechSynthesis.speak(u);
    };
    next();
  };

  // ── Utilities ─────────────────────────────────────────────────────────────

  const getConvTitle = (conv: Conversation): string => {
    if (conv.topicLabel) return conv.topicLabel;
    const first = conv.messages[0];
    if (!first) return new Date(conv.createdAt).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US");
    return first.content.length > 28 ? `${first.content.slice(0, 28)}…` : first.content;
  };

  const getRelativeTime = (dateStr: string): string => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins   = Math.floor(diffMs / 60000);
    const hours  = Math.floor(mins / 60);
    const days   = Math.floor(hours / 24);
    const rtf    = new Intl.RelativeTimeFormat(locale === "tr" ? "tr" : "en", { numeric: "auto" });
    if (mins  < 1)  return rtf.format(0, "seconds");
    if (mins  < 60) return rtf.format(-mins,  "minutes");
    if (hours < 24) return rtf.format(-hours, "hours");
    if (days  < 7)  return rtf.format(-days,  "days");
    return new Date(dateStr).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US");
  };

  const saveWordToVocab = async (word: string, translation: string) => {
    if (!word || !translation) { toast.error("Kelime bilgisi eksik"); return; }
    try {
      const res = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, translation, language: targetLang, example: "" }),
      });
      if (!res.ok) throw new Error();
      toast.success(`"${word}" kelime bankasına eklendi`);
    } catch { toast.error("Kelime kaydedilemedi"); }
  };

  const filteredConversations = conversations.filter((c) =>
    !searchQuery.trim() || getConvTitle(c).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────────────────────

  const promptSuggestions = [t("suggestion1"), t("suggestion2"), t("suggestion3"), t("suggestion4")];

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-white">

      {/* ── MOBILE OVERLAY ── */}
      {isMobile && sidebarOpen && (
        <button
          type="button"
          aria-label={t("hideHistory")}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
        />
      )}

      {/* ══════════════════════════════════════════════
          LEFT SIDEBAR
      ══════════════════════════════════════════════ */}
      <aside className={`
        ${isMobile ? "fixed top-0 left-0 bottom-0 z-40 transition-transform duration-300 " + (sidebarOpen ? "translate-x-0" : "-translate-x-full") : "relative"}
        w-[260px] min-w-[260px] flex flex-col
        border-r border-gray-200 dark:border-white/8
        bg-white dark:bg-[#16181f]
      `}>

        {/* Brand */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
            🧠
          </div>
          <div>
            <div className="text-[15px] font-bold tracking-tight">AiTut</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">AI Language Tutor</div>
          </div>
        </div>

        {/* New Chat button */}
        <div className="px-3 pb-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 active:scale-[0.98] text-white rounded-xl text-[13px] font-semibold transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
            {t("newChat")}
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full pl-8 pr-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg text-xs text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400/50 transition-all"
            />
          </div>
        </div>

        {/* Section label */}
        <div className="px-5 pb-2 text-[10px] font-bold tracking-widest uppercase text-gray-400 dark:text-gray-500">
          Konuşmalar
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto px-2">
          {loadingHistory ? (
            <div className="space-y-1.5 px-1">
              {[1,2,3,4].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-10 px-4">
              {t("noConversations")}
            </p>
          ) : (
            <div className="space-y-0.5">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-all ${
                    activeConvId === conv.id
                      ? "bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20"
                      : "border border-transparent hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
                    activeConvId === conv.id
                      ? "bg-gradient-to-br from-indigo-500 to-purple-500 text-white"
                      : "bg-gray-100 dark:bg-white/8"
                  }`}>
                    {conv.topicId ? (TOPIC_ICONS[conv.topicId] ?? "💬") : "💬"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate leading-tight text-gray-900 dark:text-gray-100">{getConvTitle(conv)}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{getRelativeTime(conv.updatedAt)}</p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    disabled={deletingId === conv.id}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/15 text-gray-400 hover:text-red-400 transition-all flex-shrink-0 disabled:opacity-30"
                  >
                    {deletingId === conv.id ? (
                      <div className="w-3 h-3 border-2 border-red-400/40 border-t-red-400 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav className="px-2 pt-2 border-t border-gray-200 dark:border-white/8">
          {[
            { href: "/dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", label: "Dashboard" },
            { href: "/vocabulary", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", label: "Kelime Bankası" },
            { href: "/progress", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", label: "İlerleme" },
          ].map(({ href, icon, label }) => (
            <Link
              key={href}
              href={href as "/dashboard" | "/vocabulary" | "/progress"}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-all mb-0.5"
            >
              <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
              {label}
            </Link>
          ))}
        </nav>

        {/* User row */}
        <div className="mx-2 mb-3 mt-1 p-2.5 rounded-xl flex items-center gap-2.5 border border-gray-200 dark:border-white/8 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-all">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0">
            {(user.name?.charAt(0) ?? "U").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate">{user.name ?? "User"}</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">{cefrLevel} · {targetLangName}</p>
          </div>
          <div className="text-[11px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-full flex-shrink-0">
            ⚡{userXp}
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════
          MAIN CHAT AREA
      ══════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0" style={{ background: isDark ? "#0f1117" : "#f8f9fb" }}>

        {/* Header */}
        <header
          className="flex items-center gap-3 px-5 h-[60px] flex-shrink-0"
          style={{
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
            background: isDark ? "#16181f" : "#ffffff",
          }}
        >
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="xl:hidden p-2 rounded-xl transition-all"
            style={{ background: isDark ? "rgba(255,255,255,0.06)" : "#f1f1f4" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={isDark ? "#9ca3af" : "#4b5563"}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Lang pill */}
          <div className="flex items-center gap-2">
            <FlagIcon code={targetLang} className="w-5 h-4" />
            <span className="text-[14px] font-bold" style={{ color: isDark ? "#f1f5f9" : "#111827" }}>{targetLangName}</span>
          </div>
          <span
            className="text-[11px] font-bold px-2 py-1 rounded-md"
            style={{ background: "rgba(99,102,241,0.12)", color: isDark ? "#818cf8" : "#4f46e5" }}
          >
            {cefrLevel}
          </span>
          <span className="w-1 h-1 rounded-full" style={{ background: isDark ? "#4b5563" : "#d1d5db" }} />
          <span className="text-[13px] hidden sm:block" style={{ color: isDark ? "#6b7280" : "#9ca3af" }}>AI Tutor</span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Tabs */}
          <div
            className="hidden md:flex items-center gap-1 p-1 rounded-xl"
            style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6" }}
          >
            {([
              { id: "chat",    label: "💬 Sohbet" },
              { id: "grammar", label: "📖 Gramer" },
              { id: "vocab",   label: "🔤 Vocab"  },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                style={
                  activeTab === tab.id
                    ? { background: isDark ? "#252830" : "#ffffff", color: isDark ? "#f1f5f9" : "#111827", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }
                    : { color: isDark ? "#6b7280" : "#9ca3af" }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            style={{ background: isDark ? "rgba(255,255,255,0.06)" : "#f1f1f4" }}
            title={isDark ? "Aydınlık mod" : "Karanlık mod"}
          >
            {isDark ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#f9d71c" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#6366f1" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Right controls */}
          <UserMenu user={user} role={user.role} />
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 md:px-8 py-6 space-y-5">
          {messages.length === 0 && !loading ? (
            /* Empty state */
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4 text-2xl">
                <FlagIcon code={targetLang} className="w-8 h-6" />
              </div>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t("startChat")}</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-xs">{t("welcomeMsg", { lang: targetLangName })}</p>
              {/* Quick suggestion pills */}
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {promptSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:border-indigo-400/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.map((msg) => {
                const correction = msg.correction ? parseCorrection(msg.correction) : null;
                const isUser     = msg.role === "user";

                return (
                  <div key={msg.id} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold ${
                      isUser
                        ? "bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300"
                        : "bg-gradient-to-br from-indigo-500 to-purple-500 text-white"
                    }`}>
                      {isUser ? (user.name?.charAt(0) ?? "U").toUpperCase() : "🤖"}
                    </div>

                    {/* Message body */}
                    <div className={`flex flex-col gap-2 max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">
                        {isUser ? "Sen" : "AI Tutor · Online"}
                      </span>

                      {/* Bubble */}
                      <div
                        className="px-4 py-3 text-[14px] leading-relaxed shadow-sm"
                        style={{
                          borderRadius: isUser ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                          background: isUser ? "#6366f1" : (isDark ? "#1e2028" : "#ffffff"),
                          color: isUser ? "#ffffff" : (isDark ? "#e2e8f0" : "#1f2937"),
                          border: isUser ? "none" : `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
                        }}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>

                      {/* Translation */}
                      {msg.translation && (
                        <div className={`text-[12px] text-gray-400 dark:text-gray-500 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center gap-1.5 ${isUser ? "self-end" : "self-start"}`}>
                          🇹🇷 <span>{msg.translation}</span>
                        </div>
                      )}

                      {/* Correction card */}
                      {correction && (
                        <div
                          className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-[12.5px] self-start max-w-full"
                          style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)" }}
                        >
                          <span className="text-sm flex-shrink-0 mt-px">✏️</span>
                          <div className="min-w-0">
                            <p className="font-semibold text-red-500 dark:text-red-400 text-[11px] uppercase tracking-wider mb-1">Gramer Düzeltmesi</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="line-through text-gray-400 dark:text-gray-500">{correction.original}</span>
                              <span className="text-gray-400">→</span>
                              <span className="bg-green-500/12 dark:bg-green-500/15 text-green-600 dark:text-green-400 font-bold px-2 py-0.5 rounded-md">
                                {correction.corrected}
                              </span>
                            </div>
                            {correction.rule && (
                              <p className="text-gray-400 dark:text-gray-500 text-[11.5px] mt-1">{correction.rule}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Vocab pills */}
                      {msg.words && msg.words.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 self-start">
                          {msg.words.map((w) => (
                            <button
                              key={w.word}
                              onClick={() => saveWordToVocab(w.word, w.definition)}
                              title="Kelime bankasına ekle"
                              className="flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full transition-all"
                              style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.2)", color: isDark ? "#818cf8" : "#4f46e5" }}
                            >
                              {w.word}
                              <span className="font-normal text-gray-400 dark:text-gray-500 text-[11px]">· {w.definition}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* AI message actions */}
                      {!isUser && (
                        <div className="flex items-center gap-1.5 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => speakMessage(msg.id, msg.content)}
                            title={speakingId === msg.id ? "Durdur" : "Dinle"}
                            className={`p-1.5 rounded-lg transition-all text-[12px] ${
                              speakingId === msg.id
                                ? "bg-indigo-500 text-white"
                                : "bg-gray-100 dark:bg-white/8 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {speakingId === msg.id ? (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10h6v4H9z" /></svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" /></svg>
                            )}
                          </button>
                          <button
                            onClick={() => copyMessage(msg.id, msg.content)}
                            title="Kopyala"
                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/8 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-500 dark:text-gray-400 transition-all"
                          >
                            {copiedId === msg.id ? (
                              <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex-shrink-0 flex items-center justify-center text-sm">🤖</div>
                  <div
                    className="px-4 py-3.5"
                    style={{
                      borderRadius: "4px 16px 16px 16px",
                      background: isDark ? "#1e2028" : "#ffffff",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
                    }}
                  >
                    <div className="flex gap-1.5 items-center">
                      {[0, 200, 400].map((delay) => (
                        <div
                          key={delay}
                          className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* ── Input area ── */}
        <div
          className="px-5 py-4 flex-shrink-0"
          style={{
            borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
            background: isDark ? "#16181f" : "#ffffff",
          }}
        >
          <form onSubmit={sendMessage}>
            <div
              className="flex items-end gap-2.5 rounded-2xl px-3 py-2.5 transition-all shadow-sm"
              style={{
                background: isDark ? "#252830" : "#f3f4f6",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"}`,
              }}
            >
              {/* Attach / coming-soon */}
              <div className="relative" ref={comingSoonRef}>
                <button
                  type="button"
                  onClick={() => setShowComingSoon((v) => !v)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
                {showComingSoon && (
                  <div className="absolute bottom-12 left-0 z-50 w-64 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-xl p-4">
                    <div className="flex items-center gap-2 mb-2"><span>✨</span><p className="text-sm font-semibold">Coming Soon</p></div>
                    <p className="text-xs text-gray-400 leading-relaxed">Dosya paylaşımı, sesli mesaj ve daha fazlası yolda! 🚀</p>
                  </div>
                )}
              </div>

              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value.slice(0, MAX_CHARS));
                  // Auto-resize
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage(e as unknown as React.FormEvent);
                  }
                }}
                placeholder={t("inputPlaceholder", { lang: targetLangName })}
                className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] outline-none resize-none leading-relaxed py-1"
                style={{
                  color: isDark ? "#f1f5f9" : "#111827",
                  minHeight: "40px",
                  maxHeight: "140px",
                }}
                autoComplete="off"
                disabled={loading}
              />

              {input.length > MAX_CHARS * 0.8 && (
                <span className={`text-xs flex-shrink-0 ${input.length >= MAX_CHARS ? "text-red-400" : "text-amber-400"}`}>
                  {input.length}/{MAX_CHARS}
                </span>
              )}

              {/* Mic */}
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all flex-shrink-0"
                style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: isDark ? "#6b7280" : "#9ca3af" }}
              >
                🎙️
              </button>

              {/* Send */}
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-white hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
          </form>

          {/* Status line */}
          <div className="flex items-center gap-4 pt-2 px-1">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              Otomatik Çeviri
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
              Gramer Koçu
            </div>
            {selectedTopic && (
              <div className="flex items-center gap-1.5 text-[11px] text-indigo-400">
                <span>{TOPIC_ICONS[selectedTopic] ?? "💬"}</span>
                {CHAT_TOPICS.find((t) => t.id === selectedTopic)?.label}
                <button onClick={() => setSelectedTopic(null)} className="ml-0.5 hover:text-red-400">×</button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════════
          RIGHT PANEL
      ══════════════════════════════════════════════ */}
      <aside
        className="hidden xl:flex w-[280px] min-w-[280px] flex-col overflow-y-auto p-4 gap-4"
        style={{
          borderLeft: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
          background: isDark ? "#16181f" : "#ffffff",
        }}
      >

        {/* Word of Day */}
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-white/8 p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Günün Kelimesi</p>
          {wodLoading ? (
            <div className="space-y-2">
              <div className="h-7 w-3/4 bg-gray-200 dark:bg-white/8 rounded-lg animate-pulse" />
              <div className="h-4 w-1/2 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
              <div className="h-12 bg-gray-200 dark:bg-white/8 rounded-xl animate-pulse" />
            </div>
          ) : wordOfDay ? (
            <>
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xl font-black bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                  {wordOfDay.word}
                </span>
                <button
                  onClick={() => {
                    if (typeof window !== "undefined" && window.speechSynthesis) {
                      const u = new SpeechSynthesisUtterance(wordOfDay.word);
                      u.lang = toSpeechLang(targetLang);
                      window.speechSynthesis.speak(u);
                    }
                  }}
                  className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/20 transition-all flex-shrink-0 text-[13px]"
                >
                  🔊
                </button>
              </div>
              <p className="text-[12px] text-gray-400 dark:text-gray-500 italic mb-1">{wordOfDay.pronunciation} · {wordOfDay.partOfSpeech}</p>
              <p className="text-[13px] text-gray-700 dark:text-gray-300 mb-2">{wordOfDay.translation}</p>
              <div className="bg-gray-100 dark:bg-white/5 rounded-xl p-2.5 border-l-[3px] border-indigo-500">
                <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed italic">&ldquo;{wordOfDay.example}&rdquo;</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{wordOfDay.exampleTranslation}</p>
              </div>
              {wordOfDay.tip && (
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 flex gap-1"><span>💡</span>{wordOfDay.tip}</p>
              )}
            </>
          ) : (
            <p className="text-[13px] text-gray-400">Kelime yüklenemedi.</p>
          )}
        </div>

        {/* Grammar Focus */}
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-white/8 p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Gramer Odağı</p>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[13px] flex-shrink-0">
              ⏱️
            </div>
            <div>
              <p className="text-[14px] font-bold text-gray-900 dark:text-white">{grammar.title}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{grammar.session}</p>
            </div>
          </div>
          <div className="space-y-2">
            {grammar.topics.map((topic) => (
              <div key={topic.label} className={`flex items-center gap-2 text-[12.5px] ${topic.done ? "text-gray-400 dark:text-gray-500" : "text-gray-800 dark:text-gray-200"}`}>
                {topic.done ? (
                  <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
                )}
                <span className={topic.done ? "line-through" : "font-medium"}>{topic.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Goal */}
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-white/8 p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Günlük Hedef</p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold text-gray-900 dark:text-white">{DAILY_GOAL} mesaj hedefi</span>
            <span className="text-[18px] font-black text-indigo-500">{goalPct}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${goalPct}%` }}
            />
          </div>
          <p className="text-[11.5px] text-gray-400 dark:text-gray-500 mt-2">
            {dailyMsgCount} / {DAILY_GOAL} mesaj gönderildi
            {dailyMsgCount >= DAILY_GOAL ? " 🎉 Hedef tamamlandı!" : ` — ${DAILY_GOAL - dailyMsgCount} mesaj kaldı`}
          </p>
        </div>

        {/* XP + Seviye */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-white/8 p-3 text-center">
            <p className="text-[18px] font-black text-yellow-500">⚡{userXp}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Toplam XP</p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-white/8 p-3 text-center">
            <p className="text-[18px] font-black text-orange-400">🔥{Math.floor(progressPct / 10) + 1}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Seviye</p>
          </div>
        </div>

        {/* Scenarios */}
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-white/8 p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Senaryolar</p>
          <div className="space-y-1.5">
            {CHAT_TOPICS.map((topic) => (
              <button
                key={topic.id}
                onClick={() => handleSelectTopic(topic.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all border ${
                  selectedTopic === topic.id
                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-500 dark:text-indigo-400"
                    : "bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-white/5 hover:border-gray-200 dark:hover:border-white/10 text-gray-700 dark:text-gray-300"
                }`}
              >
                <span className="text-base flex-shrink-0">{topic.icon}</span>
                <div>
                  <p className="text-[12.5px] font-semibold leading-tight">{topic.label}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{topic.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Admin link */}
        {user.role === "admin" && (
          <Link
            href="/admin"
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-500 text-[13px] font-semibold hover:bg-amber-500/10 transition-all"
          >
            ⚙️ {tNav("adminPanel")}
          </Link>
        )}
      </aside>
    </div>
  );
}
