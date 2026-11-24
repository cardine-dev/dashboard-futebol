import { SESSION_TTL_SECONDS } from "@/lib/jwt";

/** Cookie do sandbox da demo (sem dependências de Node: usado também pelo proxy). */
export const SANDBOX_COOKIE = "demo_sbx";

export const newSandboxId = () =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(12))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

export const sandboxCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
});

/** Mesma regra de lib/prisma.ts, sem importar o Prisma. */
export const isDemoEnv = () =>
  process.env.APP_ENV === "demo" ||
  (!(process.env.DATABASE_URL ?? "").trim() && process.env.NODE_ENV !== "production");
