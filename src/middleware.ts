import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { routing } from "./i18n/routing";

const PROTECTED_PATHS = ["/chat", "/profile", "/onboarding"];

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

  if (isProtected) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const locale = hasLocale ? segments[1] : routing.defaultLocale;
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!api|_next|.*\..*).*)"],
};
