// app/api/formacao/route.ts
import { NextResponse } from "next/server";
import { montarFormacao } from "@/lib/formacao/projecao";

export const dynamic = "force-dynamic";

/**
 * Chance de profissionalização por nível, clubes do mesmo nível e casos
 * parecidos do elenco de base. Dados fictícios. Sem projeção financeira.
 */
export async function GET() {
  try {
    return NextResponse.json(montarFormacao());
  } catch (err) {
    console.error("[api/formacao]", err);
    return NextResponse.json({ error: "Erro ao montar a formação" }, { status: 500 });
  }
}
