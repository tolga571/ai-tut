import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DocumentsPage() {
  const t = await getTranslations("documents");

  const session = await getServerSession(authOptions);
  const isPaidUser = (session?.user as any)?.planStatus === "active";

  const posts = await prisma.post.findMany({
    where: { published: true, category: "document" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      language: true,
      isPremium: true,
      createdAt: true,
      author: { select: { name: true } },
    },
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="px-6 py-4 glass-nav border-b border-white/5 flex items-center justify-between">
        <Link href="/chat" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t("backToChat")}
        </Link>
        <h1 className="text-lg font-semibold text-white">{t("title")}</h1>
        <div className="w-24" />
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-4">📁</div>
            <h2 className="text-xl font-semibold text-white mb-2">{t("empty.title")}</h2>
            <p className="text-gray-400 text-sm">{t("empty.description")}</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => {
              const locked = post.isPremium && !isPaidUser;

              return (
                <li
                  key={post.id}
                  className={`bg-gray-900 border rounded-2xl p-5 transition-all ${
                    locked
                      ? "border-yellow-500/20 opacity-75"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  {locked ? (
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-semibold text-base">{post.title}</span>
                          <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-400">
                            ⭐ {t("premium")}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {post.author?.name ?? t("unknownAuthor")} · {new Date(post.createdAt).toLocaleDateString()} · {post.language.toUpperCase()}
                        </p>
                        <p className="text-xs text-yellow-500/70 mt-1">{t("premiumNote")}</p>
                      </div>
                      <Link
                        href="/pricing"
                        className="flex-shrink-0 px-3 py-1.5 bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 rounded-lg text-xs font-semibold text-white transition-all whitespace-nowrap"
                      >
                        {t("upgrade")}
                      </Link>
                    </div>
                  ) : (
                    <Link href={`/documents/${post.slug}`} className="block group">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-white font-semibold text-base group-hover:text-blue-400 transition-colors">
                          {post.title}
                        </h2>
                        {post.isPremium && (
                          <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-400">
                            ⭐ {t("premium")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {post.author?.name ?? t("unknownAuthor")} · {new Date(post.createdAt).toLocaleDateString()} · {post.language.toUpperCase()}
                      </p>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
