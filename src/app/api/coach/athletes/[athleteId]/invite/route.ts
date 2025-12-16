export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/lib/auth/authOptions";
import crypto from "crypto";

import { prisma } from "@/lib/db/prisma";;

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  const { athleteId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || session.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pepper = process.env.INVITE_TOKEN_PEPPER;
  if (!pepper) {
    return NextResponse.json(
      { error: "Missing INVITE_TOKEN_PEPPER in env" },
      { status: 500 }
    );
  }

  const authUrl = process.env.AUTH_URL;
  if (!authUrl) {
    return NextResponse.json({ error: "Missing AUTH_URL in env" }, { status: 500 });
  }

  // Guard: atleta deve appartenere al coach loggato
  const athlete = await prisma.athlete.findFirst({
    where: { athleteId, coachId: session.uid! },
    select: { athleteId: true },
  });

  if (!athlete) {
    return NextResponse.json({ error: "Athlete not found" }, { status: 404 });
  }

  // ✅ GUARDIA: se l'atleta è già attivo, non generare inviti
const auth = await prisma.athleteAuth.findUnique({
  where: { athleteId },
  select: { activatedAt: true },
});

if (auth?.activatedAt) {
  return NextResponse.json(
    { error: "Atleta già attivo: invito non necessario." },
    { status: 409 }
  );
}

  // ✅ FIX: invalida TUTTI gli inviti non usati (senza filtri su expiresAt)
  await prisma.athleteInvite.updateMany({
    where: { athleteId, usedAt: null },
    data: { expiresAt: new Date() },
  });

  // Genera token RAW (solo per il link)
  const tokenRaw = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(tokenRaw + pepper);

  // Scadenza: 24h
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.athleteInvite.create({
    data: {
      athleteId,
      tokenHash,
      expiresAt,
      usedAt: null,
    },
  });

  const inviteUrl = `${authUrl}/invite/${tokenRaw}`;

  return NextResponse.json({
    invite_url: inviteUrl,
    expires_at: expiresAt.toISOString(),
  });
}