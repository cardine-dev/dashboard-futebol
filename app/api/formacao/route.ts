// app/api/formacao/route.ts
import { NextResponse } from "next/server";
import { montarFormacao } from "@/lib/formacao/projecao";
import { requireUser } from "@/lib/authHelper";
import { apiError } from "@/lib/apiError";

export const dynamic = "force-dynamic";

/**
 * Chance de profissionalização por nível, clubes do mesmo nível e casos
 * parecidos do elenco de base. Dados fictícios. Sem projeção financeira.
 */
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  try {
    return NextResponse.json(montarFormacao());
  } catch (err) {
    console.error("[api/formacao]", err);
    return apiError(500, "Erro ao montar a formação");
  }
}
