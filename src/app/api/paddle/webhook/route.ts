import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import crypto from "crypto";

function verifyPaddleSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string | undefined
): boolean {
  if (!webhookSecret) {
    logger.warn(
      "Paddle webhook secret not configured, skipping signature verification"
    );
    return true;
  }

  try {
    // Paddle signature format: ts=timestamp;h1=hash
    const parts = signature.split(";");
    const tsStr = parts.find((p) => p.startsWith("ts="))?.replace("ts=", "");
    const h1 = parts.find((p) => p.startsWith("h1="))?.replace("h1=", "");

    if (!tsStr || !h1) {
      logger.error("Invalid Paddle signature format");
      return false;
    }

    const signedPayload = `${tsStr}:${rawBody}`;
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(signedPayload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(h1),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error("Paddle signature verification error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("paddle-signature");

    if (!signature) {
      logger.error("Missing paddle-signature header");
      return new NextResponse("Invalid signature", { status: 401 });
    }

    // Verify webhook signature
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!verifyPaddleSignature(body, signature, webhookSecret)) {
      logger.error("Invalid Paddle webhook signature");
      return new NextResponse("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(body);
    const eventType = payload.event_type;

    logger.info("Paddle webhook received", { eventType });

    const { custom_data, customer_id } = payload.data ?? {};
    const userId = custom_data?.userId;

    if (!userId) {
      logger.warn("Missing userId in Paddle webhook custom_data");
      return new NextResponse("Missing userId, ignoring", { status: 200 });
    }

    // Verify user exists before updating
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      logger.error("Paddle webhook: user not found", { userId });
      return new NextResponse("User not found", { status: 200 });
    }

    if (
      eventType === "subscription.activated" ||
      eventType === "transaction.completed" ||
      eventType === "transaction.paid"
    ) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          planStatus: "active",
          paddleCustomerId: customer_id ?? null,
        },
      });
      logger.info("Plan activated via Paddle webhook", {
        userId,
        eventType,
      });
    } else if (
      eventType === "subscription.canceled" ||
      eventType === "subscription.past_due"
    ) {
      await prisma.user.update({
        where: { id: userId },
        data: { planStatus: "inactive" },
      });
      logger.info("Plan deactivated via Paddle webhook", {
        userId,
        eventType,
      });
    } else {
      logger.debug("Unhandled Paddle webhook event", { eventType });
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    logger.error("Paddle webhook handler failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}
