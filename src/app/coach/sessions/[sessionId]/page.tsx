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

type AssignmentResult = {
  assignmentId: string;
  status: "TODO" | "DONE" | "SKIPPED";
  performedAt: string | null;
  durationMin: number | null;
  rpe: number | null;
  note: string | null;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asNumberString(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value == null) return "";
  return typeof value === "string" ? value : String(value);
}

function formatDateIT(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function decodeReturnTo(value: string | null): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
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
  const returnToParam = searchParams.get("returnTo");
  const returnTo = decodeReturnTo(returnToParam);
  const [assignment, setAssignment] = useState<AssignmentResult | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [resultsStatus, setResultsStatus] =
    useState<AssignmentResult["status"]>("TODO");
  const [resultsDuration, setResultsDuration] = useState("");
  const [resultsRpe, setResultsRpe] = useState("");
  const [resultsPerformedAt, setResultsPerformedAt] = useState("");
  const [resultsNote, setResultsNote] = useState("");

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

  useEffect(() => {
    let alive = true;

    async function loadAssignment() {
      if (!athleteId || !sessionId) return;
      setAssignmentLoading(true);
      setAssignmentError("");
      try {
        const r = await fetch(
          `/api/coach/athletes/${athleteId}/session-assignments`,
          { cache: "no-store" }
        );
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          const msg =
            (data && (data.error || data.message)) ||
            `Errore caricamento risultati (${r.status})`;
          throw new Error(msg);
        }
        if (!Array.isArray(data)) {
          throw new Error("Risposta risultati non valida.");
        }
        const match = data.find(
          (item: { sessionId?: string }) => item?.sessionId === sessionId
        );
        if (!match) {
          if (alive) setAssignment(null);
          return;
        }
        const normalized: AssignmentResult = {
          assignmentId: asString(match.assignmentId),
          status: ["TODO", "DONE", "SKIPPED"].includes(match.status)
            ? match.status
            : "TODO",
          performedAt: asString(match.performedAt) || null,
          durationMin:
            typeof match.durationMin === "number"
              ? match.durationMin
              : match.durationMin == null
              ? null
              : Number(match.durationMin),
          rpe:
            typeof match.rpe === "number"
              ? match.rpe
              : match.rpe == null
              ? null
              : Number(match.rpe),
          note: typeof match.note === "string" ? match.note : null,
        };
        if (alive) {
          setAssignment(normalized);
          setResultsStatus(normalized.status);
          setResultsPerformedAt(
            normalized.performedAt ? normalized.performedAt.slice(0, 10) : ""
          );
          setResultsDuration(
            normalized.durationMin != null ? String(normalized.durationMin) : ""
          );
          setResultsRpe(normalized.rpe != null ? String(normalized.rpe) : "");
          setResultsNote(normalized.note ?? "");
        }
      } catch (e) {
        if (alive) {
          setAssignmentError(
            e instanceof Error ? e.message : "Errore sconosciuto."
          );
        }
      } finally {
        if (alive) setAssignmentLoading(false);
      }
    }

    loadAssignment();

    return () => {
      alive = false;
    };
  }, [athleteId, sessionId]);

  async function handleSaveResults() {
    if (!assignment) return;
    setSaveMessage("");
    try {
      const payload = {
        status: resultsStatus,
        performedAt: resultsPerformedAt ? resultsPerformedAt : null,
        durationMin: resultsDuration ? Number(resultsDuration) : null,
        rpe: resultsRpe ? Number(resultsRpe) : null,
        note: resultsNote,
      };
      const r = await fetch(
        `/api/coach/session-assignments/${assignment.assignmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore salvataggio (${r.status})`;
        throw new Error(msg);
      }
      setAssignment((prev) =>
        prev
          ? {
              ...prev,
              status: data.status ?? prev.status,
              performedAt: data.performedAt ?? prev.performedAt,
              durationMin: data.durationMin ?? prev.durationMin,
              rpe: data.rpe ?? prev.rpe,
              note: data.note ?? prev.note,
            }
          : prev
      );
      setSaveMessage("Risultati salvati.");
    } catch (e) {
      setSaveMessage(e instanceof Error ? e.message : "Errore sconosciuto.");
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: "36px auto", padding: 16 }}>
      <section style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link
          href={returnTo || "/coach/sessions"}
          style={{ textDecoration: "underline" }}
        >
          Torna indietro
        </Link>
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
              <strong>Data:</strong> {formatDateIT(detail.sessionDate)}
            </div>
            <div>
              <strong>Note:</strong> {detail.notesPublic || "-"}
            </div>

            {detail.blocks.length === 0 ? (
              <p style={{ marginTop: 8 }}>
                Sessione senza blocchi (creata prima dei fix).
              </p>
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

            {athleteId ? (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  display: "grid",
                  gap: 10,
                }}
              >
                <strong>Risultati</strong>
                {assignmentLoading ? <p>Caricamento risultati...</p> : null}
                {assignmentError ? <p>Errore: {assignmentError}</p> : null}
                {!assignmentLoading && !assignmentError && !assignment ? (
                  <p>Risultati non disponibili per questo atleta.</p>
                ) : null}
                {assignment ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={{ display: "grid", gap: 4 }}>
                      <span>Status</span>
                      <select
                        value={resultsStatus}
                        onChange={(e) =>
                          setResultsStatus(
                            e.target.value as AssignmentResult["status"]
                          )
                        }
                      >
                        <option value="TODO">TODO</option>
                        <option value="DONE">DONE</option>
                        <option value="SKIPPED">SKIPPED</option>
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 4 }}>
                      <span>Durata (min)</span>
                      <input
                        type="number"
                        min={1}
                        value={resultsDuration}
                        onChange={(e) => setResultsDuration(e.target.value)}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 4 }}>
                      <span>RPE (1-10)</span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={resultsRpe}
                        onChange={(e) => setResultsRpe(e.target.value)}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 4 }}>
                      <span>Data svolgimento</span>
                      <input
                        type="date"
                        value={resultsPerformedAt}
                        onChange={(e) => setResultsPerformedAt(e.target.value)}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 4 }}>
                      <span>Nota</span>
                      <textarea
                        value={resultsNote}
                        onChange={(e) => setResultsNote(e.target.value)}
                      />
                    </label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button type="button" onClick={handleSaveResults}>
                        Salva risultati
                      </button>
                      {saveMessage ? <span>{saveMessage}</span> : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
