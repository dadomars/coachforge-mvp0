"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type SessionRow = {
  rowId: string;
  exerciseId: string;
  exerciseName: string;
  sets?: string | null;
  reps?: string | null;
  rest?: string | null;
  percent?: string | null;
  kg?: string | null;
  notesPublic?: string | null;
  notesPrivate?: string | null;
};

type SessionBlock = {
  blockId: string;
  name: string;
  rows: SessionRow[];
};

type SessionDetail = {
  sessionId: string;
  title: string;
  sessionDate: string | null;
  notesPublic: string;
  createdAt: string;
  updatedAt: string;
  blocks: SessionBlock[];
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asNumberString(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value == null) return "";
  return typeof value === "string" ? value : String(value);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return value.length >= 10 ? value.slice(0, 10) : value;
}

function normalizeDetail(value: unknown): SessionDetail | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const sessionId = asString(rec.sessionId);
  const title = asString(rec.title);
  if (!sessionId || !title) return null;

  const blocksInput = Array.isArray(rec.blocks) ? rec.blocks : [];
  const blocks: SessionBlock[] = blocksInput
    .map((block) => {
      if (!block || typeof block !== "object") return null;
      const blockRec = block as Record<string, unknown>;
      const blockId = asString(blockRec.blockId);
      const name = asString(blockRec.name);
      const rowsInput = Array.isArray(blockRec.rows) ? blockRec.rows : [];
      const rows: SessionRow[] = rowsInput
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const rowRec = row as Record<string, unknown>;
          const rowId = asString(rowRec.rowId);
          const exerciseId = asString(rowRec.exerciseId);
          const exerciseRec =
            rowRec.exercise && typeof rowRec.exercise === "object"
              ? (rowRec.exercise as Record<string, unknown>)
              : null;
          const exerciseName = exerciseRec ? asString(exerciseRec.name) : "";
          if (!rowId || !exerciseId) return null;
          return {
            rowId,
            exerciseId,
            exerciseName,
            sets: asString(rowRec.sets) || null,
            reps: asString(rowRec.reps) || null,
            rest: asString(rowRec.rest) || null,
            percent: asNumberString(rowRec.percent) || null,
            kg: asNumberString(rowRec.kg) || null,
            notesPublic: asString(rowRec.notesPublic) || null,
            notesPrivate: asString(rowRec.notesPrivate) || null,
          };
        })
        .filter(Boolean) as SessionRow[];
      if (!blockId) return null;
      return { blockId, name, rows };
    })
    .filter(Boolean) as SessionBlock[];

  return {
    sessionId,
    title,
    sessionDate: asString(rec.sessionDate) || null,
    notesPublic: asString(rec.notesPublic),
    createdAt: asString(rec.createdAt),
    updatedAt: asString(rec.updatedAt),
    blocks,
  };
}

export default function CoachSessionDetailPage() {
  const params = useParams<{ sessionId: string | string[] }>();
  const searchParams = useSearchParams();
  const sessionId = Array.isArray(params.sessionId)
    ? params.sessionId[0]
    : params.sessionId;
  const athleteId = searchParams.get("athleteId")?.trim() || "";

  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      setNotFound(false);
      try {
        const r = await fetch(`/api/coach/sessions/${sessionId}`, {
          cache: "no-store",
        });
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          if (r.status === 404) {
            if (alive) setNotFound(true);
            return;
          }
          const msg =
            (data && (data.error || data.message)) ||
            `Errore caricamento sessione (${r.status})`;
          throw new Error(msg);
        }
        const normalized = normalizeDetail(data);
        if (!normalized) throw new Error("Risposta sessione non valida.");
        if (alive) setDetail(normalized);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Errore sconosciuto.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (sessionId) load();

    return () => {
      alive = false;
    };
  }, [sessionId]);

  return (
    <main style={{ maxWidth: 1100, margin: "36px auto", padding: 16 }}>
      <section style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {athleteId ? (
          <Link
            href={`/coach/athletes/${athleteId}`}
            style={{ textDecoration: "underline" }}
          >
            ← Torna a scheda atleta
          </Link>
        ) : (
          <Link href="/coach/sessions" style={{ textDecoration: "underline" }}>
            ← Torna alle sessioni
          </Link>
        )}
      </section>

      <section style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
        <h1 style={{ margin: 0 }}>Dettaglio sessione</h1>

        {loading ? <p style={{ marginTop: 8 }}>Caricamento...</p> : null}
        {error ? <p style={{ marginTop: 8 }}>Errore: {error}</p> : null}
        {notFound ? (
          <p style={{ marginTop: 8 }}>Sessione non trovata.</p>
        ) : null}

        {!loading && !error && !notFound && detail ? (
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div>
              <strong>Titolo:</strong> {detail.title}
            </div>
            <div>
              <strong>Data:</strong> {formatDate(detail.sessionDate)}
            </div>
            <div>
              <strong>Note pubbliche:</strong> {detail.notesPublic || "-"}
            </div>

            {detail.blocks.length === 0 ? (
              <p style={{ marginTop: 8 }}>Sessione senza blocchi.</p>
            ) : (
              <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
                {detail.blocks.map((block, blockIndex) => (
                  <div
                    key={block.blockId}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #ddd",
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <strong>
                      Blocco {blockIndex + 1}
                      {block.name ? `: ${block.name}` : ""}
                    </strong>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                              Esercizio
                            </th>
                            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                              Set
                            </th>
                            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                              Reps
                            </th>
                            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                              Rest
                            </th>
                            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                              %
                            </th>
                            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                              Kg
                            </th>
                            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                              Note
                            </th>
                            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                              Nota coach
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {block.rows.map((row, rowIndex) => (
                            <tr key={row.rowId}>
                              <td style={{ padding: "6px 4px" }}>
                                {rowIndex + 1}. {row.exerciseName || row.exerciseId}
                              </td>
                              <td style={{ padding: "6px 4px" }}>{row.sets || "-"}</td>
                              <td style={{ padding: "6px 4px" }}>{row.reps || "-"}</td>
                              <td style={{ padding: "6px 4px" }}>{row.rest || "-"}</td>
                              <td style={{ padding: "6px 4px" }}>{row.percent || "-"}</td>
                              <td style={{ padding: "6px 4px" }}>{row.kg || "-"}</td>
                              <td style={{ padding: "6px 4px" }}>{row.notesPublic || "-"}</td>
                              <td style={{ padding: "6px 4px" }}>
                                {row.notesPrivate || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}
