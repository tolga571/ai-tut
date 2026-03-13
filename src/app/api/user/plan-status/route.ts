import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    // Support both session-based and userId query param (for post-registration polling)
    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get("userId");

    if (queryUserId) {
      // Basic validation for CUID format
      if (queryUserId.length < 20 || queryUserId.length > 30) {
        return NextResponse.json(
          { success: false, message: "Geçersiz kullanıcı ID" },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: queryUserId },
        select: { planStatus: true },
      });
      return NextResponse.json({
        success: true,
        planStatus: user?.planStatus ?? "inactive",
      });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { planStatus: true },
    });

    return NextResponse.json({
      success: true,
      planStatus: user?.planStatus ?? "inactive",
    });
  } catch (error) {
    logger.error("Plan status GET error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { success: false, message: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
