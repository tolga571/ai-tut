import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { ThemeToggle } from '@/components/ThemeToggle';
import PostForm from "../_components/PostForm";

export default async function NewPostPage() {
  const t = await getTranslations("admin");

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      <header className="px-6 py-4 glass-nav border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
        <Link href="/admin/posts" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t("backToPosts")}
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{t("newPostTitle")}</h1>
        <ThemeToggle />
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-xl">
          <PostForm />
        </div>
      </div>
    </div>
  );
}
