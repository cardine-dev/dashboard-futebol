import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authHelper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Upload de anexo do chat — stub do modo demo.
 * Não processa arquivos; apenas confirma o recebimento para a UI.
 */
export async function POST(req: Request) {
  const auth = await requireUser(req, { role: "ADMIN" });
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({
    ok: true,
    text: "",
    note: "Upload desabilitado no modo demonstração.",
  });
}
