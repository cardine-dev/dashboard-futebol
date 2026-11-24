// app/api/usuarios/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";
import { requireUser } from "@/lib/authHelper";
import { apiError, handleRouteError } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  image: true,
  mustChangePassword: true,
};

// GET /api/usuarios - listar usuários (apenas admin)
export async function GET(req: NextRequest) {
  const auth = await requireUser(req, { role: "ADMIN" });
  if (auth instanceof NextResponse) return auth;

  try {

    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (err) {
    return handleRouteError(err, "GET /api/usuarios");
  }
}

// POST /api/usuarios - criar usuário (apenas admin)
export async function POST(req: NextRequest) {
  const auth = await requireUser(req, { role: "ADMIN" });
  if (auth instanceof NextResponse) return auth;

  try {

    const body = await req.json().catch(() => ({}));

    const schema = z.object({
      name: z.string().min(1, "Nome obrigatório"),
      email: z.string().email("Email inválido"),
      password: z.string().min(6, "Senha inválida"),
      role: z.enum(["ADMIN", "CLIENT"]),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "Dados inválidos");
    }

    const name = parsed.data.name.trim();
    const email = parsed.data.email.trim().toLowerCase();
    const {password, role} = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return apiError(409, "Email já registrado");
    }

    const passwordHash = await hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        mustChangePassword: true,
      },
      select: userSelect,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    return handleRouteError(err, "POST /api/usuarios");
  }
}

// PUT /api/usuarios - atualizar perfil do usuário logado (ou outro se ADMIN)
// Qualquer usuário logado edita o PRÓPRIO perfil; editar outro exige ADMIN.
export async function PUT(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const decoded = { sub: auth.user.id, role: auth.user.role };

  try {

    const body = await req.json().catch(() => ({}));

    const schema = z.object({
      id: z.string().optional(), // compat; preferir ignorar no backend
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "Dados inválidos");
    }

    const targetUserId = parsed.data.id || decoded.sub;

    if (targetUserId !== decoded.sub && decoded.role !== "ADMIN") {
      return apiError(403, "Acesso negado");
    }

    const nextData: { name?: string; email?: string } = {};

    if (parsed.data.name !== undefined) nextData.name = parsed.data.name.trim();

    if (parsed.data.email !== undefined) {
      const nextEmail = parsed.data.email.trim().toLowerCase();

      const existing = await prisma.user.findUnique({ where: { email: nextEmail } });
      if (existing && existing.id !== targetUserId) {
        return apiError(409, "Email já registrado");
      }

      nextData.email = nextEmail;
    }

    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: nextData,
      select: userSelect,
    });

    return NextResponse.json(user);
  } catch (err) {
    return handleRouteError(err, "PUT /api/usuarios");
  }
}

// DELETE /api/usuarios - deletar usuário (apenas admin)
export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req, { role: "ADMIN" });
  if (auth instanceof NextResponse) return auth;

  try {

    const body = await req.json().catch(() => ({}));
    const schema = z.object({ id: z.string().min(1) });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "ID obrigatório");
    }

    await prisma.user.delete({ where: { id: parsed.data.id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err, "DELETE /api/usuarios");
  }
}
