import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authHelper";
import { apiError, handleRouteError } from "@/lib/apiError";

export const dynamic = "force-dynamic";

function toPageNumber(raw: string | null, fallback: number) {
  const n = Number(raw ?? fallback);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, toPageNumber(searchParams.get("page"), 1));
    const pageSize = Math.min(
      100,
      Math.max(10, toPageNumber(searchParams.get("pageSize"), 25)),
    );

    const q = (searchParams.get("q") ?? "").trim();
    const pos = (searchParams.get("pos") ?? "").trim();
    const pais = (searchParams.get("pais") ?? "").trim();

    const where: any = {};

    if (q) {
      where.OR = [
        { atletaNome: { contains: q, mode: "insensitive" } },
        { clubeDestino: { contains: q, mode: "insensitive" } },
        { clubeOrigem: { contains: q, mode: "insensitive" } },
        { clubeFormador: { contains: q, mode: "insensitive" } },
      ];
    }

    if (pos) where.atletaPosicao = { equals: pos, mode: "insensitive" };
    if (pais) where.paisClubeDestino = { contains: pais, mode: "insensitive" };

    const [total, rows] = await Promise.all([
      prisma.transferencia.count({ where }),
      prisma.transferencia.findMany({
        where,
        orderBy: [{ dataTransferencia: "desc" }, { atletaNome: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          atletaNome: true,
          atletaIdade: true,
          atletaPosicao: true,
          clubeFormador: true,
          clubeOrigem: true,
          clubeDestino: true,
          paisClubeDestino: true,
          dataTransferencia: true,
          valor: true,
        },
      }),
    ]);

    // valor é Decimal no Postgres (serializa como string); padroniza em number.
    const normalized = rows.map((r) => ({
      ...r,
      valor: r.valor == null ? null : Number(r.valor),
    }));

    return NextResponse.json({ page, pageSize, total, rows: normalized });
  } catch (err) {
    return handleRouteError(err, "GET /api/transferencias", "Erro ao buscar transferências");
  }
}

/**
 * DELETE /api/transferencias
 * body: { ids: string[] }
 * Deleta em lote as transferências pelos IDs (seleção via checkbox).
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req, { role: "ADMIN" });
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json().catch(() => null);

    const ids: unknown = body?.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return apiError(400, "Envie { ids: string[] } com pelo menos 1 id.");
    }

    // valida + limita pra evitar abuso sem querer
    const clean = ids
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean);

    if (clean.length === 0) {
      return apiError(400, "IDs inválidos.");
    }

    if (clean.length > 500) {
      return apiError(400, "Máximo de 500 itens por deleção em lote.");
    }

    const res = await prisma.transferencia.deleteMany({
      where: { id: { in: clean } },
    });

    return NextResponse.json({ ok: true, deleted: res.count });
  } catch (err) {
    return handleRouteError(err, "DELETE /api/transferencias", "Erro ao excluir transferências");
  }
}
