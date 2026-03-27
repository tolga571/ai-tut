"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import toast from "react-hot-toast";
import { useTranslations, useLocale } from "next-intl";

interface UserMenuProps {
  user: { name?: string | null; email?: string | null };
  role?: string;
  cefrLevel?: string;
  xp?: number;
}

const CEFR_COLORS: Record<string, string> = {
  A1: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  A2: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  B1: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  B2: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  C1: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  C2: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

function CEFRPill({ level }: { level?: string }) {
  if (!level) return null;
  const cls = CEFR_COLORS[level] ?? CEFR_COLORS.A1;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${cls}`}>
      {level}
    </span>
  );
}

function UserAvatar({ name, email }: { name?: string | null; email?: string | null }) {
  const initials = name
    ? name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : email?.substring(0, 1).toUpperCase() || "U";
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-md flex-shrink-0">
      {initials}
    </div>
  );
}

export function UserMenu({ user, role, cefrLevel, xp = 0 }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const t = useTranslations("userMenu");
  const tNav = useTranslations("nav");

  const firstName = user?.name?.split(" ")[0] ?? null;
  const xpInLevel = xp % 100;
  const level = Math.floor(xp / 100) + 1;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: `${window.location.origin}/${locale}/login` });
    } catch {
      toast.error(t("signOutError"));
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <UserAvatar name={user?.name} email={user?.email} />
        <div className="hidden sm:block text-left">
          <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">
            {firstName ?? user?.email?.split("@")[0] ?? "User"}
          </p>
          <div className="flex items-center">
            <CEFRPill level={cefrLevel} />
          </div>
        </div>
        <svg
          className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 hidden sm:block"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 shadow-2xl py-2 z-[60]">

          {/* User header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5 mb-1">
            <div className="flex items-center gap-3">
              <UserAvatar name={user?.name} email={user?.email} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user?.name ?? "User"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
              <CEFRPill level={cefrLevel} />
            </div>

            {/* XP progress bar */}
            {xp > 0 && (
              <div className="mt-2.5">
                <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mb-1">
                  <span>⭐ {xp} XP</span>
                  <span>Level {level}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${xpInLevel}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Nav links */}
          <Link
            href="/dashboard"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <span className="text-base w-5 text-center">⊞</span>
            {tNav("dashboard")}
          </Link>

          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <span className="text-base w-5 text-center">👤</span>
            {t("myProfile")}
          </Link>

          <Link
            href="/chat"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <span className="text-base w-5 text-center">💬</span>
            {tNav("chat")}
          </Link>

          <Link
            href="/vocabulary"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <span className="text-base w-5 text-center">📖</span>
            {tNav("vocabulary")}
          </Link>

          <Link
            href="/progress"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <span className="text-base w-5 text-center">📊</span>
            {tNav("progress")}
          </Link>

          {role === "admin" && (
            <Link
              href="/admin"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {tNav("adminPanel")}
            </Link>
          )}

          <div className="h-px bg-gray-100 dark:bg-white/5 my-2 mx-4" />

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <span className="text-base w-5 text-center">🚪</span>
            {t("signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
