"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SessionRow = {
  sessionId: string;
  title: string;
  sessionDate: string | null;
  assignedCount: number;
};

type AthleteRow = {
  athleteId: string;
  firstName: string;
  lastName: string;
};

type AssignmentRow = {
  assignmentId: string;
  athleteId: string;
  athleteName: string;
  assignedAt: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function normalizeSession(value: unknown): SessionRow | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const sessionId = asString(rec.sessionId);
  const title = asString(rec.title);
  const sessionDate = asString(rec.sessionDate);
  const assignedCount = Number(rec.assignedCount ?? 0);
  if (!sessionId || !title) return null;
  return {
    sessionId,
    title,
    sessionDate: sessionDate || null,
    assignedCount: Number.isFinite(assignedCount) ? assignedCount : 0,
  };
}

function normalizeAthlete(value: unknown): AthleteRow | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const athleteId = asString(rec.athleteId);
  const firstName = asString(rec.firstName);
  const lastName = asString(rec.lastName);
  if (!athleteId || !firstName || !lastName) return null;
  return { athleteId, firstName, lastName };
}

function normalizeAssignment(value: unknown): AssignmentRow | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const assignmentId = asString(rec.assignmentId);
  const athleteId = asString(rec.athleteId);
  const athleteName = asString(rec.athleteName);
  const assignedAt = asString(rec.assignedAt);
  if (!assignmentId || !athleteId) return null;
  return { assignmentId, athleteId, athleteName, assignedAt };
}

function formatDate(value: string | null) {
  if (!value) return "";
  return value.length >= 10 ? value.slice(0, 10) : value;
}

function sortAthletes(a: AthleteRow, b: AthleteRow) {
  const aName = `${a.firstName} ${a.lastName}`.toLowerCase();
  const bName = `${b.firstName} ${b.lastName}`.toLowerCase();
  return aName.localeCompare(bName);
}

export default function CoachAssignedSessionsPage() {
  const [list, setList] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [athletesLoading, setAthletesLoading] = useState(true);
  const [athletesError, setAthletesError] = useState("");

  const [assignSessionId, setAssignSessionId] = useState<string | null>(null);
  const [assignDate, setAssignDate] = useState("");
  const [assignSearch, setAssignSearch] = useState("");
  const [assignSelected, setAssignSelected] = useState<Record<string, boolean>>({});
  const [assignedList, setAssignedList] = useState<AssignmentRow[]>([]);
  const [assignedLoading, setAssignedLoading] = useState(false);
  const [assignedError, setAssignedError] = useState("");
  const [assignBusy, setAssignBusy] = useState(false);

  async function loadSessions() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/coach/sessions", { cache: "no-store" });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore caricamento sessioni (${r.status})`;
        throw new Error(msg);
      }
      if (!Array.isArray(data)) throw new Error("Risposta sessioni non valida.");
      const normalized = data
        .map((row: unknown) => normalizeSession(row))
        .filter(Boolean) as SessionRow[];
      setList(normalized);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore sconosciuto.");
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadAthletes() {
    setAthletesLoading(true);
    setAthletesError("");
    try {
      const r = await fetch("/api/coach/athletes", { cache: "no-store" });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore caricamento atleti (${r.status})`;
        throw new Error(msg);
      }
      const arr = Array.isArray(data) ? data : (data as { items?: unknown }).items;
      if (!Array.isArray(arr)) throw new Error("Risposta atleti non valida.");
      const normalized = arr
        .map((row: unknown) => normalizeAthlete(row))
        .filter(Boolean) as AthleteRow[];
      setAthletes(normalized);
    } catch (e) {
      setAthletesError(e instanceof Error ? e.message : "Errore sconosciuto.");
      setAthletes([]);
    } finally {
      setAthletesLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
    loadAthletes();
  }, []);

  async function loadAssignments(sessionId: string) {
    setAssignedLoading(true);
    setAssignedError("");
    try {
      const r = await fetch(`/api/coach/sessions/${sessionId}/assignments`, {
        cache: "no-store",
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore caricamento assegnazioni (${r.status})`;
        throw new Error(msg);
      }
      if (!Array.isArray(data)) throw new Error("Risposta assegnazioni non valida.");
      const normalized = data
        .map((row: unknown) => normalizeAssignment(row))
        .filter(Boolean) as AssignmentRow[];
      setAssignedList(normalized);
    } catch (e) {
      setAssignedError(e instanceof Error ? e.message : "Errore sconosciuto.");
      setAssignedList([]);
    } finally {
      setAssignedLoading(false);
    }
  }

  function openAssignPanel(sessionId: string, sessionDate: string | null) {
    setAssignSessionId(sessionId);
    setAssignDate(formatDate(sessionDate));
    setAssignSearch("");
    setAssignSelected({});
    loadAssignments(sessionId);
  }

  async function handleAssignAthletes() {
    if (!assignSessionId) return;
    setAssignedError("");
    if (!assignDate) {
      setAssignedError("Seleziona una data sessione.");
      return;
    }
    const selectedIds = Object.keys(assignSelected).filter((id) => assignSelected[id]);
    if (selectedIds.length === 0) {
      setAssignedError("Seleziona almeno un atleta.");
      return;
    }
    setAssignBusy(true);
    try {
      const dateUpdate = await fetch(`/api/coach/sessions/${assignSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionDate: assignDate }),
      });
      const dateData = await dateUpdate.json().catch(() => null);
      if (!dateUpdate.ok) {
        const msg =
          (dateData && (dateData.error || dateData.message)) ||
          `Errore aggiornamento data (${dateUpdate.status})`;
        throw new Error(msg);
      }

      const r = await fetch(`/api/coach/sessions/${assignSessionId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteIds: selectedIds }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore assegnazione (${r.status})`;
        throw new Error(msg);
      }
      setAssignSelected({});
      await loadAssignments(assignSessionId);
      await loadSessions();
    } catch (e) {
      setAssignedError(e instanceof Error ? e.message : "Errore sconosciuto.");
    } finally {
      setAssignBusy(false);
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    if (!assignSessionId) return;
    setAssignedError("");
    setAssignBusy(true);
    try {
      const r = await fetch(`/api/coach/sessions/${assignSessionId}/assignments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore rimozione (${r.status})`;
        throw new Error(msg);
      }
      await loadAssignments(assignSessionId);
      await loadSessions();
    } catch (e) {
      setAssignedError(e instanceof Error ? e.message : "Errore sconosciuto.");
    } finally {
      setAssignBusy(false);
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!confirm("Eliminare questa sessione?")) return;
    setError("");
    try {
      const r = await fetch(`/api/coach/sessions/${sessionId}`, { method: "DELETE" });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore eliminazione sessione (${r.status})`;
        throw new Error(msg);
      }
      await loadSessions();
      if (assignSessionId === sessionId) {
        setAssignSessionId(null);
        setAssignedList([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore sconosciuto.");
    }
  }

  const filteredAthletes = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    const sorted = [...athletes].sort(sortAthletes);
    if (!q) return sorted;
    return sorted.filter((athlete) =>
      `${athlete.firstName} ${athlete.lastName}`.toLowerCase().includes(q)
    );
  }, [assignSearch, athletes]);

  return (
    <main style={{ maxWidth: 980, margin: "36px auto", padding: 16 }}>
      <section style={{ display: "grid", gap: 12 }}>
        <Link href="/coach" style={{ textDecoration: "underline" }}>
          ← Torna al coach
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>Sessioni</h1>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={loadSessions} disabled={loading}>
            Aggiorna lista
          </button>
          <Link
            href="/coach/assigned-sessions/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #ccc",
              background: "#fff",
              textDecoration: "none",
              color: "inherit",
              fontWeight: 600,
            }}
          >
            Crea sessione
          </Link>
        </div>

        {loading ? (
          <p>Caricamento sessioni...</p>
        ) : error ? (
          <p>Errore: {error}</p>
        ) : list.length === 0 ? (
          <p>Nessuna sessione</p>
        ) : null}

        {athletesLoading ? <p>Caricamento atleti...</p> : null}
        {athletesError ? <p>Errore: {athletesError}</p> : null}

        {list.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    Titolo
                  </th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    Data
                  </th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    Atleti
                  </th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.sessionId}>
                    <td style={{ padding: "6px 4px" }}>{row.title}</td>
                    <td style={{ padding: "6px 4px" }}>{formatDate(row.sessionDate)}</td>
                    <td style={{ padding: "6px 4px" }}>{row.assignedCount}</td>
                    <td style={{ padding: "6px 4px", display: "flex", gap: 8 }}>
                      <Link
                        href={`/coach/assigned-sessions/${row.sessionId}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid #ccc",
                          background: "#fff",
                          textDecoration: "none",
                          color: "inherit",
                          fontWeight: 600,
                        }}
                      >
                        Apri
                      </Link>
                      <button
                        type="button"
                        onClick={() => openAssignPanel(row.sessionId, row.sessionDate)}
                      >
                        Assegna
                      </button>
                      <button type="button" onClick={() => handleDeleteSession(row.sessionId)}>
                        Elimina
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {assignSessionId ? (
          <section
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 12,
              border: "1px solid #eee",
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <strong>Assegna sessione</strong>
              <button
                type="button"
                onClick={() => {
                  setAssignSessionId(null);
                  setAssignDate("");
                  setAssignedError("");
                }}
              >
                Chiudi
              </button>
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Data sessione</span>
              <input
                type="date"
                value={assignDate}
                onChange={(e) => setAssignDate(e.target.value)}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Cerca atleta</span>
              <input
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                placeholder="Cerca atleta"
              />
            </label>

            <div style={{ display: "grid", gap: 6, maxHeight: 220, overflowY: "auto" }}>
              {filteredAthletes.map((athlete) => (
                <label
                  key={athlete.athleteId}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <input
                    type="checkbox"
                    checked={!!assignSelected[athlete.athleteId]}
                    onChange={(e) =>
                      setAssignSelected((prev) => ({
                        ...prev,
                        [athlete.athleteId]: e.target.checked,
                      }))
                    }
                  />
                  {athlete.firstName} {athlete.lastName}
                </label>
              ))}
            </div>

            <button type="button" onClick={handleAssignAthletes} disabled={assignBusy}>
              {assignBusy ? "Assegno..." : "Conferma assegnazione"}
            </button>

            {assignedLoading ? <p>Caricamento assegnazioni...</p> : null}
            {assignedError ? <p>Errore: {assignedError}</p> : null}

            <div style={{ display: "grid", gap: 6 }}>
              <strong>Atleti assegnati</strong>
              {assignedList.length === 0 ? (
                <p>Nessun atleta assegnato.</p>
              ) : (
                assignedList.map((row) => (
                  <div
                    key={row.assignmentId}
                    style={{ display: "flex", justifyContent: "space-between", gap: 8 }}
                  >
                    <span>{row.athleteName || row.athleteId}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignment(row.assignmentId)}
                      disabled={assignBusy}
                    >
                      Rimuovi
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
