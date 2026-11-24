import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authHelper";
import { apiError, handleRouteError } from "@/lib/apiError";
import { jsonNull } from "@/lib/validation/player";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/chats/[id]/messages
 * Body: { messages: [{ role, content, attachments? }] }
 * Saves one or more messages to the conversation and bumps updatedAt.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser(req, { role: "ADMIN" });
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.id;

  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const msgs: any[] = Array.isArray(body?.messages) ? body.messages : [];

    if (msgs.length === 0) {
      return apiError(400, "Nenhuma mensagem fornecida");
    }

    // Verify ownership
    const conv = await prisma.chatConversation.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!conv) {
      return apiError(404, "Conversa não encontrada");
    }

    // Validate and sanitize each message
    const validRoles = new Set(["user", "assistant"]);
    const data = msgs
      .filter((m) => validRoles.has(m?.role) && typeof m?.content === "string" && m.content.trim())
      .map((m) => ({
        conversationId: id,
        role: m.role as string,
        content: String(m.content).trim(),
        toolTraces: jsonNull(m.toolTraces ?? null),
        attachments: jsonNull(m.attachments ?? null),
      }));

    if (data.length === 0) {
      return apiError(400, "Mensagens inválidas");
    }

    await prisma.$transaction([
      prisma.chatMessage.createMany({ data }),
      prisma.chatConversation.update({
        where: { id },
        data: { updatedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true, saved: data.length }, { status: 201 });
  } catch (err) {
    return handleRouteError(err, "POST /api/chats/[id]/messages", "Erro ao salvar mensagens");
  }
}
