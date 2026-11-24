import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authHelper";
import { apiError, handleRouteError } from "@/lib/apiError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/chats/[id] — fetch conversation with messages */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser(req, { role: "ADMIN" });
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.id;

  const { id } = await params;

  try {
    const conversation = await prisma.chatConversation.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            attachments: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      return apiError(404, "Conversa não encontrada");
    }

    return NextResponse.json({ conversation });
  } catch (err) {
    return handleRouteError(err, "GET /api/chats/[id]", "Erro ao buscar conversa");
  }
}

/** PATCH /api/chats/[id] — update conversation title */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser(req, { role: "ADMIN" });
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.id;

  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 120)
      : null;

    if (!title) {
      return apiError(400, "Título inválido");
    }

    const conversation = await prisma.chatConversation.updateMany({
      where: { id, userId },
      data: { title },
    });

    if (conversation.count === 0) {
      return apiError(404, "Conversa não encontrada");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err, "PATCH /api/chats/[id]", "Erro ao atualizar conversa");
  }
}

/** DELETE /api/chats/[id] — delete conversation (cascades messages) */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser(req, { role: "ADMIN" });
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.id;

  const { id } = await params;

  try {
    const result = await prisma.chatConversation.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      return apiError(404, "Conversa não encontrada");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err, "DELETE /api/chats/[id]", "Erro ao deletar conversa");
  }
}
