import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Verify Paddle webhook signature using HMAC-SHA256.
 * Header format: "ts=TIMESTAMP;h1=HASH"
 * Signed payload: "TIMESTAMP:RAW_BODY"
 */
function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  const parts = signatureHeader.split(";");
  const tsPart = parts.find((p) => p.startsWith("ts="));
  const h1Part = parts.find((p) => p.startsWith("h1="));
  if (!tsPart || !h1Part) return false;

  const ts = tsPart.slice(3);
  const h1 = h1Part.slice(3);

  // Reject events older than 5 minutes (replay-attack protection)
  const timestamp = parseInt(ts, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) return false;

  const signedPayload = `${ts}:${rawBody}`;
  const expectedHash = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(h1, "hex"),
      Buffer.from(expectedHash, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * GET /api/paddle/webhook
 * Basit sağlık kontrolü — Paddle dashboard'ın webhook URL'sini
 * doğrulayabilmesi ve Railway'de endpoint'in erişilebilir olduğunu
 * teyit etmek için kullanılır.
 */
export async function GET() {
  const hasSecret = Boolean(process.env.PADDLE_WEBHOOK_SECRET);
  return new NextResponse(
    JSON.stringify({ ok: true, webhookConfigured: hasSecret }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    }
  );
}

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[PADDLE_WEBHOOK] PADDLE_WEBHOOK_SECRET not configured");
      return new NextResponse("Server misconfiguration", { status: 500 });
    }

    const rawBody = await req.text();
    const signatureHeader = req.headers.get("paddle-signature");

    if (!signatureHeader) {
      return new NextResponse("Missing signature", { status: 401 });
    }

    const isValid = verifyPaddleSignature(rawBody, signatureHeader, webhookSecret);
    if (!isValid) {
      console.error("[PADDLE_WEBHOOK] Signature verification failed");
      return new NextResponse("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventType: string = payload.event_type;
    const { custom_data, customer_id } = payload.data ?? {};
    const userId: string | undefined =
      typeof custom_data?.userId === "string"
        ? custom_data.userId
        : typeof custom_data?.user_id === "string"
          ? custom_data.user_id
          : undefined;

    if (!userId) {
      // Return 200 so Paddle doesn't retry — no userId to act on
      return new NextResponse("Missing userId, ignoring", { status: 200 });
    }

    if (
      eventType === "subscription.activated" ||
      eventType === "transaction.completed" ||
      eventType === "transaction.paid"
    ) {
      await prisma.user.update({
        where: { id: userId },
        data: { planStatus: "active", paddleCustomerId: customer_id ?? null },
      });
    } else if (
      eventType === "subscription.canceled" ||
      eventType === "subscription.past_due"
    ) {
      await prisma.user.update({
        where: { id: userId },
        data: { planStatus: "inactive" },
      });
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("[PADDLE_WEBHOOK_ERROR]", error);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}
