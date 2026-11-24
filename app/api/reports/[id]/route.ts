import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authHelper";
import { apiError, handleRouteError } from "@/lib/apiError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/reports/[id] */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.id;

  const { id } = await params;

  try {
    const report = await prisma.report.findFirst({
      where: { id, userId },
    });

    if (!report) {
      return apiError(404, "Relatório não encontrado");
    }

    return NextResponse.json({ report });
  } catch (err) {
    return handleRouteError(err, "GET /api/reports/[id]", "Erro ao buscar relatório");
  }
}

/** PATCH /api/reports/[id] — rename report */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.id;

  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));

    const title =
      typeof body?.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 200)
        : null;

    if (!title) {
      return apiError(400, "Título é obrigatório");
    }

    const existing = await prisma.report.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      return apiError(404, "Relatório não encontrado");
    }

    const report = await prisma.report.update({
      where: { id },
      data: { title },
      select: {
        id: true,
        title: true,
        createdAt: true,
        conversationId: true,
      },
    });

    return NextResponse.json({ report });
  } catch (err) {
    return handleRouteError(err, "PATCH /api/reports/[id]", "Erro ao renomear relatório");
  }
}

/** DELETE /api/reports/[id] */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.id;

  const { id } = await params;

  try {
    const result = await prisma.report.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      return apiError(404, "Relatório não encontrado");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err, "DELETE /api/reports/[id]", "Erro ao deletar relatório");
  }
}