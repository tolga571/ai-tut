import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("blogs");

  const post = await prisma.post.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      content: true,
      language: true,
      category: true,
      published: true,
      createdAt: true,
      author: { select: { name: true } },
    },
  });

  if (!post || post.category !== "blog" || !post.published) {
    notFound();
  }

  const paragraphs = post.content.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      <header className="px-4 sm:px-6 py-4 glass-nav border-b border-gray-200 dark:border-white/5 flex items-center justify-between gap-3">
        <Link
          href="/blogs"
          className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">{t("backToBlogs")}</span>
        </Link>
        <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
          {post.language}
        </span>
        <ThemeToggle />
      </header>

      <article className="max-w-3xl mx-auto px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-4">{post.title}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-500">
            {t("by")} {post.author?.name ?? t("unknownAuthor")} ·{" "}
            {new Date(post.createdAt).toLocaleDateString()}
          </p>
        </header>

        <div className="prose-dark space-y-5">
          {paragraphs.map((para, i) => (
            <p key={i} className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {para}
            </p>
          ))}
        </div>
      </article>
    </div>
  );
}
