"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { UserMenu } from "./UserMenu";

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Dashboard pages have their own header — hide global navbar
  if (pathname?.startsWith("/chat") || pathname?.startsWith("/profile")) {
    return null;
  }

  return (
    <nav className="fixed top-0 w-full z-50 transition-all border-b border-white/5 bg-gray-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg group-hover:scale-110 transition-transform">
              A
            </div>
            <span className="text-xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              AiTut
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {status === "loading" ? (
              <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
            ) : session ? (
              /* Logged-in: shortcut to app + user menu */
              <>
                <Link
                  href="/chat"
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all active:scale-95"
                >
                  Chate Git
                </Link>
                <UserMenu user={session.user} />
              </>
            ) : (
              /* Logged-out: marketing links */
              <>
                <div className="hidden md:flex items-center gap-6 mr-2">
                  <Link
                    href="/pricing"
                    className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                  >
                    Fiyatlar
                  </Link>
                </div>
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium bg-white text-gray-950 rounded-full hover:bg-gray-100 transition-all active:scale-95 shadow-lg shadow-white/10"
                >
                  Başla
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
