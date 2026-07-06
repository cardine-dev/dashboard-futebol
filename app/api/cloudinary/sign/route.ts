import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Assinatura de upload — stub do modo demo (sem credenciais Cloudinary).
 * Uploads de imagem não são exercitados na demonstração.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Upload de imagem desabilitado no modo demonstração." },
    { status: 501 },
  );
}
