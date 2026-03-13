import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createTransactionSchema } from "@/lib/validations";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 10 transaction attempts per IP per 15 minutes
    const ip = getClientIp(req);
    if (!checkRateLimit(`create-tx:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many requests, please try again later" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const result = createTransactionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const { priceId, userId, email } = result.data;

    // Ensure the userId matches the authenticated session
    const sessionUserId = (session.user as { id?: string }).id;
    if (userId !== sessionUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
        return_url: successUrl,
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

    const checkoutUrl = data?.data?.url;
    const transactionId = data?.data?.id;

    if (!checkoutUrl || !transactionId) {
      return NextResponse.json({ error: "Checkout URL not returned by Paddle" }, { status: 500 });
    }

    return NextResponse.json({ checkoutUrl, transactionId });
  } catch (error) {
    console.error("[PADDLE_CREATE_TRANSACTION_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
