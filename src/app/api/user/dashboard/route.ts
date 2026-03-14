import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function computeStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const uniqueDays = [...new Set(dates.map((d) => d.toISOString().slice(0, 10)))].sort(
    (a, b) => b.localeCompare(a)
  );
  const today = new Date().toISOString().slice(0, 10);
  if (uniqueDays[0] !== today) return 0;
  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]);
    prev.setDate(prev.getDate() - 1);
    const expected = prev.toISOString().slice(0, 10);
    if (uniqueDays[i] === expected) streak++;
    else break;
  }
  return streak;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "User not found" }, { status: 400 });
  }

  try {
    const [conversations, messageCount, recentConversations, userData] = await Promise.all([
      prisma.conversation.findMany({
        where: { userId },
        select: { id: true, createdAt: true, updatedAt: true, messages: { select: { id: true } } },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.message.count({
        where: { conversation: { userId } },
      }),
      prisma.conversation.findMany({
        where: { userId },
        take: 5,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          updatedAt: true,
          messages: {
            take: 1,
            orderBy: { createdAt: "asc" },
            select: { content: true },
          },
        },
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { xp: true } }),
    ]);

    const activityDates = conversations.flatMap((c) => [c.createdAt, c.updatedAt]);
    const streak = computeStreak(activityDates);

    const recent = recentConversations.map((c) => ({
      id: c.id,
      updatedAt: c.updatedAt,
      title:
        c.messages[0]?.content?.slice(0, 40) || new Date(c.updatedAt).toLocaleDateString(),
    }));

    const xp = userData?.xp ?? 0;
    const level = Math.floor(xp / 100) + 1;
    const xpInLevel = xp % 100;

    return NextResponse.json({
      streak,
      totalConversations: conversations.length,
      totalMessages: messageCount,
      recentConversations: recent,
      xp,
      level,
      xpInLevel,
    });
  } catch (error) {
    console.error("[DASHBOARD_API]", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
