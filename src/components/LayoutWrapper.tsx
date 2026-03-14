"use client";

import { usePathname } from "@/i18n/navigation";

const PUBLIC_PATHS = ["/", "/login", "/register", "/pricing"];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showsNavbar = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname?.startsWith(p + "/")
  );
  return <div className={showsNavbar ? "pt-16" : ""}>{children}</div>;
}
