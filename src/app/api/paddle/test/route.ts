import { NextResponse } from "next/server";

// DEV ONLY — disabled in production
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  const apiKey = process.env.PADDLE_API_KEY;
  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

  if (!apiKey || !clientToken) {
    return NextResponse.json(
      {
        status: "error",
        message: "Paddle environment variables not configured",
      },
      { status: 500 }
    );
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

    const data = await paddleTest.json();

    return NextResponse.json({
      status: paddleTest.ok ? "success" : "error",
      statusCode: paddleTest.status,
      apiKeyValid: paddleTest.ok,
      environment: process.env.NODE_ENV,
      isSandbox,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Network error",
      },
      { status: 500 }
    );
  }
}
