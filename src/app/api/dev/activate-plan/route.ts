import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DEV ONLY — remove before production
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { planStatus: "active" },
  });

  return NextResponse.json({ success: true });
}
