import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isHttps(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) return proto.includes("https");
  return req.nextUrl.protocol === "https:";
}

export async function POST(req: NextRequest) {
  const secure = process.env.NODE_ENV === "production" && isHttps(req);

  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });

  // 1) delete “oficial” (Next 13+/14+/15)
  res.cookies.delete(AUTH_COOKIE);

  // 2) belt-and-suspenders: seta expirado com os mesmos atributos
  res.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    expires: new Date(0),
    maxAge: 0,
  });

  // 3) Se você já teve cookies com path diferente no passado, apaga também:
  // res.cookies.set("app_token", "", { path: "/admin", expires: new Date(0), maxAge: 0, secure, sameSite:"lax", httpOnly:true });
  // res.cookies.set("app_token", "", { path: "/api",   expires: new Date(0), maxAge: 0, secure, sameSite:"lax", httpOnly:true });

  return res;
}
