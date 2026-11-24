import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { mockPrisma } from "./demo/mockPrisma";

/**
 * Seleção do client:
 * - APP_ENV=demo (explícito)                    → mock in-memory com dados sintéticos
 * - sem DATABASE_URL fora de produção           → mock (conveniência de dev)
 * - sem DATABASE_URL em produção (sem APP_ENV=demo) → erro claro no 1º uso (+ log no boot)
 * - com DATABASE_URL                            → Postgres real via adapter pg
 *
 * Variáveis: PRISMA_POOL_MAX (padrão 10) · PRISMA_LOG=query liga o log de SQL.
 */
const connectionString = (process.env.DATABASE_URL ?? "").trim();
const isProduction = process.env.NODE_ENV === "production";
const explicitDemo = process.env.APP_ENV === "demo";

const MISCONFIGURED =
  "DATABASE_URL não configurada em produção. Defina DATABASE_URL ou APP_ENV=demo para rodar com dados sintéticos.";
/** Produção sem banco e sem APP_ENV=demo: não cai no mock em silêncio. */
const misconfigured = !explicitDemo && !connectionString && isProduction;

export const isDemo = !misconfigured && (explicitDemo || !connectionString);

/** Falha no primeiro uso (não no import, para não derrubar o `next build`). */
function misconfiguredClient(): PrismaClient {
  console.error(`[prisma] ${MISCONFIGURED}`);
  return new Proxy({} as PrismaClient, {
    get(_target, prop) {
      if (prop === "then") return undefined;
      throw new Error(MISCONFIGURED);
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function poolMax(): number {
  const n = Number(process.env.PRISMA_POOL_MAX ?? "10");
  return Number.isInteger(n) && n > 0 ? n : 10;
}

function makeRealClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString, max: poolMax() });
  const log: Prisma.LogLevel[] =
    process.env.PRISMA_LOG === "query" ? ["query", "error", "warn"] : ["error", "warn"];
  return new PrismaClient({ adapter, log });
}

export const prisma: PrismaClient = misconfigured
  ? misconfiguredClient()
  : isDemo
    ? (mockPrisma as unknown as PrismaClient)
    : (globalForPrisma.prisma ?? makeRealClient());

if (!isDemo && !misconfigured && !isProduction) {
  globalForPrisma.prisma = prisma;
}
