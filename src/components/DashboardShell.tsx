"use client";

import { usePathname } from "@/i18n/navigation";
import { DashboardAppBar } from "@/components/DashboardAppBar";

/**
 * Renders DashboardAppBar on all dashboard routes except /chat.
 * Chat page keeps its own header (ChatInterface).
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChatPage = pathname === "/chat" || pathname?.startsWith("/chat/");

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
