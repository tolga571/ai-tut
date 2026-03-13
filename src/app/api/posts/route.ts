import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category");
  const lang = searchParams.get("language");

  const where: Record<string, unknown> = { published: true };
  if (category) where.category = category;
  if (lang) where.language = lang;

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      language: true,
      createdAt: true,
      author: { select: { name: true } },
    },
  });

  return NextResponse.json({ posts });
}
