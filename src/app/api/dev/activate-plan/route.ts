import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DEV ONLY — blocked in production and requires a mandatory dev secret
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  // DEV_SECRET zorunlu: tanımlanmamışsa endpoint tamamen kapalı (D1)
  const devSecret = process.env.DEV_SECRET;
  if (!devSecret) {
    return NextResponse.json(
      { error: "DEV_SECRET env var is not set. This endpoint is disabled." },
      { status: 403 }
    );
  }

  const provided = req.headers.get("x-dev-secret");
  if (provided !== devSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { planStatus: "active" },
  });

  return NextResponse.json({ success: true });
}
