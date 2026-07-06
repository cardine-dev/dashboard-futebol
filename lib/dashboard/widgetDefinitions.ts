import { WidgetDefinition } from "@/type/dashboard";
import type { Translations } from "@/locales";

/**
 * DEFINIÇÃO ÚNICA E CANÔNICA DOS WIDGETS
 * ------------------------------------
 * Títulos e descrições agora vêm do i18n (t.widgetTitles / t.widgetDescriptions)
 * Os IDs PT ficam como fallback.
 */

const RAW_WIDGETS: WidgetDefinition[] = [
  { id: "overview.geo_map", title: "Mapa (mundo → Brasil)", description: "Jogadores por país e, ao clicar no Brasil, por estado (UF).", group: "base", scope: "both", defaultEnabled: true, defaultSize: "lg", keywords: ["mapa", "mundo", "brasil", "país", "estado", "geografia"] },
  { id: "kpi.base.players_count", title: "Jogadores do elenco", description: "Quantidade total de jogadores do elenco.", group: "overview", scope: "base", defaultEnabled: false, defaultSize: "sm", keywords: ["jogadores", "elenco", "total"] },
  { id: "kpi.base.total_market_value", title: "Valor de mercado total", description: "Soma do valor de mercado do elenco.", group: "overview", scope: "base", defaultEnabled: false, defaultSize: "sm", keywords: ["valor", "mercado", "financeiro"] },
  { id: "kpi.base.avg_age", title: "Idade média", description: "Idade média dos jogadores do elenco.", group: "overview", scope: "base", defaultEnabled: false, defaultSize: "sm", keywords: ["idade", "média"] },
  { id: "kpi.market.deals_count", title: "Transações no mercado", description: "Número de transferências no período.", group: "overview", scope: "market", defaultEnabled: false, defaultSize: "sm", keywords: ["transferências", "mercado"] },
  { id: "kpi.market.total_fee", title: "Volume financeiro do mercado", description: "Valor total movimentado em transferências.", group: "overview", scope: "market", defaultEnabled: false, defaultSize: "sm", keywords: ["valor", "mercado", "transferências"] },
  { id: "base.age_distribution", title: "Distribuição de idades", description: "Jogadores do elenco por faixa etária.", group: "base", scope: "base", defaultEnabled: true, defaultSize: "md", keywords: ["idade", "faixa", "histograma"] },
  { id: "base.position_distribution", title: "Distribuição por posição", description: "Composição do elenco por posição.", group: "base", scope: "base", defaultEnabled: true, defaultSize: "md", keywords: ["posição", "elenco"] },
  { id: "base.market_value_top_players", title: "Top jogadores por valor de mercado", description: "Ranking dos jogadores mais valiosos do elenco.", group: "base", scope: "base", defaultEnabled: true, defaultSize: "lg", keywords: ["valor", "ranking", "jogadores"] },
  { id: "base.age_vs_value_scatter", title: "Idade vs valor de mercado", description: "Relação entre idade e valor dos jogadores.", group: "base", scope: "base", defaultEnabled: false, defaultSize: "lg", keywords: ["idade", "valor", "scatter"] },
  { id: "base.representation_ranking", title: "Agências / Representação", description: "Ranking de agências por número e valor de jogadores.", group: "base", scope: "base", defaultEnabled: false, defaultSize: "md", keywords: ["agência", "representação"] },
  { id: "base.rights_distribution", title: "Pipeline de Direitos", description: "Distribuição percentual dos direitos econômicos do clube.", group: "base", scope: "base", defaultEnabled: false, defaultSize: "md", keywords: ["direitos", "percentual", "financeiro"] },
  { id: "base.age_by_position", title: "Idade por posição", description: "Distribuição de faixas etárias dentro de cada posição.", group: "base", scope: "base", defaultEnabled: false, defaultSize: "lg", keywords: ["idade", "posição", "matriz"] },
  { id: "market.deals_by_month", title: "Transações por mês", description: "Volume mensal de transferências.", group: "market", scope: "market", defaultEnabled: false, defaultSize: "md", keywords: ["transações", "mensal"] },
  { id: "market.fee_by_month", title: "Valor movimentado por mês", description: "Soma mensal dos valores de transferência.", group: "market", scope: "market", defaultEnabled: false, defaultSize: "md", keywords: ["valor", "mensal"] },
  { id: "market.fee_distribution", title: "Distribuição dos valores", description: "Distribuição dos valores das transferências.", group: "market", scope: "market", defaultEnabled: false, defaultSize: "md", keywords: ["histograma", "valor"] },
  { id: "market.top_buyers_sellers", title: "Top clubes compradores/vendedores", description: "Ranking de clubes por volume financeiro.", group: "market", scope: "market", defaultEnabled: false, defaultSize: "lg", keywords: ["clubes", "ranking"] },
  { id: "market.top_leagues_countries", title: "Top ligas e países", description: "Distribuição de transferências por liga ou país.", group: "market", scope: "market", defaultEnabled: false, defaultSize: "md", keywords: ["ligas", "países"] },
  { id: "market.age_vs_fee_scatter", title: "Idade vs valor da transferência", description: "Relação entre idade e valor das transferências.", group: "market", scope: "market", defaultEnabled: false, defaultSize: "lg", keywords: ["idade", "valor", "scatter"] },
  { id: "market.position_avg_fee", title: "Valor médio por posição", description: "Valor médio das transferências por posição.", group: "market", scope: "market", defaultEnabled: false, defaultSize: "md", keywords: ["posição", "média"] },
  { id: "compare.position_share_base_vs_market", title: "Posições: Base vs Mercado", description: "Comparação percentual de posições entre elenco e mercado.", group: "compare", scope: "both", defaultEnabled: false, defaultSize: "lg", keywords: ["comparação", "posição"] },
  { id: "compare.avg_age_by_position", title: "Idade média por posição", description: "Comparação da idade média por posição (elenco vs mercado).", group: "compare", scope: "both", defaultEnabled: false, defaultSize: "lg", keywords: ["comparação", "idade"] },
];

/** Get widgets with i18n-translated titles and descriptions */
export function getLocalizedWidgets(t: Translations): WidgetDefinition[] {
  return RAW_WIDGETS.map((w) => ({
    ...w,
    title: t.widgetTitles[w.id] ?? w.title,
    description: t.widgetDescriptions[w.id] ?? w.description,
  }));
}

/** Fallback export for non-i18n contexts */
export const WIDGETS = RAW_WIDGETS;
