import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getPrismaUrl(): string | undefined {
  const raw = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!raw) return undefined;

  try {
    const parsed = new URL(raw);

    // Supabase pooler is expected on 6543. If 5432 is used with pooler host,
    // Prisma frequently fails to connect in app runtime.
    if (parsed.hostname.endsWith(".pooler.supabase.com") && parsed.port === "5432") {
      parsed.port = "6543";
    }

    if (!parsed.searchParams.get("sslmode")) {
      parsed.searchParams.set("sslmode", "require");
    }

    return parsed.toString();
  } catch {
    return raw;
  }
}

const prismaUrl = getPrismaUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    prismaUrl
      ? {
          datasources: {
            db: { url: prismaUrl },
          },
        }
      : undefined
  );

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
