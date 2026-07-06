import { NextRequest, NextResponse } from "next/server";
import { players, transferencias } from "@/lib/demo/dataset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Chatbot em modo demo — respostas simuladas (sem OpenAI / serviço externo).
 * Gera uma análise plausível a partir do dataset sintético, conforme a intenção
 * detectada na última mensagem do usuário.
 */

const fmtEur = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

function buildAnswer(question: string): string {
  const q = question.toLowerCase();

  const withValue = players.filter((p) => p.valorMercado != null);
  const top = [...withValue].sort((a, b) => b.valorMercado - a.valorMercado).slice(0, 5);
  const avgAge =
    players.reduce((a, p) => a + (p.idade ?? 0), 0) / Math.max(players.length, 1);
  const totalValueEur = withValue.reduce((a, p) => a + p.valorMercado * 1_000_000, 0);

  if (q.includes("portf") || q.includes("venda") || q.includes("oportun") || q.includes("roi")) {
    const oportunidades = top
      .filter((p) => (p.possePct ?? 0) >= 60)
      .slice(0, 3)
      .map((p, i) => `${i + 1}. **${p.nome}** (${p.posicao}, ${p.idade} anos) — ${fmtEur(p.valorMercado * 1_000_000)} · direitos ${p.possePct}%`)
      .join("\n");
    return [
      "## Oportunidades de venda (análise demo)",
      "",
      "Cruzando valor de mercado e percentual de direitos, os destaques são:",
      "",
      oportunidades || "Nenhum atleta com direitos ≥ 60% e alto valor no momento.",
      "",
      `O valor total de mercado do elenco é de aproximadamente **${fmtEur(totalValueEur)}**.`,
      "",
      "**Recomendação:** priorizar negociação dos atletas sub-23 com alto percentual de direitos antes da próxima janela.",
    ].join("\n");
  }

  if (q.includes("elenco") || q.includes("posi") || q.includes("idade") || q.includes("distrib")) {
    const byPos = players.reduce<Record<string, number>>((acc, p) => {
      acc[p.posicao] = (acc[p.posicao] ?? 0) + 1;
      return acc;
    }, {});
    const dist = Object.entries(byPos)
      .sort((a, b) => b[1] - a[1])
      .map(([pos, n]) => `- ${pos}: ${n} jogadores`)
      .join("\n");
    return [
      "## Análise de elenco (demo)",
      "",
      `Total de **${players.length} jogadores**, idade média de **${avgAge.toFixed(1)} anos**.`,
      "",
      "**Distribuição por posição:**",
      dist,
      "",
      "**Ponto de atenção:** monitorar concentração de valor em poucas posições.",
      "",
      "**Recomendação:** reforçar profundidade nas posições com menos opções.",
    ].join("\n");
  }

  if (q.includes("mercado") || q.includes("transfer") || q.includes("comprador") || q.includes("pagando")) {
    const withVal = transferencias.filter((t) => t.valor && t.valor > 0);
    const avgFee = withVal.reduce((a, t) => a + (t.valor ?? 0), 0) / Math.max(withVal.length, 1);
    return [
      "## Panorama de mercado (demo)",
      "",
      `Base de **${transferencias.length} transferências** monitoradas, ticket médio de **${fmtEur(avgFee)}**.`,
      "",
      "Atacantes e meias concentram os maiores valores. O volume de negócios cresce no segundo semestre.",
      "",
      "**Recomendação:** usar janelas de baixa atividade para negociar com menos pressão competitiva.",
    ].join("\n");
  }

  return [
    "## Assistente de scouting (demo)",
    "",
    "Posso analisar **portfólio/oportunidades de venda**, **composição do elenco** e **panorama de mercado**.",
    "",
    `No momento o elenco tem **${players.length} jogadores** (idade média ${avgAge.toFixed(1)}) e a base de mercado tem **${transferencias.length} transferências**.`,
    "",
    "_Esta é uma resposta simulada do modo demonstração._",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const msgs = Array.isArray(body?.messages) ? body.messages : [];
    const lastUser = [...msgs].reverse().find((m: any) => m?.role === "user");
    const question = String(lastUser?.content ?? "");

    // pequena latência pra simular processamento
    await new Promise((r) => setTimeout(r, 350));

    return NextResponse.json({
      assistant_message: buildAnswer(question),
      conversation_id: body?.conversation_id ?? null,
      demo: true,
    });
  } catch {
    return NextResponse.json(
      { error: "Falha ao processar (demo)." },
      { status: 500 },
    );
  }
}
