import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { noteSchema } from "@/lib/validations";

async function getActiveUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const planStatus = (session.user as { planStatus?: string }).planStatus;
  if (planStatus !== "active") {
    return { error: NextResponse.json({ error: "Subscription required" }, { status: 403 }) };
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  return { user };
}

export async function GET() {
  const result = await getActiveUser();
  if (result.error) return result.error;

  const notes = await prisma.learningNote.findMany({
    where: { userId: result.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(notes);
}

export async function POST(req: Request) {
  const result = await getActiveUser();
  if (result.error) return result.error;

  const body = await req.json().catch(() => null);
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid note";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const note = await prisma.learningNote.create({
    data: {
      userId: result.user.id,
      title: parsed.data.title || null,
      content: parsed.data.content,
      source: parsed.data.source || "chat",
    },
  });

  return NextResponse.json(note, { status: 201 });
}
