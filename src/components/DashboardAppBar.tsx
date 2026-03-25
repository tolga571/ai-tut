"use client";

import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";

export function DashboardAppBar() {
  const { data: session, status } = useSession();
  const t = useTranslations("nav");
  const tUser = useTranslations("userMenu");

  if (status === "loading") {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-gray-200 dark:border-white/5 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl" />
    );
  }

  const user = session?.user as { name?: string | null; email?: string | null; role?: string; planStatus?: string } | undefined;
  const hasActivePlan = user?.planStatus === "active";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo → Dashboard */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 group flex-shrink-0"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg group-hover:scale-110 transition-transform">
              A
            </div>
            <span className="text-xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              AiTut
            </span>
          </Link>

          {/* Center: Chat + Profile links (visible on larger screens) */}
          <div className="hidden md:flex items-center gap-1">
            {/* C1: Plan yoksa /pricing'e yönlendir, plan varsa /chat'e git */}
            {hasActivePlan ? (
              <Link
                href="/chat"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {t("goToChat")}
              </Link>
            ) : (
              <Link
                href="/pricing"
                className="px-4 py-2 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
              >
                {t("goToChat")}
              </Link>
            )}
            <Link
              href="/profile"
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {tUser("myProfile")}
            </Link>
          </div>

          {/* Right: Theme + UserMenu */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user && (
              <UserMenu
                user={{ name: user.name, email: user.email }}
                role={user.role}
              />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
