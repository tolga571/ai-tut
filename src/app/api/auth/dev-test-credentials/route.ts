import { NextResponse } from "next/server";

/**
 * Optional dev-only helper for the login page test-credentials panel.
 * Must live under /api/auth/dev-test-credentials so NextAuth [...nextauth] does not handle it.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const email = process.env.DEV_TEST_USER_EMAIL?.trim();
  const password = process.env.DEV_TEST_USER_PASSWORD?.trim();

  if (!email || !password) {
    return NextResponse.json({ message: "Not configured" }, { status: 404 });
  }

  return NextResponse.json({ email, password });
}
