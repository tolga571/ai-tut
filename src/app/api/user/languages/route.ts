import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { languagesSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUserId = (session?.user as { id?: string } | undefined)?.id;
    if (!session || !session.user || !sessionUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const result = languagesSchema.safeParse(body);
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "Invalid language code";
      return new NextResponse(message, { status: 400 });
    }

    const { targetLang, nativeLang } = result.data;

    const updatedUser = await prisma.user.update({
      where: { id: sessionUserId },
      data: { targetLang, nativeLang },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[LANGUAGES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
