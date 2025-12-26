"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import ForbiddenBanner from "@/components/ForbiddenBanner";
import { formatTypeUpper, titleCaseIt } from "@/lib/ui/formatters";

const VALID_CATEGORIES = ["WEIGHTLIFTING", "GYM", "METCON", "RUN", "ERG", "ALTRO"] as const;
type ExerciseCategory = (typeof VALID_CATEGORIES)[number];

type ExerciseRow = {
  exerciseId: string;
  coachId: string;
  name: string;
  category: ExerciseCategory;
  notesPublic: string;
  notesPrivate: string;
  createdAt: string;
  updatedAt: string;
};

type ExerciseForm = {
  name: string;
  category: ExerciseCategory;
  notesPublic: string;
  notesPrivate: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function normalizeExercise(value: unknown): ExerciseRow | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;

  const exerciseId = asString(rec["exerciseId"]);
  const coachId = asString(rec["coachId"]);
  const name = asString(rec["name"]);
  const category = asString(rec["category"]);
  const createdAt = asString(rec["createdAt"]);
  const updatedAt = asString(rec["updatedAt"]);

  if (!exerciseId || !coachId || !name) return null;
  if (!VALID_CATEGORIES.includes(category as ExerciseCategory)) return null;

  return {
    exerciseId,
    coachId,
    name,
    category: category as ExerciseCategory,
    notesPublic: asString(rec["notesPublic"]),
    notesPrivate: asString(rec["notesPrivate"]),
    createdAt,
    updatedAt,
  };
}

function createEmptyForm(): ExerciseForm {
  return {
    name: "",
    category: "ALTRO",
    notesPublic: "",
    notesPrivate: "",
  };
}

function validateForm(form: ExerciseForm): string | null {
  if (!form.name.trim()) return "Nome obbligatorio.";
  if (!form.category) return "Categoria obbligatoria.";
  if (!VALID_CATEGORIES.includes(form.category)) return "Categoria non valida.";
  return null;
}

function getErrorMessage(data: unknown, fallback: string) {
  if (typeof data === "object" && data !== null && "error" in data) {
    const maybe = (data as { error?: unknown }).error;
    if (typeof maybe === "string" && maybe.trim().length > 0) return maybe;
  }
  return fallback;
}

function previewText(value: string, max = 60): string {
  const raw = value.trim();
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max)}...`;
}

export default function CoachExercisesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initRef = useRef(false);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [popupNotice, setPopupNotice] = useState<string>("");
  const isPopup = searchParams.get("popup") === "1";
  const [forbidden, setForbidden] = useState<string | null>(null);
  const bannerText =
    forbidden === "athlete"
      ? "Accesso negato: sei loggato come COACH. L'area Atleta e riservata agli atleti."
      : forbidden === "coach"
      ? "Accesso negato: sei loggato come ATHLETE. L'area Coach e riservata ai coach."
      : null;

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<ExerciseRow[]>([]);
  const [error, setError] = useState<string>("");

  const [filterText, setFilterText] = useState("");

  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<ExerciseForm>(createEmptyForm);
  const [newFormErr, setNewFormErr] = useState<string>("");
  const [newFormBusy, setNewFormBusy] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ExerciseForm>(createEmptyForm);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [rowErr, setRowErr] = useState<string>("");

  async function loadExercises() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/coach/exercises", { cache: "no-store" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(getErrorMessage(data, `Errore caricamento esercizi (${r.status})`));
        setList([]);
        return;
      }
      if (!Array.isArray(data)) {
        setError("Risposta esercizi non valida.");
        setList([]);
        return;
      }
      const normalized = data
        .map((row: unknown) => normalizeExercise(row))
        .filter(Boolean) as ExerciseRow[];
      setList(normalized);
    } catch {
      setError("Errore di rete.");
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExercises();
    setForbidden(new URLSearchParams(window.location.search).get("forbidden"));
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    const returnToParam = searchParams.get("returnTo");
    const nameParam = searchParams.get("name");
    if (returnToParam) setReturnTo(returnToParam);
    if (returnToParam || nameParam) {
      setShowNewForm(true);
    }
    if (nameParam) {
      setNewForm((prev) => ({ ...prev, name: nameParam }));
    }
    initRef.current = true;
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) => row.name.toLowerCase().includes(q));
  }, [filterText, list]);

  function startEdit(row: ExerciseRow) {
    setEditId(row.exerciseId);
    setRowErr("");
    setEditForm({
      name: row.name,
      category: row.category,
      notesPublic: row.notesPublic ?? "",
      notesPrivate: row.notesPrivate ?? "",
    });
  }

  function cancelEdit() {
    setEditId(null);
  }

  async function handleCreateExercise(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNewFormErr("");
    const validationError = validateForm(newForm);
    if (validationError) {
      setNewFormErr(validationError);
      return;
    }
    setNewFormBusy(true);
    try {
      const payload = {
        name: newForm.name.trim(),
        category: newForm.category,
        notesPublic: newForm.notesPublic,
        notesPrivate: newForm.notesPrivate,
      };
      const r = await fetch("/api/coach/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setNewFormErr(getErrorMessage(data, `Errore creazione esercizio (${r.status})`));
        return;
      }
      if (isPopup) {
        const created = normalizeExercise(data);
        if (window.opener && created) {
          window.opener.postMessage(
            {
              type: "CF_EXERCISE_CREATED",
              exercise: {
                exerciseId: created.exerciseId,
                name: created.name,
                category: created.category,
              },
            },
            window.location.origin
          );
          window.close();
          setTimeout(() => {
            if (!window.closed) {
              setPopupNotice("Esercizio creato ✅ Puoi chiudere questa finestra.");
            }
          }, 200);
          return;
        }
        setPopupNotice("Esercizio creato ✅ Puoi chiudere questa finestra.");
        return;
      }
      if (returnTo) {
        router.replace(returnTo);
        return;
      }
      setNewForm(createEmptyForm());
      setShowNewForm(false);
      await loadExercises();
    } finally {
      setNewFormBusy(false);
    }
  }

  async function handleSaveExercise(exerciseId: string) {
    setRowErr("");
    const validationError = validateForm(editForm);
    if (validationError) {
      setRowErr(validationError);
      return;
    }
    setRowBusyId(exerciseId);
    try {
      const payload = {
        name: editForm.name.trim(),
        category: editForm.category,
        notesPublic: editForm.notesPublic,
        notesPrivate: editForm.notesPrivate,
      };
      const r = await fetch(`/api/coach/exercises/${exerciseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setRowErr(getErrorMessage(data, `Errore aggiornamento esercizio (${r.status})`));
        return;
      }
      setEditId(null);
      await loadExercises();
    } finally {
      setRowBusyId(null);
    }
  }

  async function handleDeleteExercise(exerciseId: string) {
    if (!confirm("Eliminare questo esercizio?")) return;
    setRowErr("");
    setRowBusyId(exerciseId);
    try {
      const r = await fetch(`/api/coach/exercises/${exerciseId}`, {
        method: "DELETE",
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setRowErr(getErrorMessage(data, `Errore eliminazione esercizio (${r.status})`));
        return;
      }
      await loadExercises();
    } finally {
      setRowBusyId(null);
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: "36px auto", padding: 16 }}>
      <section>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <a href="/coach" style={{ textDecoration: "underline" }}>
            Torna al coach
          </a>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>Libreria Esercizi</h1>
        <ForbiddenBanner text={bannerText} />
        {popupNotice ? (
          <p style={{ marginTop: 8, padding: "6px 8px", background: "#f7f7f7" }}>
            {popupNotice}
          </p>
        ) : null}
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
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Filtro nome</span>
            <input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Cerca per nome"
            />
          </label>
          <button type="button" onClick={loadExercises} disabled={loading}>
            Aggiorna lista
          </button>
        </div>

        {loading ? (
          <p>Caricamento esercizi...</p>
        ) : error ? (
          <p>Errore: {error}</p>
        ) : list.length === 0 ? (
          <p>Nessun esercizio in libreria.</p>
        ) : null}

        {rowErr ? <p>Errore: {rowErr}</p> : null}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Nome</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Categoria</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                  Note pubbliche
                </th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ex) => {
                const busy = rowBusyId === ex.exerciseId;
                return (
                  <tr key={ex.exerciseId}>
                    <td style={{ padding: "6px 4px" }}>{titleCaseIt(ex.name)}</td>
                    <td style={{ padding: "6px 4px" }}>
                      {formatTypeUpper(ex.category)}
                    </td>
                    <td style={{ padding: "6px 4px" }}>
                      {ex.notesPublic ? previewText(ex.notesPublic) : "-"}
                    </td>
                    <td style={{ padding: "6px 4px", display: "flex", gap: 8 }}>
                      {editId === ex.exerciseId ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleSaveExercise(ex.exerciseId)}
                          >
                            Salva
                          </button>
                          <button type="button" disabled={busy} onClick={cancelEdit}>
                            Annulla
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => startEdit(ex)} disabled={busy}>
                            Modifica
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExercise(ex.exerciseId)}
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
                <span>Categoria *</span>
                <select
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      category: e.target.value as ExerciseCategory,
                    }))
                  }
                >
                  {VALID_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {formatTypeUpper(c)}
                    </option>
                  ))}
                </select>
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
              Nuovo esercizio
            </button>
          ) : (
            <form onSubmit={handleCreateExercise} style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Nome *</span>
                <input
                  value={newForm.name}
                  onChange={(e) => setNewForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Categoria *</span>
                <select
                  value={newForm.category}
                  onChange={(e) =>
                    setNewForm((prev) => ({
                      ...prev,
                      category: e.target.value as ExerciseCategory,
                    }))
                  }
                >
                  {VALID_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {formatTypeUpper(c)}
                    </option>
                  ))}
                </select>
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
                    if (isPopup) {
                      window.close();
                      setTimeout(() => {
                        if (!window.closed) {
                          setPopupNotice(
                            "Operazione annullata. Puoi chiudere questa finestra."
                          );
                        }
                      }, 200);
                      return;
                    }
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
    </main>
  );
}
