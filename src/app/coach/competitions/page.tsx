"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import ForbiddenBanner from "@/components/ForbiddenBanner";
import {
  formatStatusItUpper,
  formatTypeUpper,
  titleCaseIt,
} from "@/lib/ui/formatters";

type CompetitionStatus = "PLANNED" | "DONE" | "CANCELLED";
type CompetitionType = "HYROX" | "CROSSFIT" | "RUN" | "ALTRO";

type CompetitionRow = {
  competitionId: string;
  name: string;
  dateStart: string;
  dateEnd?: string | null;
  location?: string | null;
  link?: string | null;
  notesPublic: string;
  notesPrivate: string;
  status: CompetitionStatus;
  type: CompetitionType;
};

type CompetitionForm = {
  name: string;
  type: CompetitionType;
  startDate: string;
  endDate: string;
  status: CompetitionStatus;
  location: string;
  link: string;
  notesPublic: string;
  notesPrivate: string;
};

type AthleteRow = {
  athleteId: string;
  firstName: string;
  lastName: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function toDateInputValue(value: string | null | undefined): string {
  return typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : "";
}

function parseDateInputValue(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeCompetition(value: unknown): CompetitionRow | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;

  const competitionId = asString(rec["competitionId"]);
  const name = asString(rec["name"]);
  const dateStart = asString(rec["dateStart"]);
  const status = asString(rec["status"]);
  const type = asString(rec["type"]);

  if (!competitionId || !name || !dateStart) return null;
  if (!["PLANNED", "DONE", "CANCELLED"].includes(status)) return null;
  if (!["HYROX", "CROSSFIT", "RUN", "ALTRO"].includes(type)) return null;

  return {
    competitionId,
    name,
    dateStart,
    dateEnd: asString(rec["dateEnd"]) || null,
    location: asString(rec["location"]) || null,
    link: asString(rec["link"]) || null,
    notesPublic: asString(rec["notesPublic"]),
    notesPrivate: asString(rec["notesPrivate"]),
    status: status as CompetitionStatus,
    type: type as CompetitionType,
  };
}

function normalizeAthlete(value: unknown): AthleteRow | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const athleteId = asString(rec["athleteId"]);
  const firstName = asString(rec["firstName"]);
  const lastName = asString(rec["lastName"]);
  if (!athleteId || !firstName || !lastName) return null;
  return { athleteId, firstName, lastName };
}

function createEmptyForm(): CompetitionForm {
  return {
    name: "",
    type: "ALTRO",
    startDate: "",
    endDate: "",
    status: "PLANNED",
    location: "",
    link: "",
    notesPublic: "",
    notesPrivate: "",
  };
}

function validateCompetitionForm(form: CompetitionForm): string | null {
  if (!form.name.trim()) return "Nome obbligatorio.";
  if (!form.type) return "Tipo obbligatorio.";
  if (!form.startDate) return "Data inizio obbligatoria.";
  if (!form.status) return "Stato obbligatorio.";

  const start = parseDateInputValue(form.startDate);
  if (!start) return "Data inizio non valida.";
  if (form.endDate) {
    const end = parseDateInputValue(form.endDate);
    if (!end) return "Data fine non valida.";
    if (end < start) return "Data fine deve essere >= data inizio.";
  }

  if (form.link.trim() && !isValidUrl(form.link.trim())) {
    return "Link non valido.";
  }

  return null;
}

export default function CoachCompetitionsPage() {
  const [forbidden, setForbidden] = useState<string | null>(null);
  const bannerText =
    forbidden === "athlete"
      ? "Accesso negato: sei loggato come COACH. L'area Atleta e riservata agli atleti."
      : forbidden === "coach"
      ? "Accesso negato: sei loggato come ATHLETE. L'area Coach e riservata ai coach."
      : null;

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<CompetitionRow[]>([]);
  const [error, setError] = useState<string>("");

  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<CompetitionForm>(createEmptyForm);
  const [newFormErr, setNewFormErr] = useState<string>("");
  const [newFormBusy, setNewFormBusy] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CompetitionForm>(createEmptyForm);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [rowErr, setRowErr] = useState<string>("");

  const [athletesLoading, setAthletesLoading] = useState(false);
  const [athletesErr, setAthletesErr] = useState<string>("");
  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [assignCompetitionId, setAssignCompetitionId] = useState("");
  const [assignIsTarget, setAssignIsTarget] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignErr, setAssignErr] = useState<string>("");
  const [assignResult, setAssignResult] = useState<string>("");
  const [assignFailures, setAssignFailures] = useState<string[]>([]);

  async function loadCompetitions() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/coach/competitions", { cache: "no-store" });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore caricamento gare (${r.status})`;
        throw new Error(msg);
      }
      if (!Array.isArray(data)) throw new Error("Risposta gare non valida.");
      const normalized = data
        .map((row: unknown) => normalizeCompetition(row))
        .filter(Boolean) as CompetitionRow[];
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
    setAthletesErr("");
    try {
      const r = await fetch("/api/coach/athletes", { cache: "no-store" });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore caricamento atleti (${r.status})`;
        throw new Error(msg);
      }
      const items = Array.isArray(data) ? data : data?.items ?? data?.athletes;
      if (!Array.isArray(items)) throw new Error("Risposta atleti non valida.");
      const normalized = items
        .map((row: unknown) => normalizeAthlete(row))
        .filter(Boolean) as AthleteRow[];
      setAthletes(normalized);
      const nextSelected: Record<string, boolean> = {};
      normalized.forEach((a) => {
        nextSelected[a.athleteId] = false;
      });
      setSelectedIds(nextSelected);
    } catch (e) {
      setAthletesErr(e instanceof Error ? e.message : "Errore sconosciuto.");
      setAthletes([]);
    } finally {
      setAthletesLoading(false);
    }
  }

  useEffect(() => {
    loadCompetitions();
    loadAthletes();
    setForbidden(new URLSearchParams(window.location.search).get("forbidden"));
  }, []);

  const competitionsById = useMemo(() => {
    const map: Record<string, CompetitionRow> = {};
    list.forEach((c) => {
      map[c.competitionId] = c;
    });
    return map;
  }, [list]);

  function startEdit(row: CompetitionRow) {
    setEditId(row.competitionId);
    setRowErr("");
    setEditForm({
      name: row.name,
      type: row.type,
      startDate: toDateInputValue(row.dateStart),
      endDate: toDateInputValue(row.dateEnd),
      status: row.status,
      location: row.location ?? "",
      link: row.link ?? "",
      notesPublic: row.notesPublic ?? "",
      notesPrivate: row.notesPrivate ?? "",
    });
  }

  function cancelEdit() {
    setEditId(null);
  }

  async function handleCreateCompetition(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNewFormErr("");
    const validationError = validateCompetitionForm(newForm);
    if (validationError) {
      setNewFormErr(validationError);
      return;
    }
    setNewFormBusy(true);
    try {
      const payload = {
        name: newForm.name.trim(),
        type: newForm.type,
        startDate: newForm.startDate,
        endDate: newForm.endDate || null,
        status: newForm.status,
        location: newForm.location.trim() || null,
        link: newForm.link.trim() || null,
        notesPublic: newForm.notesPublic,
        notesPrivate: newForm.notesPrivate,
      };
      const r = await fetch("/api/coach/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore creazione gara (${r.status})`;
        throw new Error(msg);
      }
      setNewForm(createEmptyForm());
      setShowNewForm(false);
      await loadCompetitions();
    } catch (e) {
      setNewFormErr(e instanceof Error ? e.message : "Errore sconosciuto.");
    } finally {
      setNewFormBusy(false);
    }
  }

  async function handleSaveCompetition(competitionId: string) {
    setRowErr("");
    const validationError = validateCompetitionForm(editForm);
    if (validationError) {
      setRowErr(validationError);
      return;
    }
    setRowBusyId(competitionId);
    try {
      const payload = {
        name: editForm.name.trim(),
        type: editForm.type,
        startDate: editForm.startDate,
        endDate: editForm.endDate || "",
        status: editForm.status,
        location: editForm.location.trim(),
        link: editForm.link.trim(),
        notesPublic: editForm.notesPublic,
        notesPrivate: editForm.notesPrivate,
      };
      const r = await fetch(`/api/coach/competitions/${competitionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore aggiornamento gara (${r.status})`;
        throw new Error(msg);
      }
      setEditId(null);
      await loadCompetitions();
    } catch (e) {
      setRowErr(e instanceof Error ? e.message : "Errore sconosciuto.");
    } finally {
      setRowBusyId(null);
    }
  }

  async function handleDeleteCompetition(competitionId: string) {
    if (!confirm("Eliminare questa gara?")) return;
    setRowErr("");
    setRowBusyId(competitionId);
    try {
      const r = await fetch(`/api/coach/competitions/${competitionId}`, {
        method: "DELETE",
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore eliminazione gara (${r.status})`;
        throw new Error(msg);
      }
      await loadCompetitions();
    } catch (e) {
      setRowErr(e instanceof Error ? e.message : "Errore sconosciuto.");
    } finally {
      setRowBusyId(null);
    }
  }

  function toggleSelectAll(nextValue: boolean) {
    const next: Record<string, boolean> = {};
    athletes.forEach((a) => {
      next[a.athleteId] = nextValue;
    });
    setSelectedIds(next);
  }

  async function handleAssign() {
    setAssignErr("");
    setAssignResult("");
    setAssignFailures([]);

    if (!assignCompetitionId) {
      setAssignErr("Seleziona una gara.");
      return;
    }

    const selected = athletes.filter((a) => selectedIds[a.athleteId]);
    if (selected.length === 0) {
      setAssignErr("Seleziona almeno un atleta.");
      return;
    }

    setAssignBusy(true);
    try {
      const results = await Promise.all(
        selected.map(async (athlete) => {
          const r = await fetch(
            `/api/coach/athletes/${athlete.athleteId}/competition-assignments`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                competitionId: assignCompetitionId,
                isTarget: assignIsTarget,
              }),
            }
          );
          const data = await r.json().catch(() => null);
          if (!r.ok) {
            const msg =
              (data && (data.error || data.message)) ||
              `Errore assegnazione (${r.status})`;
            return { ok: false, name: `${athlete.firstName} ${athlete.lastName}`, msg };
          }
          return { ok: true, name: `${athlete.firstName} ${athlete.lastName}` };
        })
      );

      const failures = results.filter((r) => !r.ok);
      const successCount = results.length - failures.length;
      if (successCount > 0) {
        setAssignResult(`Assegnata a ${successCount} atleti`);
      }
      if (failures.length > 0) {
        setAssignFailures(failures.map((f) => `${f.name}: ${f.msg}`));
      }
    } finally {
      setAssignBusy(false);
    }
  }

  const selectedCompetition = competitionsById[assignCompetitionId];

  return (
    <main style={{ maxWidth: 980, margin: "36px auto", padding: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
  <Link href="/coach" style={{ textDecoration: "underline" }}>
    ← Torna al coach
  </Link>
</div>
      <section>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>Area Coach - Gare</h1>
        <ForbiddenBanner text={bannerText} />
      </section>

      <section
        style={{
          marginTop: 18,
          padding: 14,
          borderRadius: 16,
          border: "1px solid #e5e5e5",
          display: "grid",
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Libreria Gare</h2>

        {loading ? (
          <p>Caricamento gare...</p>
        ) : error ? (
          <p>Errore: {error}</p>
        ) : list.length === 0 ? (
          <p>Nessuna gara in libreria.</p>
        ) : null}

        {rowErr ? <p>Errore: {rowErr}</p> : null}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Nome</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Tipo</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Data</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Stato</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const startLabel = toDateInputValue(c.dateStart);
                const endLabel = toDateInputValue(c.dateEnd);
                const dateLabel = endLabel ? `${startLabel} - ${endLabel}` : startLabel;
                const busy = rowBusyId === c.competitionId;
                return (
                  <tr key={c.competitionId}>
                    <td style={{ padding: "6px 4px" }}>{titleCaseIt(c.name)}</td>
                    <td style={{ padding: "6px 4px" }}>{formatTypeUpper(c.type)}</td>
                    <td style={{ padding: "6px 4px" }}>{dateLabel}</td>
                    <td style={{ padding: "6px 4px" }}>
                      {formatStatusItUpper(c.status)}
                    </td>
                    <td style={{ padding: "6px 4px", display: "flex", gap: 8 }}>
                      {editId === c.competitionId ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleSaveCompetition(c.competitionId)}
                          >
                            Salva
                          </button>
                          <button type="button" disabled={busy} onClick={cancelEdit}>
                            Annulla
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => startEdit(c)} disabled={busy}>
                            Modifica
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCompetition(c.competitionId)}
                            disabled={busy}
                          >
                            Elimina
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {editId ? (
          <div style={{ padding: 12, borderRadius: 12, border: "1px solid #eee" }}>
            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Nome *</span>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Tipo *</span>
                <select
                  value={editForm.type}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, type: e.target.value as CompetitionType }))
                  }
                >
                  <option value="HYROX">HYROX</option>
                  <option value="CROSSFIT">CROSSFIT</option>
                  <option value="RUN">RUN</option>
                  <option value="ALTRO">ALTRO</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Data inizio *</span>
                <input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Data fine</span>
                <input
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Stato *</span>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      status: e.target.value as CompetitionStatus,
                    }))
                  }
                >
                  <option value="PLANNED">PLANNED</option>
                  <option value="DONE">DONE</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Luogo</span>
                <input
                  value={editForm.location}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, location: e.target.value }))
                  }
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Link</span>
                <input
                  type="url"
                  value={editForm.link}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, link: e.target.value }))
                  }
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Note pubbliche</span>
                <textarea
                  value={editForm.notesPublic}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, notesPublic: e.target.value }))
                  }
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Note private</span>
                <textarea
                  value={editForm.notesPrivate}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, notesPrivate: e.target.value }))
                  }
                />
              </label>
            </div>
          </div>
        ) : null}

        <div>
          {!showNewForm ? (
            <button type="button" onClick={() => setShowNewForm(true)}>
              Crea nuova gara
            </button>
          ) : (
            <form onSubmit={handleCreateCompetition} style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Nome *</span>
                <input
                  value={newForm.name}
                  onChange={(e) => setNewForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Tipo *</span>
                <select
                  value={newForm.type}
                  onChange={(e) =>
                    setNewForm((prev) => ({ ...prev, type: e.target.value as CompetitionType }))
                  }
                >
                  <option value="HYROX">HYROX</option>
                  <option value="CROSSFIT">CROSSFIT</option>
                  <option value="RUN">RUN</option>
                  <option value="ALTRO">ALTRO</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Data inizio *</span>
                <input
                  type="date"
                  value={newForm.startDate}
                  onChange={(e) =>
                    setNewForm((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Data fine</span>
                <input
                  type="date"
                  value={newForm.endDate}
                  onChange={(e) =>
                    setNewForm((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Stato *</span>
                <select
                  value={newForm.status}
                  onChange={(e) =>
                    setNewForm((prev) => ({
                      ...prev,
                      status: e.target.value as CompetitionStatus,
                    }))
                  }
                >
                  <option value="PLANNED">PLANNED</option>
                  <option value="DONE">DONE</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Luogo</span>
                <input
                  value={newForm.location}
                  onChange={(e) =>
                    setNewForm((prev) => ({ ...prev, location: e.target.value }))
                  }
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Link</span>
                <input
                  type="url"
                  value={newForm.link}
                  onChange={(e) => setNewForm((prev) => ({ ...prev, link: e.target.value }))}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Note pubbliche</span>
                <textarea
                  value={newForm.notesPublic}
                  onChange={(e) =>
                    setNewForm((prev) => ({ ...prev, notesPublic: e.target.value }))
                  }
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Note private</span>
                <textarea
                  value={newForm.notesPrivate}
                  onChange={(e) =>
                    setNewForm((prev) => ({ ...prev, notesPrivate: e.target.value }))
                  }
                />
              </label>

              {newFormErr ? <p>Errore: {newFormErr}</p> : null}

              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" disabled={newFormBusy}>
                  Crea
                </button>
                <button
                  type="button"
                  disabled={newFormBusy}
                  onClick={() => {
                    setShowNewForm(false);
                    setNewFormErr("");
                    setNewForm(createEmptyForm());
                  }}
                >
                  Annulla
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      <section
        style={{
          marginTop: 18,
          padding: 14,
          borderRadius: 16,
          border: "1px solid #e5e5e5",
          display: "grid",
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Assegnazione massiva</h2>

        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Gara</span>
            <select
              value={assignCompetitionId}
              onChange={(e) => setAssignCompetitionId(e.target.value)}
              disabled={loading}
            >
              <option value="">Seleziona gara</option>
              {list.map((c) => (
                <option key={c.competitionId} value={c.competitionId}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {selectedCompetition ? (
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              Selezionata: {selectedCompetition.name}
            </div>
          ) : null}

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={assignIsTarget}
              onChange={(e) => setAssignIsTarget(e.target.checked)}
            />
            Imposta come obiettivo
          </label>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => toggleSelectAll(true)} disabled={athletesLoading}>
            Seleziona tutti
          </button>
          <button type="button" onClick={() => toggleSelectAll(false)} disabled={athletesLoading}>
            Deseleziona tutti
          </button>
        </div>

        {athletesLoading ? (
          <p>Caricamento atleti...</p>
        ) : athletesErr ? (
          <p>Errore: {athletesErr}</p>
        ) : athletes.length === 0 ? (
          <p>Nessun atleta disponibile.</p>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {athletes.map((a) => (
              <label key={a.athleteId} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={!!selectedIds[a.athleteId]}
                  onChange={(e) =>
                    setSelectedIds((prev) => ({
                      ...prev,
                      [a.athleteId]: e.target.checked,
                    }))
                  }
                />
                {a.firstName} {a.lastName}
              </label>
            ))}
          </div>
        )}

        {assignErr ? <p>Errore: {assignErr}</p> : null}
        {assignResult ? <p>{assignResult}</p> : null}
        {assignFailures.length > 0 ? (
          <div style={{ display: "grid", gap: 4 }}>
            {assignFailures.map((f) => (
              <div key={f} style={{ fontSize: 12 }}>
                {f}
              </div>
            ))}
          </div>
        ) : null}

        <button type="button" onClick={handleAssign} disabled={assignBusy}>
          {assignBusy ? "Assegno..." : "Assegna"}
        </button>
      </section>
    </main>
  );
}
