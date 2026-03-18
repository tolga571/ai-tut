import { NextResponse } from "next/server";

export async function GET() {
  // Keep dev-only credentials out of the client bundle.
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    email: "test@aitut.com",
    password: "Test123!",
  });
}

