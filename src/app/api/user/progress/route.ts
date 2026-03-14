import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 400 });

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  try {
    const [messages, vocabWords, userData] = await Promise.all([
      prisma.message.findMany({
        where: {
          conversation: { userId },
          createdAt: { gte: sevenDaysAgo },
        },
        select: { createdAt: true, role: true, correction: true },
      }),
      prisma.vocabularyWord.findMany({
        where: { userId, createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { xp: true, cefrLevel: true, targetLang: true, createdAt: true },
      }),
    ]);

    // Build daily activity for last 7 days
    const days: { date: string; messages: number; words: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      days.push({
        date: dateStr,
        messages: messages.filter(
          (m) => m.role === "user" && m.createdAt.toISOString().slice(0, 10) === dateStr
        ).length,
        words: vocabWords.filter(
          (w) => w.createdAt.toISOString().slice(0, 10) === dateStr
        ).length,
      });
    }

    const totalMessages = messages.filter((m) => m.role === "user").length;
    const correctionsReceived = messages.filter(
      (m) => m.role === "ai" && m.correction && m.correction.trim() !== ""
    ).length;

    const xp = userData?.xp ?? 0;
    const level = Math.floor(xp / 100) + 1;
    const xpInLevel = xp % 100;

    return NextResponse.json({
      days,
      totalMessages7d: totalMessages,
      totalWords7d: vocabWords.length,
      correctionsReceived,
      xp,
      level,
      xpInLevel,
      cefrLevel: userData?.cefrLevel ?? "A1",
      targetLang: userData?.targetLang ?? "en",
      memberSince: userData?.createdAt ?? null,
    });
  } catch (error) {
    console.error("[PROGRESS_API]", error);
    return NextResponse.json({ error: "Failed to load progress" }, { status: 500 });
  }
}
