import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { ThemeToggle } from '@/components/ThemeToggle';

const CATEGORY_ICONS: Record<string, string> = {
  blog:     "📝",
  page:     "📄",
  document: "📁",
};

export default async function AdminPostsPage() {
  const t = await getTranslations("admin");

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      language: true,
      published: true,
      isPremium: true,
      createdAt: true,
    },
  });

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      <header className="px-6 py-4 glass-nav border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
        <Link href="/chat" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t("backToChat")}
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{t("postsTitle")}</h1>
        <Link
          href="/admin/posts/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-all"
        >
          + {t("newPost")}
        </Link>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t("empty.title")}</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{t("empty.description")}</p>
            <Link href="/admin/posts/new" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-all">
              {t("newPost")}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 hover:border-gray-300 dark:hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl flex-shrink-0">{CATEGORY_ICONS[post.category] ?? "📄"}</span>
                  <div className="min-w-0">
                    <p className="text-gray-900 dark:text-white font-medium text-sm truncate">{post.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="capitalize">{post.category}</span>
                      {" · "}
                      {post.language.toUpperCase()}
                      {" · "}
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {post.isPremium && (
                    <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-400">
                      ⭐ {t("premium")}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-lg text-xs border ${
                    post.published
                      ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
                      : "bg-gray-200 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600/30 text-gray-600 dark:text-gray-500"
                  }`}>
                    {post.published ? t("published") : t("draft")}
                  </span>
                  <Link
                    href={`/admin/posts/${post.id}/edit`}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-700 dark:text-gray-300 transition-all"
                  >
                    {t("edit")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
