import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapPlayerToJogador } from "@/lib/mapPlayerToJogador";
import type { Jogador } from "@/type/jogador";
import { requireUser } from "@/lib/authHelper";
import { apiError, handleRouteError } from "@/lib/apiError";
import { PlayerInput, toPlayerData } from "@/lib/validation/player";

export const dynamic = "force-dynamic";

type ClubLite = { id: string; nome: string; logoUrl: string | null };

const MAX_IDS = 200;

/** `?ids=a,b,c` → lista limpa (sem vazios/duplicados), ou null se ausente. */
function parseIds(raw: string | null): string[] | null {
  if (raw === null) return null;
  const ids = Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
  return ids.slice(0, MAX_IDS);
}

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const isAdmin = auth.user.role === "ADMIN";

  try {
    const ids = parseIds(new URL(req.url).searchParams.get("ids"));
    if (ids && ids.length === 0) return NextResponse.json({ jogadores: [] });

    // 1) Busca jogadores sem relations
    const players = await prisma.player.findMany({
      ...(ids ? { where: { id: { in: ids } } } : {}),
      orderBy: { nome: "asc" },
    });

    // 2) Coleta clubeIds
    const clubeIds = Array.from(
      new Set(players.map((p) => p.clubeId).filter((x): x is string => !!x)),
    );

    // 3) Busca clubes em batch (inclui logoUrl)
    const clubs: ClubLite[] = clubeIds.length
      ? await prisma.club.findMany({
          where: { id: { in: clubeIds } },
          select: { id: true, nome: true, logoUrl: true },
        })
      : [];

    const clubById = new Map<string, ClubLite>(clubs.map((c) => [c.id, c]));

    // 4) Mapeia jogadores com clubObj (nome + logo)
    //    CPF é dado pessoal: só ADMIN recebe (CLIENT recebe string vazia, mesmo formato).
    const jogadores: Jogador[] = players.map((p) => {
      const club = p.clubeId ? (clubById.get(p.clubeId) ?? null) : null;
      const j = mapPlayerToJogador(p, club);
      return isAdmin ? j : { ...j, cpf: "" };
    });

    return NextResponse.json({ jogadores });
  } catch (err) {
    return handleRouteError(err, "GET /api/jogadores", "Erro ao buscar jogadores");
  }
}

export async function POST(req: Request) {
  const auth = await requireUser(req, { role: "ADMIN" });
  if (auth instanceof NextResponse) return auth;

  try {
    const body = PlayerInput.parse(await req.json().catch(() => ({})));

    if (!body.nome) {
      return apiError(400, "Preencha o nome do jogador.");
    }

    const parsed = toPlayerData(body);
    if ("error" in parsed) return apiError(400, parsed.error);
    const clubeId = body.clubeId ?? null;

    // valida clubeId (se enviado) e já pega nome+logo
    let club: ClubLite | null = null;
    if (clubeId) {
      club = await prisma.club.findUnique({
        where: { id: clubeId },
        select: { id: true, nome: true, logoUrl: true },
      });
      if (!club) {
        return apiError(400, "clubeId inválido (clube não existe).");
      }
    }

    // Padrões do cadastro; o que veio no corpo sobrescreve.
    const data: any = { idade: 0, posicao: "ATA", peDominante: "D", valorMercado: 0, ...parsed.data, clubeId };
    const created = await prisma.player.create({ data });

    return NextResponse.json(
      { jogador: mapPlayerToJogador(created, club) },
      { status: 201 },
    );
  } catch (err) {
    return handleRouteError(err, "POST /api/jogadores", "Erro ao criar jogador");
  }
}
