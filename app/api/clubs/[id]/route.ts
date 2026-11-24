import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireUser } from "@/lib/authHelper";
import { apiError, handleRouteError } from "@/lib/apiError";

export const dynamic = "force-dynamic";

function upper(v: string) {
  return v.trim().toUpperCase();
}

const BaseClubSchema = z.object({
  // compat: aceita nome ou name
  nome: z.string().min(2).optional(),
  name: z.string().min(2).optional(),

  logoUrl: z.string().url().optional().or(z.literal("")),

  countryCode: z.string().optional().nullable(),
  countryName: z.string().optional().nullable(),
  stateCode: z.string().optional().nullable(),
  stateName: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  continentCode: z.string().optional().nullable(),
});

const UpdateClubSchema = BaseClubSchema
  .refine(
    (v) => {
      const cc = v.countryCode ? upper(v.countryCode) : null;
      if (!cc) return true; // update parcial sem mexer nisso
      if (!v.countryName?.trim()) return false;
      if (cc === "BR") {
        return Boolean(v.stateCode?.trim()) && Boolean(v.stateName?.trim());
      }
      return true;
    },
    { message: "Localização inválida: BR exige stateCode/stateName e countryName.", path: ["countryCode"] }
  );

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const club = await prisma.club.findUnique({ where: { id } });
    if (!club) return apiError(404, "Clube não encontrado");
    return NextResponse.json(club);
  } catch (err) {
    return handleRouteError(err, "GET /api/clubs/[id]", "Erro ao buscar clube");
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req, { role: "ADMIN" });
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const result = UpdateClubSchema.safeParse(body);
    if (!result.success) {
      return apiError(400, result.error.issues[0]?.message ?? "Dados inválidos");
    }
    const parsed = result.data;

    const nome = (parsed.nome ?? parsed.name)?.trim();

    const hasCountry = parsed.countryCode !== undefined;
    const cc = hasCountry ? (parsed.countryCode ? upper(parsed.countryCode) : null) : undefined;

    const data: any = {};

    if (nome) data.nome = nome;

    if (parsed.logoUrl !== undefined) {
      const v = parsed.logoUrl.trim();
      data.logoUrl = v || null;
    }

    // localização (se veio no payload)
    if (hasCountry) {
      data.countryCode = cc;
      data.countryName = parsed.countryName?.trim() ? parsed.countryName.trim() : null;
      data.city = parsed.city?.trim() ? parsed.city.trim() : null;
      data.continentCode = parsed.continentCode?.trim() ? upper(parsed.continentCode) : null;

      if (cc === "BR") {
        data.stateCode = parsed.stateCode?.trim() ? upper(parsed.stateCode) : null;
        data.stateName = parsed.stateName?.trim() ? parsed.stateName.trim() : null;
      } else {
        // fora do BR, zera pra evitar lixo
        data.stateCode = null;
        data.stateName = null;
      }
    }

    const club = await prisma.club.update({
      where: { id },
      data,
    });

    return NextResponse.json(club);
  } catch (err) {
    return handleRouteError(err, "PATCH /api/clubs/[id]", "Erro ao atualizar clube");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req, { role: "ADMIN" });
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    await prisma.club.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err, "DELETE /api/clubs/[id]", "Erro ao excluir clube");
  }
}
