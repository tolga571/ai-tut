import { NextResponse } from "next/server";
import { createTransactionSchema } from "@/lib/validations/paddle.validation";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    // Rate limiting
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const rateLimitResult = checkRateLimit(`paddle:${ip}`, RATE_LIMITS.PADDLE);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: "Çok fazla istek. Lütfen daha sonra tekrar deneyin." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = createTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçersiz veri",
          errors: parsed.error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { priceId, userId, email } = parsed.data;

    const paddleApiKey = process.env.PADDLE_API_KEY;
    if (!paddleApiKey) {
      logger.error("Paddle API key not configured");
      return NextResponse.json(
        { success: false, error: "Ödeme sistemi yapılandırılmamış" },
        { status: 500 }
      );
    }

    const isSandbox =
      paddleApiKey.startsWith("pdl_sdbx") || paddleApiKey.includes("sdbx");
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
      logger.error("Paddle transaction creation failed", {
        status: response.status,
        detail: data.error?.detail,
      });
      return NextResponse.json(
        {
          success: false,
          error: data.error?.detail || "İşlem oluşturulamadı",
        },
        { status: response.status }
      );
    }

    const checkoutUrl = data?.data?.url;
    const transactionId = data?.data?.id;

    if (!checkoutUrl || !transactionId) {
      logger.error("Paddle response missing checkout URL");
      return NextResponse.json(
        { success: false, error: "Ödeme URL'si alınamadı" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, checkoutUrl, transactionId });
  } catch (error) {
    logger.error("Paddle create transaction error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { success: false, error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
