import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapPlayerToJogador } from "@/lib/mapPlayerToJogador";
import { requireUser } from "@/lib/authHelper";
import { apiError, handleRouteError } from "@/lib/apiError";
import { PlayerInput, toPlayerData } from "@/lib/validation/player";

export const dynamic = "force-dynamic";

/* =========================
   Helpers
========================= */

async function getClubLite(clubeId?: string | null) {
  if (!clubeId) return null;
  return prisma.club.findUnique({
    where: { id: clubeId },
    select: { id: true, nome: true, logoUrl: true },
  });
}

/* =========================
   GET /api/jogadores/:id
========================= */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const jogador = await prisma.player.findUnique({ where: { id } });

    if (!jogador) {
      return apiError(404, "Jogador não encontrado");
    }

    const club = await getClubLite(jogador.clubeId);
    const mapped = mapPlayerToJogador(jogador, club);

    // CPF só para ADMIN (mesmo formato de resposta para CLIENT).
    return NextResponse.json({
      jogador: auth.user.role === "ADMIN" ? mapped : { ...mapped, cpf: "" },
    });
  } catch (err) {
    return handleRouteError(err, "GET /api/jogadores/[id]", "Erro interno ao buscar jogador");
  }
}

/* ============================
   PATCH /api/jogadores/:id
============================ */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(request, { role: "ADMIN" });
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const body = PlayerInput.parse(await request.json().catch(() => ({})));

    if (body.nome !== undefined && !body.nome) {
      return apiError(400, "Preencha o nome do jogador.");
    }

    const parsed = toPlayerData(body);
    if ("error" in parsed) return apiError(400, parsed.error);
    const { clubeId, ...data } = parsed.data as Record<string, any>;

    // aplica clubeId (com validação)
    if (clubeId !== undefined) {
      const nextClubeId = clubeId ? String(clubeId) : null;

      if (nextClubeId) {
        const exists = await prisma.club.findUnique({
          where: { id: nextClubeId },
          select: { id: true },
        });
        if (!exists) {
          return apiError(400, "clubeId inválido (clube não existe).");
        }
      }

      data.clubeId = nextClubeId;
    }

    if (Object.keys(data).length === 0) {
      return apiError(400, "Nenhum campo para atualizar");
    }

    const updated = await prisma.player.update({
      where: { id },
      data,
    });

    const club = await getClubLite(updated.clubeId);

    return NextResponse.json({
      jogador: mapPlayerToJogador(updated, club),
    });
  } catch (err) {
    return handleRouteError(err, "PATCH /api/jogadores/[id]", "Erro interno ao atualizar jogador");
  }
}

/* ============================
   DELETE /api/jogadores/:id
============================ */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req, { role: "ADMIN" });
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const exists = await prisma.player.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      return apiError(404, "Jogador não encontrado");
    }

    await prisma.player.delete({ where: { id } });

    return NextResponse.json({ ok: true, deletedId: id });
  } catch (err) {
    return handleRouteError(err, "DELETE /api/jogadores/[id]", "Erro interno ao deletar jogador");
  }
}