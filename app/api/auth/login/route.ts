import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { AUTH_COOKIE, isAppRole, sessionCookieOptions, signSessionToken } from "@/lib/jwt";
import { apiError } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    //  lazy import: só carrega Prisma quando realmente entrar no handler
    const { prisma } = await import("@/lib/prisma");

    const body = await req.json().catch(() => ({}));
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(400, "Email e senha obrigatórios");
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
        createdAt: true,
        image: true,
        mustChangePassword: true,
      },
    });

    if (!user || !user.passwordHash || !isAppRole(user.role)) {
      return apiError(401, "Credenciais inválidas");
    }

    const isValid = await compare(password, user.passwordHash);
    if (!isValid) {
      return apiError(401, "Credenciais inválidas");
    }

    const token = await signSessionToken(user.id, user.role);

    // O JWT vai só no cookie httpOnly — nunca no corpo da resposta.
    const res = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          image: user.image,
          mustChangePassword: user.mustChangePassword,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );

    res.cookies.set(AUTH_COOKIE, token, sessionCookieOptions());

    return res;
  } catch (err) {
    console.error("Erro em /api/auth/login:", err);
    return apiError(500, "Erro interno do servidor");
  }
}
