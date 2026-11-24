/**
 * Núcleo único de JWT — usado pelo proxy.ts (páginas) e por lib/authHelper.ts (API).
 *
 * - Segredo: JWT_SECRET. Fallback de desenvolvimento só quando NODE_ENV !== "production".
 * - Em produção sem JWT_SECRET: fail-closed (verify devolve null, sign lança erro),
 *   exceto com APP_ENV=demo explícito: a demo é pública, com dados fictícios e
 *   credenciais no README, então o fallback não protege nada que já não esteja aberto.
 * - Sem dependência de Prisma nem de next/server: roda em qualquer runtime.
 */
import { SignJWT, jwtVerify } from "jose";

export const AUTH_COOKIE = "app_token";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias
/** /api/auth/me só renova o token quando faltar menos que isso para expirar. */
export const SESSION_RENEW_THRESHOLD_SECONDS = 60 * 60 * 24; // 1 dia

export type AppRole = "ADMIN" | "CLIENT";
export type SessionClaims = { sub: string; role: AppRole; exp: number | null };

const DEV_FALLBACK_SECRET = "dev_secret_change_in_prod";

function getSecretKey(): Uint8Array | null {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return new TextEncoder().encode(secret);
  if (process.env.NODE_ENV === "production" && process.env.APP_ENV !== "demo") return null;
  return new TextEncoder().encode(DEV_FALLBACK_SECRET);
}

export function isAppRole(v: unknown): v is AppRole {
  return v === "ADMIN" || v === "CLIENT";
}

export async function verifySessionToken(token: string | null | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  const key = getSecretKey();
  if (!key) return null;

  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    const sub = typeof payload.sub === "string" && payload.sub ? payload.sub : null;
    const role = isAppRole(payload.role) ? payload.role : null;
    if (!sub || !role) return null;
    return { sub, role, exp: typeof payload.exp === "number" ? payload.exp : null };
  } catch {
    return null;
  }
}

export async function signSessionToken(sub: string, role: AppRole): Promise<string> {
  const key = getSecretKey();
  if (!key) throw new Error("JWT_SECRET não configurado em produção.");

  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key);
}

/** Atributos do cookie de sessão (iguais no login, no /me e no logout). */
export function sessionCookieOptions(maxAge: number = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}
