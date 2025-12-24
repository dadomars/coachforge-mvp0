"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type AssignedSessionRow = {
  sessionId: string;
  athleteId: string;
  athleteName: string;
  date: string;
  title: string;
  status: string;
};

type AthleteRow = {
  athleteId: string;
  firstName: string;
  lastName: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function normalizeSession(value: unknown): AssignedSessionRow | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const sessionId = asString(rec.sessionId);
  const athleteId = asString(rec.athleteId);
  const athleteName = asString(rec.athleteName);
  const date = asString(rec.date);
  const title = asString(rec.title);
  const status = asString(rec.status);
  if (!sessionId || !athleteId || !date || !title) return null;
  return { sessionId, athleteId, athleteName, date, title, status };
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

function formatDate(value: string) {
  if (!value) return "";
  return value.length >= 10 ? value.slice(0, 10) : value;
}

export default function CoachAssignedSessionsPage() {
  const [list, setList] = useState<AssignedSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [athletesLoading, setAthletesLoading] = useState(true);
  const [athletesError, setAthletesError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [formAthleteId, setFormAthleteId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formError, setFormError] = useState("");
  const [formBusy, setFormBusy] = useState(false);

  async function loadSessions() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/coach/assigned-sessions", { cache: "no-store" });
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
        .filter(Boolean) as AssignedSessionRow[];
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

  async function handleCreateSession(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    if (!formAthleteId) {
      setFormError("Seleziona un atleta.");
      return;
    }
    if (!formDate) {
      setFormError("Seleziona una data.");
      return;
    }
    if (!formTitle.trim()) {
      setFormError("Titolo obbligatorio.");
      return;
    }
    setFormBusy(true);
    try {
      const payload = {
        athleteId: formAthleteId,
        date: formDate,
        title: formTitle.trim(),
      };
      const r = await fetch("/api/coach/assigned-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore creazione sessione (${r.status})`;
        throw new Error(msg);
      }
      setFormAthleteId("");
      setFormDate("");
      setFormTitle("");
      setShowForm(false);
      await loadSessions();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Errore sconosciuto.");
    } finally {
      setFormBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: "36px auto", padding: 16 }}>
      <section style={{ display: "grid", gap: 12 }}>
        <Link href="/coach" style={{ textDecoration: "underline" }}>
          ← Torna al coach
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>Sessioni assegnate</h1>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={loadSessions} disabled={loading}>
            Aggiorna lista
          </button>
          <button type="button" onClick={() => setShowForm(true)}>
            + Nuova sessione
          </button>
        </div>

        {showForm ? (
          <form
            onSubmit={handleCreateSession}
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid #eee",
              display: "grid",
              gap: 10,
              maxWidth: 520,
            }}
          >
            <label style={{ display: "grid", gap: 6 }}>
              <span>Atleta</span>
              <select
                value={formAthleteId}
                onChange={(e) => setFormAthleteId(e.target.value)}
                disabled={athletesLoading}
              >
                <option value="">Seleziona atleta</option>
                {athletes.map((athlete) => (
                  <option key={athlete.athleteId} value={athlete.athleteId}>
                    {athlete.firstName} {athlete.lastName}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Data</span>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Titolo</span>
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </label>

            {athletesLoading ? <p>Caricamento atleti...</p> : null}
            {athletesError ? <p>Errore: {athletesError}</p> : null}
            {formError ? <p>Errore: {formError}</p> : null}

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={formBusy}>
                {formBusy ? "Creo..." : "Crea sessione"}
              </button>
              <button
                type="button"
                disabled={formBusy}
                onClick={() => {
                  setShowForm(false);
                  setFormError("");
                  setFormAthleteId("");
                  setFormDate("");
                  setFormTitle("");
                }}
              >
                Annulla
              </button>
            </div>
          </form>
        ) : null}

        {loading ? (
          <p>Caricamento sessioni...</p>
        ) : error ? (
          <p>Errore: {error}</p>
        ) : list.length === 0 ? (
          <p>Nessuna sessione assegnata</p>
        ) : null}

        {list.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    Atleta
                  </th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    Titolo
                  </th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    Data
                  </th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    Status
                  </th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.sessionId}>
                    <td style={{ padding: "6px 4px" }}>{row.athleteName || "-"}</td>
                    <td style={{ padding: "6px 4px" }}>{row.title}</td>
                    <td style={{ padding: "6px 4px" }}>{formatDate(row.date)}</td>
                    <td style={{ padding: "6px 4px" }}>{row.status}</td>
                    <td style={{ padding: "6px 4px" }}>
                      <Link href={`/coach/assigned-sessions/${row.sessionId}`}>
                        Apri
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  );
}
