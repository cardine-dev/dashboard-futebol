import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { AUTH_COOKIE, isAppRole, sessionCookieOptions, signSessionToken } from "@/lib/jwt";
import { apiError } from "@/lib/apiError";
import { SANDBOX_COOKIE, newSandboxId, sandboxCookieOptions } from "@/lib/demo/sandboxCookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hash de uma senha descartada: quando o e-mail não existe, o login ainda roda um bcrypt
// do mesmo custo, então o tempo de resposta não revela quais e-mails estão cadastrados.
const DUMMY_HASH = "$2b$10$PQPAk4.Ro9R.kZ.Bgo5sReWnzmMR1SHZh3/QIAkdPqt0o.4tI9QJa";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    //  lazy import: só carrega Prisma quando realmente entrar no handler
    const { prisma, isDemo } = await import("@/lib/prisma");

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

    const isValid = await compare(password, user?.passwordHash || DUMMY_HASH);
    if (!user || !user.passwordHash || !isAppRole(user.role) || !isValid) {
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

    // Demo: cada navegador ganha o seu sandbox de dados (lib/demo/sandbox.ts).
    if (isDemo && !req.cookies.get(SANDBOX_COOKIE)?.value) {
      res.cookies.set(SANDBOX_COOKIE, newSandboxId(), sandboxCookieOptions());
    }

    return res;
  } catch (err) {
    console.error("Erro em /api/auth/login:", err);
    return apiError(500, "Erro interno do servidor");
  }
}
