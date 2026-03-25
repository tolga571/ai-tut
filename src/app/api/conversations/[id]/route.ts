import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;

    // Plan kontrolü: abonelik olmadan konuşma işlemine izin yok (B3)
    const planStatus = (session.user as { planStatus?: string }).planStatus;
    if (planStatus !== "active") {
      return new NextResponse("Subscription required", { status: 403 });
    }

    const { id } = params;

    const conv = await prisma.conversation.findFirst({
      where: { id, userId },
    });

    if (!conv) {
      return new NextResponse("Not Found", { status: 404 });
    }

    await prisma.message.deleteMany({ where: { conversationId: id } });
    await prisma.conversation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CONVERSATION_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
