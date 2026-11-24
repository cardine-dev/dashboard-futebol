import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Envelope de erro das rotas de API: `{ error: string }` + status HTTP correto.
 * Nunca devolve `err.message` cru ao cliente — o detalhe vai só pro log do servidor.
 */
export function apiError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...(extra ?? {}) }, { status });
}

/** Erro de "registro não encontrado" do Prisma (ou do mock demo, que imita o código). */
export function isNotFoundError(err: unknown): boolean {
  return (err as { code?: unknown } | null)?.code === "P2025";
}

/** Violação de unique do Prisma. */
export function isUniqueError(err: unknown): boolean {
  return (err as { code?: unknown } | null)?.code === "P2002";
}

/**
 * Converte qualquer erro lançado num handler na resposta certa:
 * ZodError → 400 · P2025 → 404 · P2002 → 409 · resto → 500 genérico.
 */
export function handleRouteError(err: unknown, context: string, fallback = "Erro interno") {
  if (err instanceof ZodError) return apiError(400, "Dados inválidos");
  if (isNotFoundError(err)) return apiError(404, "Registro não encontrado");
  if (isUniqueError(err)) return apiError(409, "Registro já existe");
  console.error(`[api] ${context}:`, err);
  return apiError(500, fallback);
}
