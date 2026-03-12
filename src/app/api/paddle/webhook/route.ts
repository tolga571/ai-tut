import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("paddle-signature");

    if (!signature) {
      return new NextResponse("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(body);

    const eventType = payload.event_type;
    const { custom_data, customer_id } = payload.data;

    // customer custom_data should contain our DB userId
    const userId = custom_data?.userId;

    if (!userId) {
      return new NextResponse("Missing userId in payload", { status: 400 });
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
          paddleCustomerId: customer_id,
        },
      });
      console.log(`[PADDLE] Activated plan for user ${userId} via ${eventType}`);
    }
    else if (eventType === "subscription.canceled" || eventType === "subscription.past_due") {
      await prisma.user.update({
        where: { id: userId },
        data: {
          planStatus: "inactive",
        },
      });
      console.log(`[PADDLE] Cancelled subscription for user ${userId}`);
    }

    return new NextResponse("Webhook received", { status: 200 });
  } catch (error) {
    console.error("[PADDLE_WEBHOOK_ERROR]", error);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}
