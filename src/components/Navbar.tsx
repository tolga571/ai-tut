"use client";

import { useSession } from "next-auth/react";
import { usePathname, Link, useRouter } from "@/i18n/navigation";
import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import { UserMenu } from "./UserMenu";

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("nav");

  // Chat pages have their own layout — hide global navbar only there
  if (pathname?.includes("/chat")) {
    return null;
  }

  const UI_LOCALES = ["ar", "de", "en", "es", "fr", "ja", "zh"] as const;

  const handleLocaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.replace(pathname, { locale: e.target.value });
  };

  return (
    <nav className="fixed top-0 w-full z-50 transition-all border-b border-white/5 bg-gray-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg group-hover:scale-110 transition-transform">
              A
            </div>
            <span className="text-xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              AiTut
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Language switcher */}
            <select
              value={locale}
              onChange={handleLocaleChange}
              aria-label="Switch UI language"
              className="h-9 px-2 rounded-full border border-white/10 bg-gray-900 text-xs font-semibold text-gray-200 hover:bg-white/10 transition-colors cursor-pointer focus:outline-none"
            >
              {UI_LOCALES.map((l) => (
                <option key={l} value={l} className="bg-gray-900">
                  {l.toUpperCase()}
                </option>
              ))}
            </select>

            {/* Theme toggle */}
            <button
              type="button"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-9 h-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-xs text-gray-200 hover:bg-white/10 transition-colors"
            >
              <span className="hidden md:inline">
                {theme === "dark" ? t("light") : t("dark")}
              </span>
              <span className="md:hidden">
                {theme === "dark" ? "☀" : "☾"}
              </span>
            </button>

            {status === "loading" ? (
              <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
            ) : session ? (
              <>
                <div className="hidden md:flex items-center gap-1 mr-1">
                  <Link href="/dashboard" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                    {t("dashboard")}
                  </Link>
                  <Link href="/blogs" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                    {t("blogs")}
                  </Link>
                  <Link href="/pages" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                    {t("pages")}
                  </Link>
                  <Link href="/documents" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                    {t("documents")}
                  </Link>
                  {(session.user as { role?: string }).role === "admin" && (
                    <Link href="/admin" className="px-3 py-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors rounded-lg hover:bg-amber-500/10">
                      {t("adminPanel")}
                    </Link>
                  )}
                </div>
                <Link
                  href="/chat"
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all active:scale-95"
                >
                  {t("goToChat")}
                </Link>
                <UserMenu user={session.user ?? {}} role={(session.user as { role?: string }).role} />
              </>
            ) : (
              <>
                <div className="hidden md:flex items-center gap-6 mr-2">
                  <Link
                    href="/pricing"
                    className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                  >
                    {t("pricing")}
                  </Link>
                </div>
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  {t("login")}
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium bg-white text-gray-950 rounded-full hover:bg-gray-100 transition-all active:scale-95 shadow-lg shadow-white/10"
                >
                  {t("register")}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
