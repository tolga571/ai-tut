import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// DEV ONLY — blocked in production, requires admin session
export async function GET(req: Request) {
  void req;

  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env.PADDLE_API_KEY;
  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

  if (!apiKey || !clientToken) {
    return NextResponse.json({
      status: "error",
      message: "Paddle environment variables not configured",
    }, { status: 500 });
  }

  const isSandbox = apiKey.includes("sdbx");
  const baseUrl = isSandbox
    ? "https://api.sandbox.paddle.com"
    : "https://api.paddle.com";

  try {
    const paddleTest = await fetch(`${baseUrl}/products`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    return NextResponse.json({
      status: paddleTest.ok ? "success" : "error",
      statusCode: paddleTest.status,
      apiKeyValid: paddleTest.ok,
      isSandbox,
      message: paddleTest.ok
        ? "✅ Paddle API authenticated successfully"
        : "❌ Paddle API authentication failed",
    });
  } catch (fetchError: unknown) {
    const message =
      fetchError instanceof Error ? fetchError.message : String(fetchError);
    return NextResponse.json(
      { status: "error", message: "Network fetch failed", details: message },
      { status: 500 }
    );
  }
}
