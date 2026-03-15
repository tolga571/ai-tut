import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getUserConversations(userId: string) {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    try {
      const conversations = await getUserConversations(userId);
      return NextResponse.json(conversations);
    } catch (firstError) {
      // One lightweight retry for transient connection drops.
      await new Promise((resolve) => setTimeout(resolve, 150));
      try {
        const conversations = await getUserConversations(userId);
        return NextResponse.json(conversations);
      } catch (secondError) {
        console.error("[CONVERSATIONS_GET_RETRY_FAILED]", { firstError, secondError });
        return NextResponse.json(
          { error: "Conversations temporarily unavailable" },
          { status: 503 }
        );
      }
    }
  } catch (error) {
    console.error("[CONVERSATIONS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
