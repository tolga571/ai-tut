import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import PostForm from "../../_components/PostForm";

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const t = await getTranslations("admin");

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      category: true,
      language: true,
      published: true,
      isPremium: true,
    },
  });

  if (!post) notFound();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="px-6 py-4 glass-nav border-b border-white/5 flex items-center justify-between">
        <Link href="/admin/posts" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t("backToPosts")}
        </Link>
        <h1 className="text-lg font-semibold text-white">{t("editPostTitle")}</h1>
        <div className="w-24" />
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-xl">
          <PostForm
            initialData={{
              ...post,
              category: post.category as "blog" | "page" | "document",
            }}
          />
        </div>
      </div>
    </div>
  );
}
