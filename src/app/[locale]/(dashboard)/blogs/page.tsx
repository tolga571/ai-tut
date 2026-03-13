import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function BlogsPage() {
  const t = await getTranslations("blogs");

  const posts = await prisma.post.findMany({
    where: { published: true, category: "blog" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      language: true,
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
            <div className="text-5xl mb-4">📝</div>
            <h2 className="text-xl font-semibold text-white mb-2">{t("empty.title")}</h2>
            <p className="text-gray-400 text-sm">{t("empty.description")}</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => (
              <li key={post.id} className="bg-gray-900 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all">
                <Link href={`/blogs/${post.slug}`} className="block group">
                  <h2 className="text-white font-semibold text-base group-hover:text-blue-400 transition-colors mb-1">
                    {post.title}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {post.author?.name ?? t("unknownAuthor")} · {new Date(post.createdAt).toLocaleDateString()} · {post.language.toUpperCase()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
