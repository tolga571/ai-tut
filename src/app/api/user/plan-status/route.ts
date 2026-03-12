import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const queryUserId = searchParams.get("userId");

  // Session ile ya da userId query param ile çalışır
  if (queryUserId) {
    const user = await prisma.user.findUnique({
      where: { id: queryUserId },
      select: { planStatus: true },
    });
    return NextResponse.json({ planStatus: user?.planStatus ?? "inactive" });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planStatus: true },
  });

  return NextResponse.json({ planStatus: user?.planStatus ?? "inactive" });
}
