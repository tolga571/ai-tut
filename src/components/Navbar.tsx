"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname, Link, useRouter } from "@/i18n/navigation";
import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import { UserMenu } from "./UserMenu";

// Only show global Navbar on public marketing pages
const PUBLIC_PATHS = ["/", "/login", "/register", "/pricing"];

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("nav");

  useEffect(() => setMounted(true), []);

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname?.startsWith(p + "/")
  );

  if (!isPublic) return null;

  const UI_LOCALES = ["ar", "de", "en", "es", "fr", "ja", "zh"] as const;

  const handleLocaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.replace(pathname, { locale: e.target.value });
    setMobileOpen(false);
  };

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-gray-200 dark:border-white/5 glass-nav transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link
            href={session ? "/dashboard" : "/"}
            className="flex items-center gap-2 group flex-shrink-0"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg group-hover:scale-110 transition-transform">
              A
            </div>
            <span className="text-xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              AiTut
            </span>
          </Link>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-3">
            {/* Locale switcher */}
            <select
              value={locale}
              onChange={handleLocaleChange}
              aria-label="Switch UI language"
              className="h-9 px-2 rounded-full border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-gray-900 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors cursor-pointer focus:outline-none"
            >
              {UI_LOCALES.map((l) => (
                <option key={l} value={l} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                  {l.toUpperCase()}
                </option>
              ))}
            </select>

            {/* Theme toggle */}
            {mounted && (
              <button
                type="button"
                aria-label="Toggle theme"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="w-9 h-9 rounded-full border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                {resolvedTheme === "dark" ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            )}

            {status === "loading" ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/5 animate-pulse" />
            ) : session ? (
              <>
                <div className="flex items-center gap-1 mr-1">
                  <Link href="/dashboard" className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-white/5">
                    {t("dashboard")}
                  </Link>
                  {(session.user as { role?: string }).role === "admin" && (
                    <Link href="/admin" className="px-3 py-1.5 text-sm text-amber-500 hover:text-amber-400 transition-colors rounded-lg hover:bg-amber-500/10">
                      {t("adminPanel")}
                    </Link>
                  )}
                </div>
                <Link href="/chat" className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all active:scale-95">
                  {t("goToChat")}
                </Link>
                <UserMenu user={session.user ?? {}} role={(session.user as { role?: string }).role} />
              </>
            ) : (
              <>
                <Link href="/pricing" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  {t("pricing")}
                </Link>
                <Link href="/login" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  {t("login")}
                </Link>
                <Link href="/register" className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all active:scale-95 shadow-sm">
                  {t("register")}
                </Link>
              </>
            )}
          </div>

          {/* Mobile right side */}
          <div className="flex md:hidden items-center gap-2">
            {mounted && (
              <button
                type="button"
                aria-label="Toggle theme"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="w-9 h-9 rounded-full border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                {resolvedTheme === "dark" ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            )}
            <button
              type="button"
              aria-label="Toggle menu"
              onClick={() => setMobileOpen((v) => !v)}
              className="w-9 h-9 rounded-lg border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-white/5 glass-nav px-4 py-4 space-y-3">
          <select
            value={locale}
            onChange={handleLocaleChange}
            className="w-full h-10 px-3 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 focus:outline-none"
          >
            {UI_LOCALES.map((l) => (
              <option key={l} value={l} className="bg-white dark:bg-gray-900">{l.toUpperCase()}</option>
            ))}
          </select>

          {session ? (
            <>
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                {t("dashboard")}
              </Link>
              <Link href="/chat" onClick={() => setMobileOpen(false)} className="block w-full text-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors">
                {t("goToChat")}
              </Link>
            </>
          ) : (
            <>
              <Link href="/pricing" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                {t("pricing")}
              </Link>
              <Link href="/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                {t("login")}
              </Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} className="block w-full text-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors">
                {t("register")}
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
