import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const { Pool } = pg

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

const connectionString = getPrismaUrl();

if (!connectionString) {
  throw new Error("DATABASE_URL or DIRECT_URL is not defined");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
