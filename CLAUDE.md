# CLAUDE.md

Guia para o Claude Code ao trabalhar neste repositório.

## Sobre

Versão de **demonstração** de uma plataforma de scouting de futebol. Roda local, sem banco
e sem segredos — dados sintéticos via mock in-memory.

## Commands

```bash
npm run dev        # Dev server (Next.js)
npm run build      # prisma generate + next build
npm run lint       # ESLint
```

Sem suíte de testes no repo. `npm run lint` (eslint.config.mjs) e `npx tsc --noEmit` devem passar sem erro.

## Modo demo (sem banco)

- Não requer `.env` com segredos. Basta `APP_ENV=demo` (ou ausência de `DATABASE_URL`).
- `lib/prisma.ts` exporta um **mock Prisma** (`lib/demo/mockPrisma.ts`) quando em demo.
- O dataset sintético vive em `lib/demo/dataset.ts` (jogadores/clubes/transferências/usuários).
- JWT usa um segredo de fallback de desenvolvimento — não precisa de `JWT_SECRET`.

Credenciais demo:
- Admin: `admin@demo.com` / `admin@2025`
- Cliente: `cliente@demo.com` / `cliente@2025`

## Arquitetura

**Stack:** Next.js 16 App Router, Prisma (mockado em demo), Tailwind CSS 4, JWT via cookie httpOnly.

### Autenticação
1. `POST /api/auth/login` → valida credenciais e emite JWT como cookie httpOnly (`app_token`)
2. `AuthContext` chama `/api/auth/me` no boot para hidratar o usuário
3. `proxy.ts` protege as rotas exceto `/` e `/login`; tudo em `/admin/*` é ADMIN-only

### Camada de dados
- Singleton em `lib/prisma.ts` (real ou mock conforme o modo)
- Rotas de API usam `export const dynamic = "force-dynamic"`
- Modelos: `User`, `Player`, `Club`, `Transferencia`, `Report`, `ChatConversation`, `ChatMessage`
- Fetch é client-side (`useEffect` + `fetch`)

### Estrutura
- `app/layout.tsx` → `<AuthProvider>` + `<AppShell>`
- Páginas em `app/`; componentes em `components/`; primitivos em `components/Atoms/`
- Widgets do dashboard: definições em `lib/dashboard/widgetDefinitions.ts`, loaders em `lib/dashboard/loaders/`

### Funcionalidades
- **Jogadores** (`/jogadores`): lista + filtros, grid/lista, detalhe, export PDF
- **Dashboard**: KPIs + widgets + mapa geográfico
- **Transferências** (`/admin/transferencias`): importação CSV
- **Scout AI** (`/admin/base-ai`): assistente (respostas mockadas em demo)
- **Formação** (`/formacao`): chance de profissionalização por nível do clube formador e casos parecidos.
  Dados fictícios em `lib/formacao/dados.ts`, cálculo em `lib/formacao/projecao.ts` e `estatistica.ts`,
  API em `app/api/formacao`. Regras: toda chance é condicional ao grupo (profissionais ÷ atletas do grupo)
  e mostra a conta; casos parecidos só comparam mesmo nível e mesmo setor, com limiar de 90% e mínimo de
  20 casos; gols e cartões por 90 são encolhidos para a média do grupo; z-scores cortados em ±3; outros
  clubes sempre anônimos. Não adicionar valor de mercado projetado, valor da carteira nem chance individual
  por modelo sem validação fora da amostra.

### Design system (v2, 2026-11)
- Tokens em `app/globals.css`: canvas claro, chrome escuro "noite" (`--night-*`), 1 acento (`--accent`).
  `gray` e `slate` do Tailwind apontam para a mesma rampa neutra. Classes de componente em
  `@layer components`: `.surface`, `.btn` + `.btn-primary|dark|ghost`, `.seg`, `.input`, `.skeleton`.
- Cores de setor (GOL/DEF/MEI/ATA) em `lib/ui/sector.ts` e `--color-gol|def|mei|ata` (paleta validada
  para daltonismo). Texto nunca usa cor de setor.
- Motion: só por evento (entrada de rota, contagem de KPI, radar, hover/press, gavetas), teto ~300 ms,
  `prefers-reduced-motion` respeitado. Não usar `transition-all`.
- Textos novos de interface ficam em `locales/ui.ts` (pt/en/es juntos).

### White-label (clube que assiste à demo)
`config/clube.ts` lê `NEXT_PUBLIC_CLUBE_NOME|SIGLA|CIDADE|ESCUDO|COR` do `.env.local`. A cor vira o acento
do painel inteiro. Escudos de clubes reais ficam em `public/assets/clubes/` e fora do git (repo público).

### Telas da v2
- `/comparar?ids=a,b,c`: até 3 atletas, radar sobreposto + tabela com o melhor valor marcado.
- `/observacao`: lista de observação (estrela nos cards/ficha), salva no navegador.
- Busca global: Ctrl/⌘+K ou `/`.
- Atributos do radar são GERADOS para a demo (`lib/ui/atributos.ts`, determinístico por id) e a UI avisa isso.

### Dev no Windows
`experimental.turbopackFileSystemCacheForDev: false` no `next.config.js`: com o cache ligado o Turbopack
servia `globals.css` antigo. Se o CSS parecer não atualizar, `rm -rf .next/dev` e reinicie.

### TypeScript
`strict: false`. Alias `@/*` → raiz. Tipos do jogador em `type/jogador.tsx`.
