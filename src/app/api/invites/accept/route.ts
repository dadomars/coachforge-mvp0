import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db/prisma";;

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const tokenRaw = typeof body?.token === "string" ? body.token.trim() : "";
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!tokenRaw || !email || !password) {
      return NextResponse.json(
        { error: "token, email, password sono obbligatori" },
        { status: 400 }
      );
    }

    const pepper = process.env.INVITE_TOKEN_PEPPER;
    if (!pepper) {
      return NextResponse.json(
        { error: "Missing INVITE_TOKEN_PEPPER" },
        { status: 500 }
      );
    }

    const tokenHash = sha256Hex(tokenRaw + pepper);

    const invite = await prisma.athleteInvite.findUnique({
      where: { tokenHash },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    if (invite.usedAt) {
      return NextResponse.json({ error: "Token already used" }, { status: 400 });
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    // hash password con bcrypt (OK)
    const passwordHash = await bcrypt.hash(password, 10);

    // transazione: upsert auth + brucia token
    try {
      await prisma.$transaction([
        prisma.athleteAuth.upsert({
          where: { athleteId: invite.athleteId },
          update: {
            loginIdentifier: email,
            passwordHash,
            activatedAt: new Date(),
          },
          create: {
            athleteId: invite.athleteId,
            loginIdentifier: email,
            passwordHash,
            activatedAt: new Date(),
          },
        }),
        prisma.athleteInvite.update({
          where: { tokenHash },
          data: { usedAt: new Date() },
        }),
      ]);
    } catch (e: unknown) {
      // Email UNIQUE già usata (Prisma P2002)
      if (typeof e === "object" && e !== null && "code" in e) {
        const code = (e as { code?: string }).code;
        if (code === "P2002") {
          return NextResponse.json({ error: "Email già in uso" }, { status: 400 });
        }
      }
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}