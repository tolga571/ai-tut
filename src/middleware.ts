import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";
import { routing } from "./i18n/routing";

const PROTECTED_PATHS = ["/dashboard", "/chat", "/profile", "/onboarding", "/documents"];
const ADMIN_PATHS = ["/admin"];

const intlMiddleware = createMiddleware(routing);

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Detect if the URL already has a locale prefix
  const locales = routing.locales as readonly string[];
  const segments = pathname.split("/");
  const hasLocale = locales.includes(segments[1]);

  // Get the path without locale prefix to check protection rules
  const pathWithoutLocale = hasLocale
    ? "/" + segments.slice(2).join("/")
    : pathname;

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(p + "/")
  );

  const isAdmin = ADMIN_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(p + "/")
  );

  if (isProtected || isAdmin) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const locale = hasLocale ? segments[1] : routing.defaultLocale;

    if (!token) {
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
    }

    if (isAdmin && (token as JWT)?.role !== "admin") {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!api|_next|.*\..*).*)"],
};
