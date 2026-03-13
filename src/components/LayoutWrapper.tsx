"use client";

import { usePathname } from "@/i18n/navigation";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChatPage = pathname?.includes("/chat");
  return <div className={isChatPage ? "" : "pt-16"}>{children}</div>;
}
