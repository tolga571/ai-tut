import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

    const isSandbox = paddleApiKey.includes("sdbx");
    const apiUrl = isSandbox
      ? "https://sandbox-api.paddle.com/transactions"
      : "https://api.paddle.com/transactions";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paddleApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        customer: { email },
        custom_data: { userId },
        checkout: {
          url: `${process.env.NEXTAUTH_URL}/dashboard`,
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

    return NextResponse.json({ transactionId: data.data.id });
  } catch (error) {
    console.error("[PADDLE_CREATE_TRANSACTION_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
