import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export default async function PageDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("pages");

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

  if (!post || post.category !== "page" || !post.published) {
    notFound();
  }

  const paragraphs = post.content.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="px-6 py-4 glass-nav border-b border-white/5 flex items-center justify-between">
        <Link
          href="/pages"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t("backToPages")}
        </Link>
        <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
          {post.language}
        </span>
        <div className="w-24" />
      </header>

      <article className="max-w-3xl mx-auto px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white leading-tight mb-4">{post.title}</h1>
          <p className="text-sm text-gray-500">
            {t("by")} {post.author?.name ?? t("unknownAuthor")} ·{" "}
            {new Date(post.createdAt).toLocaleDateString()}
          </p>
        </header>

        <div className="space-y-5">
          {paragraphs.map((para, i) => (
            <p key={i} className="text-gray-300 leading-relaxed whitespace-pre-wrap">
              {para}
            </p>
          ))}
        </div>
      </article>
    </div>
  );
}
