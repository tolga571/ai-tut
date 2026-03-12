import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const planStatus = token?.planStatus;
    const isAuth = !!token;
    const isDashboardPage = req.nextUrl.pathname.startsWith("/dashboard") ||
                           req.nextUrl.pathname.startsWith("/chat") ||
                           req.nextUrl.pathname.startsWith("/profile");

    const response = NextResponse.next();

    // Don't override CSP - let next.config.mjs handle it
    // response.headers.set() would conflict

    // If user is logged in but inactive, and trying to access protected pages
    if (isAuth && planStatus === "inactive" && isDashboardPage) {
      return NextResponse.redirect(new URL("/register", req.url));
    }

    return response;
  },
  {
    callbacks: {
      // Allow /register without token, but require token for other protected routes
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname.startsWith("/register")) {
          return true; // Allow unauthenticated access to /register for plan selection
        }
        return !!token; // Require token for other routes
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/chat/:path*", "/profile/:path*", "/register/:path*", "/register"],
};
