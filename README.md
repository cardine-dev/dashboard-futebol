# Football Scouting Dashboard

Plataforma de scouting e análise de jogadores e transferências — case de **inovação no esporte**.
Painel completo com autenticação, controle de acesso por role, dashboard de widgets
customizáveis, mapa geográfico, ranking de mercado e assistente de IA para análise de elenco.

> **Versão de demonstração.** Roda 100% local, **sem banco de dados e sem segredos**:
> os dados são sintéticos (jogadores/clubes/transferências fictícios) servidos por uma
> camada mock em memória. Ideal para apresentar a ferramenta sem expor dados reais.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS 4**
- **Prisma** (schema mantido; em modo demo o client é substituído por um mock in-memory)
- **recharts** + **react-simple-maps** (gráficos e mapa)
- Autenticação **JWT** via cookie httpOnly
- i18n (pt / en / es)

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:3000`. Nenhuma configuração de banco é necessária no modo demo.

### Credenciais de demonstração

- **Admin**: `admin@demo.com` / `admin@2025`
- **Cliente**: `cliente@demo.com` / `cliente@2025`

O admin tem acesso às telas de administração (jogadores, clubes, transferências, usuários
e Scout AI); o cliente vê apenas dashboard, jogadores e relatórios.

## Estrutura

```
dashboard-futebol/
├─ app/            # rotas (App Router) + API routes
├─ components/     # componentes de UI
├─ lib/
│  ├─ dashboard/   # loaders e definições de widgets
│  └─ demo/        # dataset sintético + mock Prisma (modo demo)
├─ locales/        # i18n (pt/en/es)
├─ prisma/         # schema (referência)
└─ public/         # assets e mapas
```

## Funcionalidades

- **Dashboard**: KPIs + widgets customizáveis (distribuição de idade, posição, valor de
  mercado, scatter idade×valor, ranking de agências, pipeline de direitos) e mapa geográfico.
- **Jogadores**: lista com filtros avançados, visão grid/lista, detalhe do atleta e export PDF.
- **Clubes / Transferências**: gestão e importação.
- **Relatórios**: análises geradas via Scout AI.
- **Scout AI**: assistente de análise de elenco e mercado (modo demo: respostas simuladas).
- **Formação** (`/formacao`): chance de virar profissional por nível do clube formador
  (5 níveis), sempre condicional ao grupo e com a conta à mostra, intervalo de 90% e teste
  fora da amostra; comparação com clubes do mesmo nível, com os outros clubes anônimos;
  e casos parecidos anônimos para cada atleta da base, como referência e não como previsão.
  Projeções financeiras ficam de fora até poderem ser validadas.

## Modo demo — como funciona

`lib/prisma.ts` detecta o modo demo (`APP_ENV=demo` ou ausência de `DATABASE_URL`) e
exporta um **mock Prisma** (`lib/demo/mockPrisma.ts`) que responde às queries a partir de
um **dataset sintético** (`lib/demo/dataset.ts`). Assim toda a aplicação roda sem
infraestrutura externa, preservando o comportamento real da UI.
