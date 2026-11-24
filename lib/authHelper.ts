import { NextResponse } from "next/server";
import { AUTH_COOKIE, verifySessionToken, type AppRole } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

export type AuthUser = { id: string; role: AppRole; exp: number | null };

function extractBearerToken(authHeader?: string | null): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return match?.[1] ?? null;
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) {
      const raw = part.slice(idx + 1).trim();
      try {
        return decodeURIComponent(raw) || null;
      } catch {
        return raw || null;
      }
    }
  }
  return null;
}

/** Token da requisição: `Authorization: Bearer` primeiro, depois o cookie httpOnly. */
export function getTokenFromReq(req: Request): string | null {
  const bearer = extractBearerToken(req.headers.get("authorization"));
  if (bearer) return bearer;
  const viaNext = (req as { cookies?: { get?: (n: string) => { value?: string } | undefined } }).cookies
    ?.get?.(AUTH_COOKIE)?.value;
  return viaNext ?? readCookie(req.headers.get("cookie"), AUTH_COOKIE);
}

/** Usuário da sessão ou null (sem gerar resposta). */
export async function getSessionUser(req: Request): Promise<AuthUser | null> {
  const claims = await verifySessionToken(getTokenFromReq(req));
  return claims ? { id: claims.sub, role: claims.role, exp: claims.exp } : null;
}

/**
 * Guard único das rotas de API.
 *
 *   const auth = await requireUser(req, { role: "ADMIN" });
 *   if (auth instanceof NextResponse) return auth;
 *   const { user } = auth;
 *
 * Sem sessão válida ou usuário inexistente → 401. Role exigida (lida do banco) e diferente → 403.
 */
export async function requireUser(
  req: Request,
  opts: { role?: AppRole } = {},
): Promise<{ user: AuthUser } | NextResponse> {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  // O token sozinho não basta: usuário apagado perde acesso na hora, e mudança de role vale já.
  const row = await prisma.user.findUnique({ where: { id: session.id }, select: { id: true, role: true } });
  if (!row) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const user: AuthUser = { ...session, role: row.role as AppRole };
  if (opts.role && user.role !== opts.role) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  return { user };
}
