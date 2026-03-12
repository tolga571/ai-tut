import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { priceId, userId, email } = await req.json();

    if (!priceId || !userId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const paddleApiKey = process.env.PADDLE_API_KEY;
    if (!paddleApiKey) {
      return NextResponse.json({ error: "Paddle API key not configured" }, { status: 500 });
    }

    const isSandbox = paddleApiKey.startsWith("pdl_sdbx") || paddleApiKey.includes("sdbx");
    const apiUrl = isSandbox
      ? "https://sandbox-api.paddle.com/transactions"
      : "https://api.paddle.com/transactions";

    const successUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/chat`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paddleApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        customer: { email },
        custom_data: { userId },
        checkout: {
          url: successUrl,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[PADDLE_CREATE_TRANSACTION_ERROR]", data);
      return NextResponse.json(
        { error: data.error?.detail || "Failed to create transaction" },
        { status: response.status }
      );
    }

    const transactionId = data?.data?.id;
    if (!transactionId) {
      console.error("[PADDLE] No transaction ID in response:", data);
      return NextResponse.json({ error: "Transaction ID not returned by Paddle" }, { status: 500 });
    }

    return NextResponse.json({ transactionId });
  } catch (error) {
    console.error("[PADDLE_CREATE_TRANSACTION_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
