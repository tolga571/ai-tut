import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUserId = (session.user as { id?: string }).id;
  const { searchParams } = new URL(req.url);
  const queryUserId = searchParams.get("userId");

  // If userId query param is provided, it must match the session user (prevents enumeration)
  if (queryUserId && queryUserId !== sessionUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = queryUserId ?? sessionUserId;
  if (!userId) {
    return NextResponse.json({ error: "User ID not found" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planStatus: true },
  });

  return NextResponse.json({ planStatus: user?.planStatus ?? "inactive" });
}
