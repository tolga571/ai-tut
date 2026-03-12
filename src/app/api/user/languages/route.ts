import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { targetLang, nativeLang } = await req.json();

    if (!targetLang || !nativeLang) {
      return new NextResponse("Missing languages", { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: (session.user as any).id },
      data: {
        targetLang,
        nativeLang,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[LANGUAGES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
