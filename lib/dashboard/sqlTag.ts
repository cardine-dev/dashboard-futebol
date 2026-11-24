import { Prisma } from "@prisma/client";
import type { WidgetFilters } from "@/type/dashboard";

/**
 * Identificadores estáveis das queries raw do dashboard.
 *
 * Cada query sai com um comentário `/* q:<tag> *\/` no SQL. No Postgres o comentário
 * é inerte; no modo demo o mock (lib/demo/mockPrisma.ts) usa a tag para escolher a
 * resposta de forma determinística, em vez de adivinhar por pedaços do texto do SQL.
 */
export type RawQueryTag =
  | "meta.transfer_columns"
  | "kpi.base_weighted_value"
  | "kpi.market_deals_per_month"
  | "market.deals_by_month"
  | "market.fee_by_month"
  | "market.fee_distribution"
  | "market.top_buyers"
  | "market.top_sellers"
  | "market.top_leagues_countries"
  | "market.age_vs_fee_scatter"
  | "market.position_avg_fee";

export type RawQueryMeta = { tag: RawQueryTag; filters: WidgetFilters | null };

/** Nome da propriedade (não enumerável) que carrega tag + filtros até o mock. */
export const RAW_QUERY_META_KEY = "__demoQueryMeta";

export function taggedSql(tag: RawQueryTag, sql: Prisma.Sql, filters?: WidgetFilters): Prisma.Sql {
  const query = Prisma.sql`/* q:${Prisma.raw(tag)} */ ${sql}`;
  const meta: RawQueryMeta = { tag, filters: filters ?? null };
  Object.defineProperty(query, RAW_QUERY_META_KEY, { value: meta, enumerable: false });
  return query;
}
