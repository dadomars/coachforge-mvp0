export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

type RowInput = {
  exerciseId: string;
  sets: string | null;
  reps: string | null;
  rest: string | null;
  percent: number | null;
  kg: number | null;
  notesPublic: string | null;
  notesPrivate: string | null;
};

type BlockInput = {
  name: string;
  rows: RowInput[];
};

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function toOptionalTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseBlocks(input: unknown): { blocks: BlockInput[]; error?: string } {
  if (input == null) return { blocks: [] };
  if (!Array.isArray(input)) return { blocks: [], error: "Blocchi non validi." };

  const blocks: BlockInput[] = [];

  for (let i = 0; i < input.length; i += 1) {
    const raw = input[i];
    if (!raw || typeof raw !== "object") {
      return { blocks: [], error: "Blocco non valido." };
    }
    const rec = raw as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    if (!name) return { blocks: [], error: "Nome blocco obbligatorio." };

    const rowsInput = rec.rows;
    if (rowsInput != null && !Array.isArray(rowsInput)) {
      return { blocks: [], error: "Righe esercizio non valide." };
    }
    const rowsArray = Array.isArray(rowsInput) ? rowsInput : [];
    const rows: RowInput[] = [];
    for (let r = 0; r < rowsArray.length; r += 1) {
      const rawRow = rowsArray[r];
      if (!rawRow || typeof rawRow !== "object") {
        return { blocks: [], error: "Riga esercizio non valida." };
      }
      const rowRec = rawRow as Record<string, unknown>;
      const exerciseId = asString(rowRec.exerciseId).trim();
      if (!exerciseId) return { blocks: [], error: "Seleziona esercizio." };

      const percent = toOptionalNumber(rowRec.percent);
      if (rowRec.percent != null && percent == null) {
        return { blocks: [], error: "Percentuale non valida." };
      }

      const kg = toOptionalNumber(rowRec.kg);
      if (rowRec.kg != null && kg == null) {
        return { blocks: [], error: "Kg non validi." };
      }

      const notesPrivate = toOptionalTrimmedString(rowRec.notesPrivate);
      const hasCoachNote = !!notesPrivate;
      const hasPercent = percent != null;
      const hasKg = kg != null;

      if (!hasCoachNote && !hasPercent && !hasKg) {
        return {
          blocks: [],
          error: "Ogni riga deve avere almeno nota coach, % o kg.",
        };
      }

      rows.push({
        exerciseId,
        sets: toOptionalTrimmedString(rowRec.sets),
        reps: toOptionalTrimmedString(rowRec.reps),
        rest: toOptionalTrimmedString(rowRec.rest),
        percent,
        kg,
        notesPublic: toOptionalTrimmedString(rowRec.notesPublic),
        notesPrivate,
      });
    }

    blocks.push({ name, rows });
  }

  return { blocks };
}

async function ensureExercisesBelongToCoach(exerciseIds: string[], coachId: string) {
  if (exerciseIds.length === 0) return true;
  const uniqueIds = Array.from(new Set(exerciseIds));
  const found = await prisma.exercise.findMany({
    where: { coachId, exerciseId: { in: uniqueIds } },
    select: { exerciseId: true },
  });
  return found.length === uniqueIds.length;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "COACH") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const templates = await prisma.sessionTemplate.findMany({
    where: { coachId: session.uid },
    orderBy: { updatedAt: "desc" },
    select: {
      sessionTemplateId: true,
      title: true,
      notesPublic: true,
      notesPrivate: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "COACH") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return badRequest("Payload non valido.");
  const rec = body as Record<string, unknown>;

  const title = typeof rec.title === "string" ? rec.title.trim() : "";
  if (!title) return badRequest("Titolo obbligatorio.");

  const notesPublic = typeof rec.notesPublic === "string" ? rec.notesPublic : "";
  const notesPrivate = typeof rec.notesPrivate === "string" ? rec.notesPrivate : "";

  const parsedBlocks = parseBlocks(rec.blocks);
  if (parsedBlocks.error) return badRequest(parsedBlocks.error);

  const exerciseIds = parsedBlocks.blocks.flatMap((b) => b.rows.map((r) => r.exerciseId));
  const allOwned = await ensureExercisesBelongToCoach(exerciseIds, session.uid);
  if (!allOwned) return badRequest("Esercizio non valido per questo coach.");

  const created = await prisma.sessionTemplate.create({
    data: {
      coachId: session.uid,
      title,
      notesPublic,
      notesPrivate,
      blocks: {
        create: parsedBlocks.blocks.map((block, blockIndex) => ({
          name: block.name,
          sortOrder: blockIndex + 1,
          rows: {
            create: block.rows.map((row, rowIndex) => ({
              exerciseId: row.exerciseId,
              sortOrder: rowIndex + 1,
              sets: row.sets,
              reps: row.reps,
              rest: row.rest,
              percent: row.percent,
              kg: row.kg,
              notesPublic: row.notesPublic,
              notesPrivate: row.notesPrivate,
            })),
          },
        })),
      },
    },
    select: {
      sessionTemplateId: true,
      title: true,
      notesPublic: true,
      notesPrivate: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
