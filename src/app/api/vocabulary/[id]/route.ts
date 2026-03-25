import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const planStatus = (session.user as { planStatus?: string }).planStatus;
  if (planStatus !== "active") {
    return NextResponse.json({ error: "Subscription required" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id } = await params;
  const word = await prisma.vocabularyWord.findUnique({ where: { id } });
  if (!word || word.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.vocabularyWord.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const planStatus = (session.user as { planStatus?: string }).planStatus;
  if (planStatus !== "active") {
    return NextResponse.json({ error: "Subscription required" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id } = await params;
  const existing = await prisma.vocabularyWord.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const correct = Boolean(body?.correct);

  const now = new Date();
  const currentStreak = existing.correctStreak ?? 0;
  const newStreak = correct ? currentStreak + 1 : 0;

  // very lightweight review spacing: grow interval as streak increases
  let nextReviewAt: Date | null = null;
  if (correct) {
    let days = 1;
    if (newStreak >= 4) days = 7;
    else if (newStreak === 3) days = 3;
    else if (newStreak === 2) days = 2;
    nextReviewAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  } else {
    // short delay after an incorrect answer
    nextReviewAt = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  }

  const updated = await prisma.vocabularyWord.update({
    where: { id },
    data: {
      reviewCount: (existing.reviewCount ?? 0) + 1,
      correctStreak: newStreak,
      lastReviewedAt: now,
      nextReviewAt,
    },
  });

  return NextResponse.json(updated);
}
