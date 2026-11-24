import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authHelper";
import { handleRouteError } from "@/lib/apiError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/chats — list user's conversations (newest first) */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req, { role: "ADMIN" });
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.id;

  try {
    const conversations = await prisma.chatConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({ conversations });
  } catch (err) {
    return handleRouteError(err, "GET /api/chats", "Erro ao buscar conversas");
  }
}

/** POST /api/chats — create a new conversation */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req, { role: "ADMIN" });
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.id;

  try {
    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 120)
      : "Nova conversa";

    const conversation = await prisma.chatConversation.create({
      data: { userId, title },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (err) {
    return handleRouteError(err, "POST /api/chats", "Erro ao criar conversa");
  }
}
