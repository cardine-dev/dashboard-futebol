import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireUser } from "@/lib/authHelper";
import { apiError, handleRouteError } from "@/lib/apiError";

export const dynamic = "force-dynamic";

function slugify(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function upper(v: string) {
  return v.trim().toUpperCase();
}

const CreateClubSchema = z
  .object({
    nome: z.string().min(2).optional(),
    name: z.string().min(2).optional(),
    logoUrl: z.string().url().optional().or(z.literal("")),

    countryCode: z.string().optional().nullable(),
    countryName: z.string().optional().nullable(),
    stateCode: z.string().optional().nullable(),
    stateName: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    continentCode: z.string().optional().nullable(),
  })
  .refine((v) => (v.nome ?? v.name)?.trim()?.length, {
    message: "Nome é obrigatório",
    path: ["nome"],
  })
  .refine(
    (v) => {
      // localização opcional no create (pra não quebrar fluxo),
      // mas se mandar countryCode, tem que mandar direito.
      const cc = v.countryCode ? upper(v.countryCode) : null;
      if (!cc) return true;
      if (!v.countryName?.trim()) return false;
      if (cc === "BR") {
        return Boolean(v.stateCode?.trim()) && Boolean(v.stateName?.trim());
      }
      return true;
    },
    { message: "Localização inválida: BR exige stateCode/stateName e countryName.", path: ["countryCode"] }
  );

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const clubs = await prisma.club.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, slug: true, logoUrl: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json(clubs);
  } catch (err) {
    return handleRouteError(err, "GET /api/clubs", "Erro ao buscar clubes");
  }
}

export async function POST(req: Request) {
  const auth = await requireUser(req, { role: "ADMIN" });
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json().catch(() => null);
    const result = CreateClubSchema.safeParse(body);
    if (!result.success) {
      return apiError(400, result.error.issues[0]?.message ?? "Dados inválidos");
    }
    const parsed = result.data;

    const nome = (parsed.nome ?? parsed.name)!.trim();
    const baseSlug = slugify(nome);

    if (!baseSlug) return apiError(400, "Nome inválido.");

    let slug = baseSlug;
    let i = 1;
    while (await prisma.club.findUnique({ where: { slug } })) {
      i += 1;
      slug = `${baseSlug}-${i}`;
    }

    const cc = parsed.countryCode?.trim() ? upper(parsed.countryCode) : null;

    const club = await prisma.club.create({
      data: {
        nome,
        slug,
        logoUrl: parsed.logoUrl?.trim() ? parsed.logoUrl.trim() : null,

        countryCode: cc,
        countryName: parsed.countryName?.trim() ? parsed.countryName.trim() : null,
        city: parsed.city?.trim() ? parsed.city.trim() : null,
        continentCode: parsed.continentCode?.trim() ? upper(parsed.continentCode) : null,

        stateCode: cc === "BR" && parsed.stateCode?.trim() ? upper(parsed.stateCode) : null,
        stateName: cc === "BR" && parsed.stateName?.trim() ? parsed.stateName.trim() : null,
      },
      select: { id: true, nome: true, slug: true, logoUrl: true },
    });

    return NextResponse.json(club, { status: 201 });
  } catch (err) {
    return handleRouteError(err, "POST /api/clubs", "Erro ao criar clube");
  }
}
