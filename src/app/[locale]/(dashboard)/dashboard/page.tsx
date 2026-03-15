"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FlagIcon } from "@/components/FlagIcon";

type DashboardData = {
  streak: number;
  totalConversations: number;
  totalMessages: number;
  recentConversations: { id: string; updatedAt: string; title: string }[];
  xp: number;
  level: number;
  xpInLevel: number;
};

type WordOfDay = {
  word: string;
  translation: string;
  pronunciation: string;
  partOfSpeech: string;
  example: string;
  exampleTranslation: string;
  tip: string;
};

const DAILY_TIPS = [
  "Try speaking for 10 minutes without switching to your native language.",
  "Describe what you see around you in your target language.",
  "Ask the AI to explain a grammar rule you find confusing.",
  "Practice ordering food at a restaurant in your target language.",
  "Try to think in your target language for just 5 minutes today.",
  "Ask the AI to give you 5 new vocabulary words to practice.",
  "Write a short diary entry in your target language.",
];

const CEFR_COLORS: Record<string, string> = {
  A1: "bg-gray-500/20 text-gray-600 dark:text-gray-300 border-gray-400/30",
  A2: "bg-green-500/20 text-green-700 dark:text-green-300 border-green-400/30",
  B1: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-400/30",
  B2: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-400/30",
  C1: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-400/30",
  C2: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400/30",
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const t = useTranslations("dashboard");
  const tNav = useTranslations("nav");
  const tLangs = useTranslations("languages");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [wordOfDay, setWordOfDay] = useState<WordOfDay | null>(null);
  const [wordLoading, setWordLoading] = useState(true);

  const user = session?.user as {
    name?: string | null;
    targetLang?: string;
    nativeLang?: string;
    cefrLevel?: string;
  } | undefined;
  const targetLang = user?.targetLang?.toLowerCase() ?? "en";
  const targetLangName = tLangs(targetLang as Parameters<typeof tLangs>[0], {
    defaultValue: targetLang.toUpperCase(),
  });
  const cefrLevel = user?.cefrLevel ?? "A1";
  const cefrColor = CEFR_COLORS[cefrLevel] ?? CEFR_COLORS.A1;
  const dailyTip = DAILY_TIPS[new Date().getDay() % DAILY_TIPS.length];

  useEffect(() => {
    fetch("/api/user/dashboard")
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));

    fetch("/api/word-of-day")
      .then((res) => (res.ok ? res.json() : null))
      .then(setWordOfDay)
      .catch(() => setWordOfDay(null))
      .finally(() => setWordLoading(false));
  }, []);

  const getRelativeTime = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 1) return t("time.justNow");
    if (mins < 60) return t("time.minutesAgo", { count: mins });
    if (hours < 24) return t("time.hoursAgo", { count: hours });
    if (days < 7) return t("time.daysAgo", { count: days });
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 dark:from-white dark:via-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
                {t("welcome", { name: user?.name?.split(" ")[0] || "there" })}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400 text-base sm:text-lg">
                {t("subtitle", { lang: targetLangName })}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${cefrColor}`}>
                {cefrLevel}
              </span>
              <ThemeToggle />
            </div>
          </div>
          <div className="mt-3">
            <span className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <FlagIcon code={targetLang} className="w-5 h-4" />
              <span>{targetLangName}</span>
            </span>
          </div>
          {/* Daily tip */}
          <div className="mt-5 flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
            <span className="text-lg flex-shrink-0">💡</span>
            <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">{dailyTip}</p>
          </div>
        </header>

        {/* XP / Level bar */}
        <div className="mb-6 p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">⭐</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Level {loading ? "—" : (data?.level ?? 1)}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {loading ? "—" : `${data?.xpInLevel ?? 0} / 100 XP`}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-700"
              style={{ width: loading ? "0%" : `${data?.xpInLevel ?? 0}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1.5">
            {loading ? "" : `${data?.xp ?? 0} total XP · +10 XP per message · +5 XP per saved word`}
          </p>
        </div>

        {/* Word of the Day */}
        <div className="mb-6 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5 overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-500/10 flex items-center gap-2">
            <span className="text-base">✨</span>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Word of the Day</h2>
          </div>
          {wordLoading ? (
            <div className="px-5 py-5 space-y-2">
              <div className="h-6 w-32 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-48 bg-gray-200 dark:bg-white/5 rounded animate-pulse" />
              <div className="h-4 w-56 bg-gray-200 dark:bg-white/5 rounded animate-pulse" />
            </div>
          ) : wordOfDay ? (
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-start gap-4 flex-wrap">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{wordOfDay.word}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{wordOfDay.pronunciation} · <span className="italic">{wordOfDay.partOfSpeech}</span></p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-base font-semibold text-amber-600 dark:text-amber-300">{wordOfDay.translation}</p>
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-white/5 rounded-xl px-4 py-2.5 italic border border-gray-100 dark:border-white/5">
                <p>{wordOfDay.example}</p>
                <p className="text-gray-400 dark:text-gray-500 mt-1 not-italic text-xs">{wordOfDay.exampleTranslation}</p>
              </div>
              {wordOfDay.tip && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex gap-1.5">
                  <span className="flex-shrink-0">💡</span>
                  <span>{wordOfDay.tip}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="px-5 py-5 text-sm text-gray-500">Could not load word of the day.</div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {/* Streak */}
          <div className="group relative overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-amber-600/5 p-6 transition-all hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-500/10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-orange-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🔥
              </div>
              <div>
                {loading ? (
                  <div className="h-8 w-16 bg-gray-300 dark:bg-white/10 rounded animate-pulse" />
                ) : (
                  <p className="text-3xl font-bold text-orange-400">{data?.streak ?? 0}</p>
                )}
                <p className="text-sm text-gray-400">{t("streak")}</p>
              </div>
            </div>
          </div>

          {/* Conversations */}
          <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 backdrop-blur-sm p-6 transition-all hover:border-blue-500/30 hover:bg-gray-100 dark:hover:bg-white/[0.07]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                💬
              </div>
              <div>
                {loading ? (
                  <div className="h-8 w-16 bg-gray-300 dark:bg-white/10 rounded animate-pulse" />
                ) : (
                  <p className="text-3xl font-bold text-blue-400">{data?.totalConversations ?? 0}</p>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400">{t("conversations")}</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 backdrop-blur-sm p-6 transition-all hover:border-purple-500/30 hover:bg-gray-100 dark:hover:bg-white/[0.07]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                ✉️
              </div>
              <div>
                {loading ? (
                  <div className="h-8 w-16 bg-gray-300 dark:bg-white/10 rounded animate-pulse" />
                ) : (
                  <p className="text-3xl font-bold text-purple-400">{data?.totalMessages ?? 0}</p>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400">{t("messages")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="mb-10">
          <Link
            href="/chat"
            className="flex items-center justify-center gap-3 w-full py-5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-lg shadow-xl shadow-blue-600/25 transition-all hover:shadow-blue-600/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {t("startChat")}
          </Link>
        </div>

        {/* Two columns: Recent + Quick Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Conversations */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50 backdrop-blur-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("recentConversations")}</h2>
              <Link
                href="/chat"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                {t("viewAll")}
              </Link>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : data?.recentConversations?.length ? (
                <div className="space-y-2">
                  {data.recentConversations.map((conv) => (
                    <Link
                      key={conv.id}
                      href={`/chat?conv=${conv.id}`}
                      className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group"
                    >
                      <p className="text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white truncate flex-1 mr-3">
                        {conv.title}
                        {conv.title.length >= 40 ? "…" : ""}
                      </p>
                      <span className="text-xs text-gray-500 dark:text-gray-500 flex-shrink-0">
                        {getRelativeTime(conv.updatedAt)}
                      </span>
                      <svg
                        className="w-4 h-4 text-gray-500 group-hover:text-blue-400 flex-shrink-0 ml-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-gray-600 dark:text-gray-500 mb-4">{t("noConversations")}</p>
                  <Link
                    href="/chat"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl text-sm font-medium transition-colors"
                  >
                    {t("startFirst")}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white px-1">{t("explore")}</h2>
            <Link
              href="/progress"
              className="flex items-center gap-4 p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50 hover:border-blue-500/30 hover:bg-gray-100 dark:hover:bg-white/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                📊
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">My Progress</p>
                <p className="text-sm text-gray-600 dark:text-gray-500">Charts & analytics</p>
              </div>
              <svg className="w-5 h-5 text-gray-500 group-hover:text-blue-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/vocabulary"
              className="flex items-center gap-4 p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50 hover:border-green-500/30 hover:bg-gray-100 dark:hover:bg-white/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                📖
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Vocabulary</p>
                <p className="text-sm text-gray-600 dark:text-gray-500">Your saved words & phrases</p>
              </div>
              <svg className="w-5 h-5 text-gray-500 group-hover:text-green-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/blogs"
              className="flex items-center gap-4 p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50 hover:border-blue-500/30 hover:bg-gray-100 dark:hover:bg-white/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                📚
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{tNav("blogs")}</p>
                <p className="text-sm text-gray-600 dark:text-gray-500">{t("blogsDesc")}</p>
              </div>
              <svg className="w-5 h-5 text-gray-500 group-hover:text-blue-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/pages"
              className="flex items-center gap-4 p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50 hover:border-purple-500/30 hover:bg-gray-100 dark:hover:bg-white/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                📄
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{tNav("pages")}</p>
                <p className="text-sm text-gray-600 dark:text-gray-500">{t("pagesDesc")}</p>
              </div>
              <svg className="w-5 h-5 text-gray-500 group-hover:text-purple-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/documents"
              className="flex items-center gap-4 p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50 hover:border-amber-500/30 hover:bg-gray-100 dark:hover:bg-white/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                📁
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{tNav("documents")}</p>
                <p className="text-sm text-gray-600 dark:text-gray-500">{t("documentsDesc")}</p>
              </div>
              <svg className="w-5 h-5 text-gray-500 group-hover:text-amber-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
