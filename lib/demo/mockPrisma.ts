/**
 * Mock Prisma client — modo demo (sem banco).
 *
 * Implementa o subconjunto da API do Prisma usado pela app sobre arrays em
 * memória (lib/demo/dataset.ts). Cobre findMany/findUnique/findFirst/count/
 * aggregate/create/createMany/update/updateMany/delete/deleteMany/$transaction
 * e $queryRaw (por casos conhecidos). Não há persistência entre reinícios.
 */
import {
  users,
  clubs,
  players,
  transferencias,
  reports,
  chatConversations,
  chatMessages,
} from "./dataset";

type Row = Record<string, any>;

const tables: Record<string, Row[]> = {
  user: users as Row[],
  club: clubs as Row[],
  player: players as Row[],
  transferencia: transferencias as Row[],
  report: reports as Row[],
  chatConversation: chatConversations as Row[],
  chatMessage: chatMessages as Row[],
};

type Rel = { type: "one" | "many"; model: string; fk: string; ref: string };
const relations: Record<string, Record<string, Rel>> = {
  player: { clube: { type: "one", model: "club", fk: "clubeId", ref: "id" } },
  club: { players: { type: "many", model: "player", fk: "clubeId", ref: "id" } },
  user: {
    conversations: { type: "many", model: "chatConversation", fk: "userId", ref: "id" },
    reports: { type: "many", model: "report", fk: "userId", ref: "id" },
  },
  chatConversation: {
    user: { type: "one", model: "user", fk: "userId", ref: "id" },
    messages: { type: "many", model: "chatMessage", fk: "conversationId", ref: "id" },
    reports: { type: "many", model: "report", fk: "conversationId", ref: "id" },
  },
  chatMessage: {
    conversation: { type: "one", model: "chatConversation", fk: "conversationId", ref: "id" },
  },
  report: {
    user: { type: "one", model: "user", fk: "userId", ref: "id" },
    conversation: { type: "one", model: "chatConversation", fk: "conversationId", ref: "id" },
  },
};

/* ----------------------------- id gen ----------------------------- */
let seq = 1000;
function genId(prefix: string) {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq}`;
}

/* ----------------------------- where ----------------------------- */
function matchCondition(value: any, cond: any): boolean {
  if (cond === null) return value === null || value === undefined;
  if (typeof cond !== "object" || cond instanceof Date) {
    return value === cond;
  }
  for (const [op, target] of Object.entries(cond)) {
    switch (op) {
      case "equals":
        if (target === null) {
          if (!(value === null || value === undefined)) return false;
        } else if (value !== target) return false;
        break;
      case "not":
        if (target === null) {
          if (value === null || value === undefined) return false;
        } else if (value === target) return false;
        break;
      case "in":
        if (!Array.isArray(target) || !target.includes(value)) return false;
        break;
      case "notIn":
        if (Array.isArray(target) && target.includes(value)) return false;
        break;
      case "gt":
        if (!(toComparable(value) > toComparable(target))) return false;
        break;
      case "gte":
        if (!(toComparable(value) >= toComparable(target))) return false;
        break;
      case "lt":
        if (!(toComparable(value) < toComparable(target))) return false;
        break;
      case "lte":
        if (!(toComparable(value) <= toComparable(target))) return false;
        break;
      case "contains": {
        const ins = (cond as any).mode === "insensitive";
        const a = String(value ?? "");
        const b = String(target ?? "");
        if (!(ins ? a.toLowerCase().includes(b.toLowerCase()) : a.includes(b))) return false;
        break;
      }
      case "startsWith": {
        if (!String(value ?? "").startsWith(String(target))) return false;
        break;
      }
      case "endsWith": {
        if (!String(value ?? "").endsWith(String(target))) return false;
        break;
      }
      case "mode":
        break; // tratado junto com contains
      default:
        // operador não suportado → ignora (não filtra)
        break;
    }
  }
  return true;
}

function toComparable(v: any): number {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string") {
    const d = Date.parse(v);
    if (!Number.isNaN(d)) return d;
  }
  return v as number;
}

function matchWhere(row: Row, where: any): boolean {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    if (key === "AND") {
      const arr = Array.isArray(cond) ? cond : [cond];
      if (!arr.every((w) => matchWhere(row, w))) return false;
    } else if (key === "OR") {
      const arr = Array.isArray(cond) ? cond : [cond];
      if (arr.length && !arr.some((w) => matchWhere(row, w))) return false;
    } else if (key === "NOT") {
      const arr = Array.isArray(cond) ? cond : [cond];
      if (arr.some((w) => matchWhere(row, w))) return false;
    } else {
      if (!matchCondition(row[key], cond)) return false;
    }
  }
  return true;
}

/* ----------------------------- select / relations ----------------------------- */
function resolveRelation(model: string, row: Row, relName: string, sub: any): any {
  const rel = relations[model]?.[relName];
  if (!rel) return undefined;
  const target = tables[rel.model] ?? [];
  if (rel.type === "one") {
    const found = target.find((r) => r[rel.ref] === row[rel.fk]) ?? null;
    if (!found) return null;
    return projectRow(rel.model, found, sub === true ? undefined : sub);
  }
  let many = target.filter((r) => r[rel.fk] === row[rel.ref]);
  if (sub && typeof sub === "object") {
    if (sub.where) many = many.filter((r) => matchWhere(r, sub.where));
    if (sub.orderBy) many = orderRows(many, sub.orderBy);
    if (typeof sub.take === "number") many = many.slice(0, sub.take);
  }
  return many.map((r) =>
    projectRow(rel.model, r, sub && typeof sub === "object" ? sub : undefined),
  );
}

function projectRow(model: string, row: Row, opts?: { select?: any; include?: any }): Row {
  const select = opts?.select;
  const include = opts?.include;

  // sem select/include → linha cheia (scalars) + includes
  if (!select) {
    const out: Row = { ...row };
    if (include) {
      for (const [k, v] of Object.entries(include)) {
        if (!v) continue;
        out[k] = resolveRelation(model, row, k, v);
      }
    }
    return out;
  }

  const out: Row = {};
  for (const [k, v] of Object.entries(select)) {
    if (!v) continue;
    if (relations[model]?.[k]) {
      out[k] = resolveRelation(model, row, k, v);
    } else {
      out[k] = row[k];
    }
  }
  return out;
}

/* ----------------------------- orderBy ----------------------------- */
function orderRows(rows: Row[], orderBy: any): Row[] {
  if (!orderBy) return rows;
  const specs = Array.isArray(orderBy) ? orderBy : [orderBy];
  const out = [...rows];
  out.sort((a, b) => {
    for (const spec of specs) {
      for (const [field, dir] of Object.entries(spec)) {
        const av = toComparable(a[field]);
        const bv = toComparable(b[field]);
        let cmp = 0;
        if (av < bv) cmp = -1;
        else if (av > bv) cmp = 1;
        if (cmp !== 0) return dir === "desc" ? -cmp : cmp;
      }
    }
    return 0;
  });
  return out;
}

/* ----------------------------- aggregate ----------------------------- */
function aggregate(rows: Row[], args: any) {
  const res: Row = {};
  const apply = (key: "_sum" | "_avg" | "_min" | "_max") => {
    if (!args[key]) return;
    res[key] = {};
    for (const field of Object.keys(args[key])) {
      const nums = rows
        .map((r) => Number(r[field]))
        .filter((n) => Number.isFinite(n));
      if (key === "_sum") res[key][field] = nums.length ? nums.reduce((a, b) => a + b, 0) : null;
      if (key === "_avg") res[key][field] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
      if (key === "_min") res[key][field] = nums.length ? Math.min(...nums) : null;
      if (key === "_max") res[key][field] = nums.length ? Math.max(...nums) : null;
    }
  };
  apply("_sum");
  apply("_avg");
  apply("_min");
  apply("_max");
  if (args._count) {
    if (args._count === true) res._count = rows.length;
    else {
      res._count = {};
      for (const field of Object.keys(args._count)) {
        res._count[field] = rows.filter((r) => r[field] !== null && r[field] !== undefined).length;
      }
    }
  }
  return res;
}

/* ----------------------------- delegate ----------------------------- */
function makeDelegate(model: string, prefix: string) {
  const rows = () => tables[model];
  const filtered = (where: any) => rows().filter((r) => matchWhere(r, where));

  return {
    async findMany(args: any = {}) {
      let res = filtered(args.where);
      if (args.distinct) {
        const seen = new Set<string>();
        const fields = Array.isArray(args.distinct) ? args.distinct : [args.distinct];
        res = res.filter((r) => {
          const k = fields.map((f: string) => r[f]).join("|");
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      }
      if (args.orderBy) res = orderRows(res, args.orderBy);
      if (typeof args.skip === "number") res = res.slice(args.skip);
      if (typeof args.take === "number") res = res.slice(0, args.take);
      return res.map((r) => projectRow(model, r, args));
    },
    async findUnique(args: any) {
      const r = filtered(args.where)[0] ?? null;
      return r ? projectRow(model, r, args) : null;
    },
    async findUniqueOrThrow(args: any) {
      const r = filtered(args.where)[0];
      if (!r) throw new Error(`${model} not found`);
      return projectRow(model, r, args);
    },
    async findFirst(args: any = {}) {
      let res = filtered(args.where);
      if (args.orderBy) res = orderRows(res, args.orderBy);
      const r = res[0] ?? null;
      return r ? projectRow(model, r, args) : null;
    },
    async count(args: any = {}) {
      return filtered(args.where).length;
    },
    async aggregate(args: any = {}) {
      return aggregate(filtered(args.where), args);
    },
    async create(args: any) {
      const now = new Date();
      const row: Row = {
        id: args.data?.id ?? genId(prefix),
        createdAt: now,
        updatedAt: now,
        ...args.data,
      };
      rows().push(row);
      return projectRow(model, row, args);
    },
    async createMany(args: any) {
      const list = Array.isArray(args?.data) ? args.data : [];
      const now = new Date();
      let count = 0;
      for (const d of list) {
        rows().push({ id: d.id ?? genId(prefix), createdAt: now, updatedAt: now, ...d });
        count += 1;
      }
      return { count };
    },
    async update(args: any) {
      const r = filtered(args.where)[0];
      if (!r) throw new Error(`${model} update: not found`);
      Object.assign(r, args.data, { updatedAt: new Date() });
      return projectRow(model, r, args);
    },
    async updateMany(args: any) {
      const list = filtered(args.where);
      for (const r of list) Object.assign(r, args.data, { updatedAt: new Date() });
      return { count: list.length };
    },
    async delete(args: any) {
      const arr = rows();
      const idx = arr.findIndex((r) => matchWhere(r, args.where));
      if (idx < 0) throw new Error(`${model} delete: not found`);
      const [removed] = arr.splice(idx, 1);
      return projectRow(model, removed, args);
    },
    async deleteMany(args: any = {}) {
      const arr = rows();
      let count = 0;
      for (let i = arr.length - 1; i >= 0; i--) {
        if (matchWhere(arr[i], args.where)) {
          arr.splice(i, 1);
          count += 1;
        }
      }
      return { count };
    },
  };
}

/* ----------------------------- $queryRaw ----------------------------- */
function sqlText(query: any): string {
  if (query == null) return "";
  if (typeof query === "string") return query;
  if (typeof query.sql === "string") return query.sql;
  if (Array.isArray(query.strings)) return query.strings.join(" ? ");
  if (Array.isArray(query)) return query.join(" ? ");
  return String(query);
}

function withDate<T extends { dataTransferencia: Date | null; valor: number | null }>(t: T) {
  return t.dataTransferencia != null;
}

function handleQueryRaw(query: any): any[] {
  const text = sqlText(query);

  if (text.includes("information_schema")) return [];

  // KPI: valor ponderado do elenco
  if (text.includes("AS weighted")) {
    const weighted = players
      .filter((p) => p.valorMercado != null && p.possePct != null)
      .reduce((acc, p) => acc + p.valorMercado * 1_000_000 * ((p.possePct as number) / 100), 0);
    return [{ weighted }];
  }

  // KPI: deals / meses distintos
  if (text.includes("AS months")) {
    const withT = transferencias.filter(withDate);
    const months = new Set(
      withT.map((t) => `${t.dataTransferencia!.getUTCFullYear()}-${t.dataTransferencia!.getUTCMonth()}`),
    );
    return [{ deals: withT.length, months: months.size }];
  }

  // market.deals_by_month
  if (text.includes("AS deals") && text.includes("EXTRACT(YEAR") && !text.includes("SUM(\"valor\")") && !text.includes("paisClubeDestino")) {
    const map = new Map<string, { year: number; month: number; deals: number }>();
    for (const t of transferencias) {
      if (!t.dataTransferencia) continue;
      const y = t.dataTransferencia.getUTCFullYear();
      const m = t.dataTransferencia.getUTCMonth() + 1;
      const k = `${y}-${m}`;
      const e = map.get(k) ?? { year: y, month: m, deals: 0 };
      e.deals += 1;
      map.set(k, e);
    }
    return [...map.values()].sort((a, b) => a.year - b.year || a.month - b.month);
  }

  // market.fee_by_month
  if (text.includes("AS value") && text.includes("EXTRACT(YEAR")) {
    const map = new Map<string, { year: number; month: number; value: number }>();
    for (const t of transferencias) {
      if (!t.dataTransferencia || !t.valor || t.valor <= 0) continue;
      const y = t.dataTransferencia.getUTCFullYear();
      const m = t.dataTransferencia.getUTCMonth() + 1;
      const k = `${y}-${m}`;
      const e = map.get(k) ?? { year: y, month: m, value: 0 };
      e.value += t.valor;
      map.set(k, e);
    }
    return [...map.values()].sort((a, b) => a.year - b.year || a.month - b.month);
  }

  // market.fee_distribution
  if (text.includes("AS valor") && !text.includes("GROUP BY")) {
    return transferencias.filter((t) => t.valor && t.valor > 0).map((t) => ({ valor: t.valor }));
  }

  // market.top_buyers_sellers (buyers)
  if (text.includes("clubeDestino") && text.includes("GROUP BY")) {
    return groupSum(transferencias, "clubeDestino").slice(0, 12);
  }
  // sellers
  if (text.includes("clubeOrigem") && text.includes("GROUP BY")) {
    return groupSum(transferencias, "clubeOrigem").slice(0, 12);
  }

  // market.top_leagues_countries
  if (text.includes("paisClubeDestino") && text.includes("AS label")) {
    const map = new Map<string, number>();
    for (const t of transferencias) {
      const label = (t.paisClubeDestino ?? "").trim() || "—";
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([label, deals]) => ({ label, deals }))
      .sort((a, b) => b.deals - a.deals)
      .slice(0, 12);
  }

  // market.age_vs_fee_scatter
  if (text.includes("AS idade") && text.includes("atletaIdade")) {
    return transferencias
      .filter((t) => t.atletaIdade != null && t.valor && t.valor > 0)
      .slice(0, 800)
      .map((t) => ({
        idade: t.atletaIdade,
        valor: t.valor,
        posicao: t.atletaPosicao,
        label: t.atletaNome,
      }));
  }

  // market.position_avg_fee
  if (text.includes('AVG("valor")') && text.includes("atletaPosicao")) {
    const map = new Map<string, { sum: number; deals: number }>();
    for (const t of transferencias) {
      if (!t.valor || t.valor <= 0) continue;
      const pos = (t.atletaPosicao ?? "").trim() || "—";
      const e = map.get(pos) ?? { sum: 0, deals: 0 };
      e.sum += t.valor;
      e.deals += 1;
      map.set(pos, e);
    }
    return [...map.entries()]
      .map(([posicao, v]) => ({ posicao, avg: v.sum / v.deals, deals: v.deals }))
      .sort((a, b) => b.avg - a.avg);
  }

  return [];
}

function groupSum(list: any[], field: string) {
  const map = new Map<string, number>();
  for (const t of list) {
    const key = (t[field] ?? "").trim();
    if (!key || !t.valor || t.valor <= 0) continue;
    map.set(key, (map.get(key) ?? 0) + t.valor);
  }
  return [...map.entries()]
    .map(([clube, total]) => ({ clube, total }))
    .sort((a, b) => b.total - a.total);
}

/* ----------------------------- client ----------------------------- */
export const mockPrisma: any = {
  user: makeDelegate("user", "user"),
  club: makeDelegate("club", "club"),
  player: makeDelegate("player", "plr"),
  transferencia: makeDelegate("transferencia", "trf"),
  report: makeDelegate("report", "rep"),
  chatConversation: makeDelegate("chatConversation", "conv"),
  chatMessage: makeDelegate("chatMessage", "msg"),

  async $queryRaw(query: any) {
    return handleQueryRaw(query);
  },
  async $queryRawUnsafe(query: any) {
    return handleQueryRaw(query);
  },
  async $executeRaw() {
    return 0;
  },
  async $executeRawUnsafe() {
    return 0;
  },
  async $transaction(arg: any) {
    if (typeof arg === "function") return arg(mockPrisma);
    return Promise.all(arg ?? []);
  },
  async $connect() {},
  async $disconnect() {},
};
