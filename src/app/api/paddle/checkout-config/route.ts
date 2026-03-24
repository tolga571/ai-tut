import { NextResponse } from "next/server";

/**
 * Paddle overlay config read at request time (not baked into the client bundle).
 * Fixes empty NEXT_PUBLIC_* on hosts where env is only available at runtime after build.
 */
export async function GET() {
  const monthly =
    process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY?.trim() ||
    process.env.PADDLE_PRICE_MONTHLY?.trim() ||
    "";
  const quarterly =
    process.env.NEXT_PUBLIC_PADDLE_PRICE_QUARTERLY?.trim() ||
    process.env.PADDLE_PRICE_QUARTERLY?.trim() ||
    "";
  const yearly =
    process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY?.trim() ||
    process.env.PADDLE_PRICE_YEARLY?.trim() ||
    "";

  const clientToken =
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() ||
    process.env.PADDLE_CLIENT_TOKEN?.trim() ||
    "";

  const environment =
    process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox";

  return NextResponse.json(
    {
      prices: { monthly, quarterly, yearly },
      clientToken,
      environment,
    },
    {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    }
  );
}
