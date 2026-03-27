"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";

type NavItem = {
  href: string;
  labelKey: string;
  icon: string;
  primary?: boolean;
  requiresActivePlan?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",  labelKey: "dashboard",  icon: "⊞" },
  { href: "/chat",       labelKey: "chat",        icon: "💬", primary: true, requiresActivePlan: true },
  { href: "/vocabulary", labelKey: "vocabulary",  icon: "📖", requiresActivePlan: true },
  { href: "/progress",   labelKey: "progress",    icon: "📊", requiresActivePlan: true },
];

function XPBadge({ xp }: { xp: number }) {
  return (
    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
      <span className="flex items-center gap-1 text-xs font-semibold text-purple-500">
        ⭐ <span>{xp} XP</span>
      </span>
    </div>
  );
}

export function DashboardAppBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [mobileOpen, setMobileOpen] = useState(false);

  if (status === "loading") {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-gray-200 dark:border-white/5 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl" />
    );
  }

  const user = session?.user as {
    name?: string | null;
    email?: string | null;
    role?: string;
    planStatus?: string;
    cefrLevel?: string;
    xp?: number;
  } | undefined;

  const hasActivePlan = user?.planStatus === "active";
  const xp = user?.xp ?? 0;

  const resolvedHref = (item: NavItem): string => {
    if (item.requiresActivePlan && !hasActivePlan) return "/pricing";
    return item.href;
  };

  const isActive = (item: NavItem): boolean => {
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg group-hover:scale-105 transition-transform text-sm">
              A
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              AiTut
            </span>
          </Link>

          {/* Center nav (desktop) */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              const href = resolvedHref(item);

              if (item.primary) {
                return (
                  <Link
                    key={item.href}
                    href={href}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all
                      ${active
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 scale-[1.02]"
                        : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20"
                      }`}
                  >
                    <span className="text-base leading-none">{item.icon}</span>
                    {t(item.labelKey)}
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 ml-0.5 animate-pulse" />
                    )}
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                    ${active
                      ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                    }`}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>

          {/* Right: XP + Theme + UserMenu + Hamburger */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <XPBadge xp={xp} />
            <ThemeToggle />
            {user && (
              <UserMenu
                user={{ name: user.name, email: user.email }}
                role={user.role}
                cefrLevel={user.cefrLevel}
                xp={xp}
              />
            )}

            {/* Hamburger (mobile) */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              aria-label="Toggle menu"
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
        <div className="md:hidden border-t border-gray-100 dark:border-white/5 bg-white dark:bg-gray-950 px-4 py-3 space-y-1">
          {xp > 0 && (
            <div className="flex items-center gap-2 px-2 py-2 mb-1">
              <span className="text-sm font-semibold text-purple-500">⭐ {xp} XP</span>
            </div>
          )}
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const href = resolvedHref(item);
            return (
              <Link
                key={item.href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors
                  ${active
                    ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
              >
                <span className="text-lg">{item.icon}</span>
                {t(item.labelKey)}
                {item.primary && active && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-green-500 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Active
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
