import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("paddle-signature");

    if (!signature) {
      console.error("[PADDLE_WEBHOOK] Missing paddle-signature header");
      return new NextResponse("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(body);
    const eventType = payload.event_type;

    console.log("[PADDLE_WEBHOOK] Received event:", eventType);
    console.log("[PADDLE_WEBHOOK] Data:", JSON.stringify(payload.data, null, 2));

    const { custom_data, customer_id } = payload.data ?? {};
    const userId = custom_data?.userId;

    if (!userId) {
      console.error("[PADDLE_WEBHOOK] Missing userId in custom_data:", custom_data);
      // 200 döndür — Paddle tekrar denemesini durdur, ama logla
      return new NextResponse("Missing userId, ignoring", { status: 200 });
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
      console.log(`[PADDLE_WEBHOOK] Activated plan for user ${userId} via ${eventType}`);
    } else if (eventType === "subscription.canceled" || eventType === "subscription.past_due") {
      await prisma.user.update({
        where: { id: userId },
        data: { planStatus: "inactive" },
      });
      console.log(`[PADDLE_WEBHOOK] Deactivated plan for user ${userId} via ${eventType}`);
    } else {
      console.log(`[PADDLE_WEBHOOK] Unhandled event type: ${eventType}`);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("[PADDLE_WEBHOOK_ERROR]", error);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}
