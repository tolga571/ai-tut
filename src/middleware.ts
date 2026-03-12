import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    return NextResponse.next();
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
