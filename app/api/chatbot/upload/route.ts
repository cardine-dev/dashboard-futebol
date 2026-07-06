import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Upload de anexo do chat — stub do modo demo.
 * Não processa arquivos; apenas confirma o recebimento para a UI.
 */
export async function POST() {
  return NextResponse.json({
    ok: true,
    text: "",
    note: "Upload desabilitado no modo demonstração.",
  });
}
