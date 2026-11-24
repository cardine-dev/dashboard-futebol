import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authHelper";
import { apiError } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Assinatura de upload — stub do modo demo (sem credenciais Cloudinary).
 * Uploads de imagem não são exercitados na demonstração.
 */
export async function POST(req: Request) {
  // Upload de imagem só acontece nas telas de admin (cadastro de jogador/clube).
  const auth = await requireUser(req, { role: "ADMIN" });
  if (auth instanceof NextResponse) return auth;

  return apiError(501, "Upload de imagem desabilitado no modo demonstração.");
}
