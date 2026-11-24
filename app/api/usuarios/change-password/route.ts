// app/api/usuarios/change-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { compare, hash } from "bcryptjs";
import { requireUser } from "@/lib/authHelper";
import { apiError, handleRouteError } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const decoded = { sub: auth.user.id };

  try {

    const body = await req.json().catch(() => ({}));

    const schema = z
      .object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(10),
        confirmNewPassword: z.string().min(10),
      })
      .refine((d) => d.newPassword === d.confirmNewPassword, {
        message: "As senhas não coincidem",
        path: ["confirmNewPassword"],
      });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "Dados inválidos");
    }

    const { currentPassword, newPassword } = parsed.data;

    if (currentPassword === newPassword) {
      return apiError(400, "A nova senha precisa ser diferente da atual");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { passwordHash: true },
    });

    if (!user) {
      return apiError(404, "Usuário não encontrado");
    }

    const ok = await compare(currentPassword, user.passwordHash);
    if (!ok) {
      return apiError(400, "Senha atual incorreta");
    }

    const newHash = await hash(newPassword, 10);

    await prisma.user.update({
      where: { id: decoded.sub },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err, "PUT /api/usuarios/change-password");
  }
}
