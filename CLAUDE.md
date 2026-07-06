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

Sem suíte de testes — teste manual.

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

### TypeScript
`strict: false`. Alias `@/*` → raiz. Tipos do jogador em `type/jogador.tsx`.
