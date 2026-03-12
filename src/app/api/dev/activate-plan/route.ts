import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// DEV ONLY — disabled in production
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  const { userId } = await req.json();

  if (!userId || typeof userId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid userId" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { planStatus: "active" },
  });

  logger.debug("Dev: Plan activated", { userId });

  return NextResponse.json({ success: true });
}
