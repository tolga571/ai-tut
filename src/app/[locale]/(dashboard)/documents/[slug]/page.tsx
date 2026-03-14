import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { ThemeToggle } from '@/components/ThemeToggle';
import { getLocale } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";

// ─── Language display names for the 7 documentation source languages ──────────
// These are the canonical names used in source-language badges.
// Extension point: if PostTranslation model is added in the future, this is
// where you would look up a translated version of the document body:
//   const translation = await prisma.postTranslation.findUnique({
//     where: { postId_locale: { postId: post.id, locale } },
//   });
//   const displayContent = translation?.content ?? post.content;
const DOC_LANG_NAMES: Record<string, string> = {
  ar: "Arabic",
  de: "German",
  en: "English",
  es: "Spanish",
  fr: "French",
  ja: "Japanese",
  zh: "Chinese",
};

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getTranslations("documents");
  const session = await getServerSession(authOptions);

  // ── Auth gate: all documents require a signed-in user ─────────────────────
  if (!session) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
        <header className="px-6 py-4 glass-nav border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
          <Link
            href="/documents"
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("backToDocs")}
          </Link>
          <ThemeToggle />
        </header>
        <div className="flex flex-col items-center justify-center py-32 text-center px-4">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t("loginRequired")}</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 max-w-sm">{t("loginDesc")}</p>
          <Link
            href="/login"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition-all"
          >
            {t("signIn")}
          </Link>
        </div>
      </div>
    );
  }

  const post = await prisma.post.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      content: true,
      language: true,
      category: true,
      published: true,
      isPremium: true,
      createdAt: true,
      author: { select: { name: true } },
    },
  });

  if (!post || post.category !== "document" || !post.published) {
    notFound();
  }

  const isPaidUser = (session.user as { planStatus?: string })?.planStatus === "active";
  const isLocked = post.isPremium && !isPaidUser;

  // ── Source language vs UI language ────────────────────────────────────────
  // post.language  = the original/source language the document was written in
  // locale         = the current UI language the user has selected
  // They may differ (e.g. document is in "es", user's UI is in "de").
  // Translated document body is NOT yet stored — content always shows in source
  // language. The UI chrome (labels, buttons) renders in the user's locale.
  const sourceLangName = DOC_LANG_NAMES[post.language] ?? post.language.toUpperCase();
  const isViewingDifferentLang = locale !== post.language;

  const paragraphs = post.content.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      <header className="px-6 py-4 glass-nav border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
        <Link
          href="/documents"
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t("backToDocs")}
        </Link>

        {/* Language badges */}
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-400">
            {t("sourceLang")}: {sourceLangName}
          </span>
          {isViewingDifferentLang && (
            <span className="px-2 py-0.5 bg-gray-500/10 border border-gray-500/30 rounded-lg text-xs text-gray-400">
              {t("viewingIn")}: {locale.toUpperCase()}
            </span>
          )}
          {post.isPremium && (
            <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-400">
              ⭐ {t("premium")}
            </span>
          )}
        </div>

        <ThemeToggle />
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Translation notice: shown when UI lang differs from source lang */}
        {isViewingDifferentLang && !isLocked && (
          <div className="mb-6 px-4 py-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-sm text-blue-700 dark:text-blue-300/80">
            {t("translationNote", { lang: sourceLangName })}
          </div>
        )}

        {/* Locked paywall state */}
        {isLocked ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-4">⭐</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t("premium")}</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 max-w-sm">{t("premiumNote")}</p>
            <Link
              href="/pricing"
              className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 rounded-xl text-sm font-semibold text-white transition-all"
            >
              {t("upgrade")}
            </Link>
          </div>
        ) : (
          <article>
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-4">{post.title}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-500">
                {t("by")} {post.author?.name ?? t("unknownAuthor")} ·{" "}
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </header>

            <div className="space-y-5">
              {paragraphs.map((para, i) => (
                <p key={i} className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {para}
                </p>
              ))}
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
