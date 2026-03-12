"use client";

import { usePathname } from "next/navigation";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard =
    pathname?.startsWith("/chat") || pathname?.startsWith("/profile");
  return <div className={isDashboard ? "" : "pt-16"}>{children}</div>;
}
