import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { mockPrisma } from "./demo/mockPrisma";

/**
 * Modo demo: sem DATABASE_URL (ou APP_ENV=demo) → usa um mock Prisma in-memory
 * com dados sintéticos. Caso contrário, conecta no Postgres real via adapter.
 */
const connectionString = (process.env.DATABASE_URL ?? "").trim();
const isDemo = process.env.APP_ENV === "demo" || !connectionString;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function makeRealClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error", "warn"],
  });
}

export const prisma: PrismaClient = isDemo
  ? (mockPrisma as unknown as PrismaClient)
  : (globalForPrisma.prisma ?? makeRealClient());

if (!isDemo && process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
