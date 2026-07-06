import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: ".env.local", override: true });
dotenv.config({ path: ".env", override: true });

// Modo demo: sem DATABASE_URL usamos uma URL dummy só para o `prisma generate`
// (que não conecta no banco). Em runtime a app usa o mock in-memory.
const url =
  (process.env.DATABASE_URL ?? "").trim() ||
  "postgresql://demo:demo@localhost:5432/demo";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url },
  migrations: { seed: "tsx prisma/seed.ts" },
});
