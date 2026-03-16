"use client";

import { usePathname } from "@/i18n/navigation";
import { DashboardAppBar } from "@/components/DashboardAppBar";

/**
 * Renders DashboardAppBar on all dashboard routes except /chat.
 * Chat page keeps its own header (ChatInterface).
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Pathname comes with locale prefix, e.g. /en/chat or /de/chat/...
  // Normalize by stripping the first segment (locale) before checking.
  const segments = pathname?.split("/") ?? [];
  const normalizedPath =
    segments.length > 2 ? `/${segments.slice(2).join("/")}` : "/";
  const isChatPage =
    normalizedPath === "/chat" || normalizedPath.startsWith("/chat/");

  if (isChatPage) {
    return <>{children}</>;
  }

  return (
    <>
      <DashboardAppBar />
      <div className="pt-16 min-h-screen">{children}</div>
    </>
  );
}
