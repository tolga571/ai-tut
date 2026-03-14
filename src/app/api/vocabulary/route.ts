import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const words = await prisma.vocabularyWord.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(words);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { word, translation, language, example } = await req.json();
  if (!word?.trim() || !translation?.trim() || !language?.trim()) {
    return NextResponse.json({ error: "word, translation and language are required" }, { status: 400 });
  }

  const created = await prisma.vocabularyWord.create({
    data: { userId: user.id, word: word.trim(), translation: translation.trim(), language, example: example?.trim() || null },
  });

  return NextResponse.json(created, { status: 201 });
}
