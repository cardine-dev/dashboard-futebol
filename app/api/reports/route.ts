import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authHelper";
import { apiError, handleRouteError } from "@/lib/apiError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/reports — list user's reports (newest first) */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.id;

  try {
    const reports = await prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        createdAt: true,
        conversationId: true,
      },
    });

    return NextResponse.json({ reports });
  } catch (err) {
    return handleRouteError(err, "GET /api/reports", "Erro ao buscar relatórios");
  }
}

/** POST /api/reports — create a new report */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.id;

  try {
    const body = await req.json().catch(() => ({}));

    const title =
      typeof body?.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 200)
        : null;

    const content =
      typeof body?.content === "string" && body.content.trim()
        ? body.content.trim()
        : null;

    if (!title || !content) {
      return apiError(400, "Título e conteúdo são obrigatórios");
    }

    const conversationId =
      typeof body?.conversationId === "string" ? body.conversationId : undefined;

    if (conversationId) {
      const conv = await prisma.chatConversation.findFirst({
        where: { id: conversationId, userId },
        select: { id: true },
      });

      if (!conv) {
        return apiError(404, "Conversa não encontrada");
      }
    }

    const report = await prisma.report.create({
      data: {
        title,
        content,
        userId,
        conversationId: conversationId ?? null,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    return handleRouteError(err, "POST /api/reports", "Erro ao criar relatório");
  }
}