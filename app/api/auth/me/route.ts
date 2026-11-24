// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/authHelper";
import {
  AUTH_COOKIE,
  SESSION_RENEW_THRESHOLD_SECONDS,
  isAppRole,
  sessionCookieOptions,
  signSessionToken,
} from "@/lib/jwt";
import { apiError } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      // importante: 401 (não 404) — o AuthContext trata 401/403 como sessão inválida
      return apiError(401, "Token ausente, inválido ou expirado");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        image: true,
        mustChangePassword: true,
      },
    });

    if (!user || !isAppRole(user.role)) {
      return apiError(401, "Sessão inválida");
    }

    const res = NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });

    // Renovação deslizante só perto do fim: não re-assina a cada GET.
    // Também renova se o role mudou desde a emissão do token.
    const nowSec = Math.floor(Date.now() / 1000);
    const remaining = session.exp == null ? 0 : session.exp - nowSec;
    if (remaining < SESSION_RENEW_THRESHOLD_SECONDS || session.role !== user.role) {
      const newToken = await signSessionToken(user.id, user.role);
      res.cookies.set(AUTH_COOKIE, newToken, sessionCookieOptions());
    }

    return res;
  } catch (err) {
    console.error("Erro em /api/auth/me:", err);
    return apiError(500, "Erro interno");
  }
}
