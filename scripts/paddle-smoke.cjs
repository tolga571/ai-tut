/**
 * Local Paddle connectivity check (no secrets printed).
 * Usage (from repo root): node scripts/paddle-smoke.cjs
 */
require("dotenv").config();

async function main() {
  const apiKey = process.env.PADDLE_API_KEY;
  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  const paddleEnv = process.env.NEXT_PUBLIC_PADDLE_ENV || "(unset → app uses sandbox)";
  const priceIds = {
    monthly: process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY,
    quarterly: process.env.NEXT_PUBLIC_PADDLE_PRICE_QUARTERLY,
    yearly: process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY,
  };

  console.log("Paddle smoke test\n");
  console.log("NEXT_PUBLIC_PADDLE_ENV:", paddleEnv);
  console.log("PADDLE_API_KEY set:", Boolean(apiKey));
  console.log("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN set:", Boolean(clientToken));
  console.log(
    "Price env vars:",
    Object.fromEntries(
      Object.entries(priceIds).map(([k, v]) => [k, Boolean(v && String(v).trim())])
    )
  );

  if (!apiKey) {
    console.error("\nFAIL: PADDLE_API_KEY missing");
    process.exit(1);
  }

  const isSandbox =
    apiKey.startsWith("pdl_sdbx") || apiKey.includes("sdbx");
  const base = isSandbox
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";

  console.log("\nAPI base:", base, isSandbox ? "(sandbox)" : "(production)");

  const productsRes = await fetch(`${base}/products`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
  console.log(
    "GET /products:",
    productsRes.status,
    productsRes.ok ? "OK" : "FAIL"
  );

  for (const [label, id] of Object.entries(priceIds)) {
    if (!id || !String(id).trim()) {
      console.log(`GET /prices (${label}): SKIP (not set)`);
      continue;
    }
    const pr = await fetch(`${base}/prices/${encodeURIComponent(id)}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    console.log(
      `GET /prices (${label}):`,
      pr.status,
      pr.ok ? "OK" : "FAIL"
    );
  }

  if (!clientToken) {
    console.warn(
      "\nWARN: client token missing — checkout overlay will not initialize in the browser."
    );
  }

  if (!productsRes.ok) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Network or runtime error:", e instanceof Error ? e.message : e);
  process.exit(1);
});
