import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const apiKey = process.env.PADDLE_API_KEY;
    const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

    console.log("🔍 Paddle Configuration Test");
    console.log("API Key:", apiKey?.substring(0, 30) + "...");
    console.log("Client Token:", clientToken?.substring(0, 20) + "...");

    if (!apiKey) {
      return NextResponse.json({
        status: "error",
        message: "PADDLE_API_KEY is not set",
      }, { status: 500 });
    }

    if (!clientToken) {
      return NextResponse.json({
        status: "error",
        message: "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not set",
      }, { status: 500 });
    }

    // Test with multiple endpoints
    const isSandbox = apiKey.includes("sdbx");
    const baseUrl = isSandbox ? "https://api.sandbox.paddle.com" : "https://api.paddle.com";

    console.log("Testing URL:", `${baseUrl}/products`);

    try {
      const paddleTest = await fetch(`${baseUrl}/products`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      const data = await paddleTest.json();

      return NextResponse.json({
        status: paddleTest.ok ? "success" : "error",
        statusCode: paddleTest.status,
        apiKeyValid: paddleTest.ok,
        clientTokenValid: clientToken.startsWith("test_") || clientToken.startsWith("plt_"),
        message: paddleTest.ok ? "✅ Paddle API authenticated successfully" : "❌ Paddle API authentication failed",
        fullResponse: data,
        environment: process.env.NODE_ENV,
        apiKeyFormat: apiKey.substring(0, 20),
        baseUrl,
        isSandbox,
      });
    } catch (fetchError: any) {
      return NextResponse.json({
        status: "error",
        message: "Network fetch failed",
        details: fetchError.message,
        suggestion: "API Key may be invalid or revoke. Create a NEW API key in Paddle Dashboard.",
        baseUrl,
        isSandbox,
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      message: error.message,
      details: error.toString(),
    }, { status: 500 });
  }
}

