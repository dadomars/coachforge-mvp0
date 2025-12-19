import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

type Role = "COACH" | "ATHLETE";

function getRole(token: unknown): Role | null {
  if (typeof token !== "object" || token === null) return null;
  const role = (token as { role?: unknown }).role;
  if (role === "COACH" || role === "ATHLETE") return role;
  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  const token = await getToken({ req, secret });
  const role = getRole(token);

  // --- COACH AREA ---
  if (pathname.startsWith("/coach")) {
    // Non loggato => vai al login coach
    if (!role) {
      const url = req.nextUrl.clone();
      url.pathname = "/coach-login";
      return NextResponse.redirect(url);
    }

    // Loggato ma ruolo sbagliato => torna alla sua area
    if (role !== "COACH") {
      const url = req.nextUrl.clone();
      url.pathname = "/athlete";
      url.searchParams.set("forbidden", "coach");
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // --- ATHLETE AREA ---
  if (pathname.startsWith("/athlete")) {
    // Non loggato => vai al login atleta
    if (!role) {
      const url = req.nextUrl.clone();
      url.pathname = "/athlete-login";
      return NextResponse.redirect(url);
    }

    // Loggato ma ruolo sbagliato => torna alla sua area
    if (role !== "ATHLETE") {
      const url = req.nextUrl.clone();
      url.pathname = "/coach";
      url.searchParams.set("forbidden", "athlete");
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/coach/:path*", "/athlete/:path*"],
};