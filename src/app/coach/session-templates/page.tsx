
"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";

import ForbiddenBanner from "@/components/ForbiddenBanner";

type ExerciseRow = {
  exerciseId: string;
  name: string;
  category?: string;
};

type TemplateSummary = {
  sessionTemplateId: string;
  title: string;
  notesPublic: string;
  notesPrivate: string;
  updatedAt: string;
};

type TemplateRow = {
  exerciseId: string;
  sets?: string | null;
  reps?: string | null;
  rest?: string | null;
  percent?: string | null;
  kg?: string | null;
  notesPublic?: string | null;
  notesPrivate?: string | null;
};

type TemplateBlock = {
  name: string;
  rows: TemplateRow[];
};

type TemplateDetail = TemplateSummary & {
  blocks: TemplateBlock[];
};

type TemplateRowForm = {
  exerciseId: string;
  sets: string;
  reps: string;
  rest: string;
  percent: string;
  kg: string;
  notesPublic: string;
  notesPrivate: string;
  exerciseSearch: string;
};

type TemplateBlockForm = {
  name: string;
  rows: TemplateRowForm[];
};

type TemplateForm = {
  title: string;
  notesPublic: string;
  notesPrivate: string;
  blocks: TemplateBlockForm[];
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asNumberString(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value == null) return "";
  return typeof value === "string" ? value : String(value);
}

function normalizeExercise(value: unknown): ExerciseRow | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const exerciseId = asString(rec.exerciseId);
  const name = asString(rec.name);
  if (!exerciseId || !name) return null;
  return { exerciseId, name, category: asString(rec.category) || undefined };
}

function normalizeTemplateSummary(value: unknown): TemplateSummary | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const sessionTemplateId = asString(rec.sessionTemplateId);
  const title = asString(rec.title);
  if (!sessionTemplateId || !title) return null;
  return {
    sessionTemplateId,
    title,
    notesPublic: asString(rec.notesPublic),
    notesPrivate: asString(rec.notesPrivate),
    updatedAt: asString(rec.updatedAt),
  };
}

function normalizeTemplateDetail(value: unknown): TemplateDetail | null {
  const summary = normalizeTemplateSummary(value);
  if (!summary) return null;
  const rec = value as Record<string, unknown>;
  const blocksInput = Array.isArray(rec.blocks) ? rec.blocks : [];
  const blocks: TemplateBlock[] = blocksInput
    .map((block) => {
      if (!block || typeof block !== "object") return null;
      const blockRec = block as Record<string, unknown>;
      const name = asString(blockRec.name);
      const rowsInput = Array.isArray(blockRec.rows) ? blockRec.rows : [];
      const rows: TemplateRow[] = rowsInput
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const rowRec = row as Record<string, unknown>;
          const exerciseId = asString(rowRec.exerciseId);
          if (!exerciseId) return null;
          return {
            exerciseId,
            sets: asString(rowRec.sets) || null,
            reps: asString(rowRec.reps) || null,
            rest: asString(rowRec.rest) || null,
            percent: asNumberString(rowRec.percent) || null,
            kg: asNumberString(rowRec.kg) || null,
            notesPublic: asString(rowRec.notesPublic) || null,
            notesPrivate: asString(rowRec.notesPrivate) || null,
          };
        })
        .filter(Boolean) as TemplateRow[];

      if (!name) return null;
      return { name, rows };
    })
    .filter(Boolean) as TemplateBlock[];

  return { ...summary, blocks };
}

function createEmptyRow(): TemplateRowForm {
  return {
    exerciseId: "",
    sets: "",
    reps: "",
    rest: "",
    percent: "",
    kg: "",
    notesPublic: "",
    notesPrivate: "",
    exerciseSearch: "",
  };
}

function createEmptyBlock(): TemplateBlockForm {
  return { name: "", rows: [] };
}

function createEmptyForm(): TemplateForm {
  return {
    title: "",
    notesPublic: "",
    notesPrivate: "",
    blocks: [],
  };
}

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toTrimmedOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function validateTemplateForm(form: TemplateForm): string | null {
  if (!form.title.trim()) return "Titolo obbligatorio.";
  for (let i = 0; i < form.blocks.length; i += 1) {
    const block = form.blocks[i];
    if (!block.name.trim()) return "Nome blocco obbligatorio.";
    for (let r = 0; r < block.rows.length; r += 1) {
      const row = block.rows[r];
      if (!row.exerciseId) return "Seleziona esercizio.";
      if (row.percent.trim() && toNumberOrNull(row.percent) == null) {
        return "Percentuale non valida.";
      }
      if (row.kg.trim() && toNumberOrNull(row.kg) == null) {
        return "Kg non validi.";
      }
      const hasCoachNote = row.notesPrivate.trim().length > 0;
      const hasPublicNote = row.notesPublic.trim().length > 0;
      const hasPercent = row.percent.trim().length > 0;
      const hasKg = row.kg.trim().length > 0;
      if (!hasCoachNote && !hasPublicNote && !hasPercent && !hasKg) {
        return "Ogni riga deve avere almeno nota pubblica/privata, % o kg.";
      }
    }
  }
  return null;
}

function formFromDetail(detail: TemplateDetail): TemplateForm {
  return {
    title: detail.title,
    notesPublic: detail.notesPublic ?? "",
    notesPrivate: detail.notesPrivate ?? "",
    blocks: detail.blocks.map((block) => ({
      name: block.name,
      rows: block.rows.map((row) => ({
        exerciseId: row.exerciseId,
        sets: row.sets ?? "",
        reps: row.reps ?? "",
        rest: row.rest ?? "",
        percent: row.percent ?? "",
        kg: row.kg ?? "",
        notesPublic: row.notesPublic ?? "",
        notesPrivate: row.notesPrivate ?? "",
        exerciseSearch: "",
      })),
    })),
  };
}

function buildPayload(form: TemplateForm) {
  return {
    title: form.title.trim(),
    notesPublic: form.notesPublic,
    notesPrivate: form.notesPrivate,
    blocks: form.blocks.map((block) => ({
      name: block.name.trim(),
      rows: block.rows.map((row) => ({
        exerciseId: row.exerciseId,
        sets: toTrimmedOrNull(row.sets),
        reps: toTrimmedOrNull(row.reps),
        rest: toTrimmedOrNull(row.rest),
        percent: toNumberOrNull(row.percent),
        kg: toNumberOrNull(row.kg),
        notesPublic: toTrimmedOrNull(row.notesPublic),
        notesPrivate: toTrimmedOrNull(row.notesPrivate),
      })),
    })),
  };
}
export default function CoachSessionTemplatesPage() {
  const [forbidden, setForbidden] = useState<string | null>(null);
  const bannerText =
    forbidden === "athlete"
      ? "Accesso negato: sei loggato come COACH. L'area Atleta e riservata agli atleti."
      : forbidden === "coach"
      ? "Accesso negato: sei loggato come ATHLETE. L'area Coach e riservata ai coach."
      : null;

  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState("");
  const [templatesActionError, setTemplatesActionError] = useState("");
  const [templateBusyId, setTemplateBusyId] = useState<string | null>(null);

  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [exercisesLoading, setExercisesLoading] = useState(true);
  const [exercisesError, setExercisesError] = useState("");

  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<TemplateForm>(createEmptyForm);
  const [newFormErr, setNewFormErr] = useState("");
  const [newFormBusy, setNewFormBusy] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TemplateForm>(createEmptyForm);
  const [editLoading, setEditLoading] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  const [viewId, setViewId] = useState<string | null>(null);
  const [viewTemplate, setViewTemplate] = useState<TemplateDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewErr, setViewErr] = useState("");

  async function loadExercises() {
    setExercisesLoading(true);
    setExercisesError("");
    try {
      const r = await fetch("/api/coach/exercises", { cache: "no-store" });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore caricamento esercizi (${r.status})`;
        throw new Error(msg);
      }
      if (!Array.isArray(data)) throw new Error("Risposta esercizi non valida.");
      const normalized = data
        .map((row: unknown) => normalizeExercise(row))
        .filter(Boolean) as ExerciseRow[];
      setExercises(normalized);
    } catch (e) {
      setExercisesError(e instanceof Error ? e.message : "Errore sconosciuto.");
      setExercises([]);
    } finally {
      setExercisesLoading(false);
    }
  }

  async function loadTemplates() {
    setTemplatesLoading(true);
    setTemplatesError("");
    setTemplatesActionError("");
    try {
      const r = await fetch("/api/coach/session-templates", { cache: "no-store" });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore caricamento template (${r.status})`;
        throw new Error(msg);
      }
      if (!Array.isArray(data)) throw new Error("Risposta template non valida.");
      const normalized = data
        .map((row: unknown) => normalizeTemplateSummary(row))
        .filter(Boolean) as TemplateSummary[];
      setTemplates(normalized);
    } catch (e) {
      setTemplatesError(e instanceof Error ? e.message : "Errore sconosciuto.");
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }

  useEffect(() => {
    loadExercises();
    loadTemplates();
    setForbidden(new URLSearchParams(window.location.search).get("forbidden"));
  }, []);

  const exercisesById = useMemo(() => {
    const map: Record<string, ExerciseRow> = {};
    exercises.forEach((ex) => {
      map[ex.exerciseId] = ex;
    });
    return map;
  }, [exercises]);

  function isEnduranceCategory(category?: string) {
    return category === "RUN" || category === "ERG";
  }

  function addBlock(setForm: Dispatch<SetStateAction<TemplateForm>>) {
    setForm((prev) => ({
      ...prev,
      blocks: [...prev.blocks, createEmptyBlock()],
    }));
  }

  function removeBlock(
    setForm: Dispatch<SetStateAction<TemplateForm>>,
    blockIndex: number
  ) {
    setForm((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((_, idx) => idx !== blockIndex),
    }));
  }

  function updateBlock(
    setForm: Dispatch<SetStateAction<TemplateForm>>,
    blockIndex: number,
    patch: Partial<TemplateBlockForm>
  ) {
    setForm((prev) => {
      const blocks = [...prev.blocks];
      const current = blocks[blockIndex];
      if (!current) return prev;
      blocks[blockIndex] = { ...current, ...patch };
      return { ...prev, blocks };
    });
  }

  function addRow(
    setForm: Dispatch<SetStateAction<TemplateForm>>,
    blockIndex: number
  ) {
    setForm((prev) => {
      const blocks = [...prev.blocks];
      const block = blocks[blockIndex];
      if (!block) return prev;
      blocks[blockIndex] = { ...block, rows: [...block.rows, createEmptyRow()] };
      return { ...prev, blocks };
    });
  }

  function removeRow(
    setForm: Dispatch<SetStateAction<TemplateForm>>,
    blockIndex: number,
    rowIndex: number
  ) {
    setForm((prev) => {
      const blocks = [...prev.blocks];
      const block = blocks[blockIndex];
      if (!block) return prev;
      const rows = block.rows.filter((_, idx) => idx !== rowIndex);
      blocks[blockIndex] = { ...block, rows };
      return { ...prev, blocks };
    });
  }

  function updateRow(
    setForm: Dispatch<SetStateAction<TemplateForm>>,
    blockIndex: number,
    rowIndex: number,
    patch: Partial<TemplateRowForm>
  ) {
    setForm((prev) => {
      const blocks = [...prev.blocks];
      const block = blocks[blockIndex];
      if (!block) return prev;
      const rows = [...block.rows];
      const currentRow = rows[rowIndex];
      if (!currentRow) return prev;
      rows[rowIndex] = { ...currentRow, ...patch };
      blocks[blockIndex] = { ...block, rows };
      return { ...prev, blocks };
    });
  }

  async function handleCreateTemplate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNewFormErr("");
    const validationError = validateTemplateForm(newForm);
    if (validationError) {
      setNewFormErr(validationError);
      return;
    }
    setNewFormBusy(true);
    try {
      const r = await fetch("/api/coach/session-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(newForm)),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore creazione template (${r.status})`;
        throw new Error(msg);
      }
      setShowNewForm(false);
      setNewForm(createEmptyForm());
      await loadTemplates();
    } catch (e) {
      setNewFormErr(e instanceof Error ? e.message : "Errore sconosciuto.");
    } finally {
      setNewFormBusy(false);
    }
  }

  async function startEdit(templateId: string) {
    setEditErr("");
    setEditLoading(true);
    setEditId(templateId);
    try {
      const r = await fetch(`/api/coach/session-templates/${templateId}`, {
        cache: "no-store",
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore caricamento template (${r.status})`;
        throw new Error(msg);
      }
      const normalized = normalizeTemplateDetail(data);
      if (!normalized) throw new Error("Risposta template non valida.");
      setEditForm(formFromDetail(normalized));
    } catch (e) {
      setEditErr(e instanceof Error ? e.message : "Errore sconosciuto.");
      setEditId(null);
    } finally {
      setEditLoading(false);
    }
  }

  function cancelEdit() {
    setEditId(null);
    setEditErr("");
    setEditForm(createEmptyForm());
  }

  async function handleSaveTemplate() {
    if (!editId) return;
    setEditErr("");
    const validationError = validateTemplateForm(editForm);
    if (validationError) {
      setEditErr(validationError);
      return;
    }
    setEditBusy(true);
    try {
      const r = await fetch(`/api/coach/session-templates/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(editForm)),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore aggiornamento template (${r.status})`;
        throw new Error(msg);
      }
      setEditId(null);
      setEditForm(createEmptyForm());
      await loadTemplates();
    } catch (e) {
      setEditErr(e instanceof Error ? e.message : "Errore sconosciuto.");
    } finally {
      setEditBusy(false);
    }
  }

  async function handleViewTemplate(templateId: string) {
    setViewErr("");
    setViewLoading(true);
    setViewId(templateId);
    try {
      const r = await fetch(`/api/coach/session-templates/${templateId}`, {
        cache: "no-store",
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore caricamento template (${r.status})`;
        throw new Error(msg);
      }
      const normalized = normalizeTemplateDetail(data);
      if (!normalized) throw new Error("Risposta template non valida.");
      setViewTemplate(normalized);
    } catch (e) {
      setViewErr(e instanceof Error ? e.message : "Errore sconosciuto.");
      setViewId(null);
      setViewTemplate(null);
    } finally {
      setViewLoading(false);
    }
  }

  function closeView() {
    setViewId(null);
    setViewErr("");
    setViewTemplate(null);
  }

  async function handleDeleteTemplate(templateId: string) {
    if (!confirm("Eliminare questo template?")) return;
    setTemplatesActionError("");
    setTemplateBusyId(templateId);
    try {
      const r = await fetch(`/api/coach/session-templates/${templateId}`, {
        method: "DELETE",
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore eliminazione template (${r.status})`;
        throw new Error(msg);
      }
      if (editId === templateId) {
        setEditId(null);
        setEditForm(createEmptyForm());
      }
      if (viewId === templateId) {
        closeView();
      }
      await loadTemplates();
    } catch (e) {
      setTemplatesActionError(e instanceof Error ? e.message : "Errore sconosciuto.");
    } finally {
      setTemplateBusyId(null);
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
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>Template Sessioni</h1>
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
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={loadTemplates} disabled={templatesLoading}>
            Aggiorna lista
          </button>
        </div>

        {templatesLoading ? (
          <p>Caricamento template...</p>
        ) : templatesError ? (
          <p>Errore: {templatesError}</p>
        ) : templates.length === 0 ? (
          <p>Nessun template in libreria.</p>
        ) : null}

        {templatesActionError ? <p>Errore: {templatesActionError}</p> : null}

        <div style={{ display: "grid", gap: 8 }}>
          {templates.map((tpl) => {
            const rowBusy = templateBusyId === tpl.sessionTemplateId;
            return (
              <div
                key={tpl.sessionTemplateId}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #eee",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 900 }}>{tpl.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Aggiornato: {tpl.updatedAt ? tpl.updatedAt : "N/D"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => handleViewTemplate(tpl.sessionTemplateId)}
                    disabled={editLoading || rowBusy}
                  >
                    Visualizza
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(tpl.sessionTemplateId)}
                    disabled={editLoading || rowBusy}
                  >
                    Modifica
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(tpl.sessionTemplateId)}
                    disabled={rowBusy}
                  >
                    {rowBusy ? "Elimino..." : "Elimina"}
                  </button>
                </div>
              </div>
            );
          })}
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
        <h2 style={{ margin: 0 }}>Nuovo template</h2>
        {!showNewForm ? (
          <button type="button" onClick={() => setShowNewForm(true)}>
            Crea template
          </button>
        ) : (
          <form onSubmit={handleCreateTemplate} style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Titolo *</span>
              <input
                value={newForm.title}
                onChange={(e) => setNewForm((prev) => ({ ...prev, title: e.target.value }))}
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

            <div style={{ display: "grid", gap: 10 }}>
              {newForm.blocks.map((block, blockIndex) => (
                <div
                  key={`new-block-${blockIndex}`}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #ddd",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>Blocco {blockIndex + 1}</strong>
                    <button type="button" onClick={() => removeBlock(setNewForm, blockIndex)}>
                      Rimuovi blocco
                    </button>
                  </div>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Nome blocco *</span>
                    <input
                      value={block.name}
                      onChange={(e) =>
                        updateBlock(setNewForm, blockIndex, { name: e.target.value })
                      }
                    />
                  </label>

                  {block.rows.map((row, rowIndex) => {
                    const filter = row.exerciseSearch.trim().toLowerCase();
                    let options = exercises.filter((ex) =>
                      ex.name.toLowerCase().includes(filter)
                    );
                    const selected = exercisesById[row.exerciseId];
                    if (
                      row.exerciseId &&
                      selected &&
                      !options.some((opt) => opt.exerciseId === row.exerciseId)
                    ) {
                      options = [selected, ...options];
                    }
                    const isRunErg = isEnduranceCategory(selected?.category);
                    const showNoResults = !exercisesLoading && options.length === 0;
                    return (
                      <div
                        key={`new-row-${blockIndex}-${rowIndex}`}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          border: "1px solid #eee",
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <strong>Esercizio {rowIndex + 1}</strong>
                          <button
                            type="button"
                            onClick={() => removeRow(setNewForm, blockIndex, rowIndex)}
                          >
                            Rimuovi
                          </button>
                        </div>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span>Cerca esercizio</span>
                          <input
                            value={row.exerciseSearch}
                            onChange={(e) =>
                              updateRow(setNewForm, blockIndex, rowIndex, {
                                exerciseSearch: e.target.value,
                              })
                            }
                            placeholder="Cerca in libreria"
                          />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span>Esercizio *</span>
                          <select
                            value={row.exerciseId}
                            onChange={(e) =>
                              updateRow(setNewForm, blockIndex, rowIndex, {
                                exerciseId: e.target.value,
                              })
                            }
                            disabled={exercisesLoading}
                          >
                            <option value="">Seleziona esercizio</option>
                            {options.map((ex) => (
                              <option key={ex.exerciseId} value={ex.exerciseId}>
                                {ex.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        {exercisesLoading ? <p>Caricamento esercizi...</p> : null}
                        {exercisesError ? <p>Errore: {exercisesError}</p> : null}
                        {showNoResults ? <p>Nessun risultato.</p> : null}

                        {isRunErg ? (
                          <div
                            style={{
                              display: "grid",
                              gap: 8,
                              gridTemplateColumns: "1fr 1fr 1fr",
                            }}
                          >
                            <label style={{ display: "grid", gap: 6 }}>
                              <span>Durata</span>
                              <input
                                value={row.sets}
                                onChange={(e) =>
                                  updateRow(setNewForm, blockIndex, rowIndex, {
                                    sets: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span>Zona HR</span>
                              <input
                                value={row.reps}
                                onChange={(e) =>
                                  updateRow(setNewForm, blockIndex, rowIndex, {
                                    reps: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span>Passo</span>
                              <input
                                value={row.rest}
                                onChange={(e) =>
                                  updateRow(setNewForm, blockIndex, rowIndex, {
                                    rest: e.target.value,
                                  })
                                }
                              />
                            </label>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "grid",
                              gap: 8,
                              gridTemplateColumns: "1fr 1fr",
                            }}
                          >
                            <label style={{ display: "grid", gap: 6 }}>
                              <span>Set</span>
                              <input
                                value={row.sets}
                                onChange={(e) =>
                                  updateRow(setNewForm, blockIndex, rowIndex, {
                                    sets: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span>Reps</span>
                              <input
                                value={row.reps}
                                onChange={(e) =>
                                  updateRow(setNewForm, blockIndex, rowIndex, {
                                    reps: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span>Rest</span>
                              <input
                                value={row.rest}
                                onChange={(e) =>
                                  updateRow(setNewForm, blockIndex, rowIndex, {
                                    rest: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span>%</span>
                              <input
                                value={row.percent}
                                onChange={(e) =>
                                  updateRow(setNewForm, blockIndex, rowIndex, {
                                    percent: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span>Kg</span>
                              <input
                                value={row.kg}
                                onChange={(e) =>
                                  updateRow(setNewForm, blockIndex, rowIndex, {
                                    kg: e.target.value,
                                  })
                                }
                              />
                            </label>
                          </div>
                        )}

                        <label style={{ display: "grid", gap: 6 }}>
                          <span>Note pubbliche</span>
                          <textarea
                            value={row.notesPublic}
                            onChange={(e) =>
                              updateRow(setNewForm, blockIndex, rowIndex, {
                                notesPublic: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label style={{ display: "grid", gap: 6 }}>
                          <span>Nota coach (privata)</span>
                          <textarea
                            value={row.notesPrivate}
                            onChange={(e) =>
                              updateRow(setNewForm, blockIndex, rowIndex, {
                                notesPrivate: e.target.value,
                              })
                            }
                          />
                        </label>
                      </div>
                    );
                  })}

                  <button type="button" onClick={() => addRow(setNewForm, blockIndex)}>
                    Aggiungi esercizio
                  </button>
                </div>
              ))}
            </div>

            <button type="button" onClick={() => addBlock(setNewForm)}>
              Aggiungi blocco
            </button>

            {newFormErr ? <p>Errore: {newFormErr}</p> : null}

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={newFormBusy}>
                {newFormBusy ? "Creo..." : "Crea template"}
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
      </section>

      {editId ? (
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
          <h2 style={{ margin: 0 }}>Modifica template</h2>
          {editLoading ? (
            <p>Caricamento template...</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Titolo *</span>
                <input
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, title: e.target.value }))
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

              {editForm.blocks.map((block, blockIndex) => (
                <div
                  key={`edit-block-${blockIndex}`}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #ddd",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>Blocco {blockIndex + 1}</strong>
                    <button type="button" onClick={() => removeBlock(setEditForm, blockIndex)}>
                      Rimuovi blocco
                    </button>
                  </div>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Nome blocco *</span>
                    <input
                      value={block.name}
                      onChange={(e) =>
                        updateBlock(setEditForm, blockIndex, { name: e.target.value })
                      }
                    />
                  </label>

                  {block.rows.map((row, rowIndex) => {
                    const filter = row.exerciseSearch.trim().toLowerCase();
                    let options = exercises.filter((ex) =>
                      ex.name.toLowerCase().includes(filter)
                    );
                    const selected = exercisesById[row.exerciseId];
                    if (
                      row.exerciseId &&
                      selected &&
                      !options.some((opt) => opt.exerciseId === row.exerciseId)
                    ) {
                      options = [selected, ...options];
                    }
                    const isRunErg = isEnduranceCategory(selected?.category);
                    const showNoResults = !exercisesLoading && options.length === 0;
                    return (
                      <div
                        key={`edit-row-${blockIndex}-${rowIndex}`}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          border: "1px solid #eee",
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <strong>Esercizio {rowIndex + 1}</strong>
                          <button
                            type="button"
                            onClick={() => removeRow(setEditForm, blockIndex, rowIndex)}
                          >
                            Rimuovi
                          </button>
                        </div>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span>Cerca esercizio</span>
                          <input
                            value={row.exerciseSearch}
                            onChange={(e) =>
                              updateRow(setEditForm, blockIndex, rowIndex, {
                                exerciseSearch: e.target.value,
                              })
                            }
                            placeholder="Cerca in libreria"
                          />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span>Esercizio *</span>
                          <select
                            value={row.exerciseId}
                            onChange={(e) =>
                              updateRow(setEditForm, blockIndex, rowIndex, {
                                exerciseId: e.target.value,
                              })
                            }
                            disabled={exercisesLoading}
                          >
                            <option value="">Seleziona esercizio</option>
                            {options.map((ex) => (
                              <option key={ex.exerciseId} value={ex.exerciseId}>
                                {ex.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        {exercisesLoading ? <p>Caricamento esercizi...</p> : null}
                        {exercisesError ? <p>Errore: {exercisesError}</p> : null}
                        {showNoResults ? <p>Nessun risultato.</p> : null}

                        {isRunErg ? (
                          <div
                            style={{
                              display: "grid",
                              gap: 8,
                              gridTemplateColumns: "1fr 1fr 1fr",
                            }}
                          >
                            <label style={{ display: "grid", gap: 6 }}>
                              <span>Durata</span>
                              <input
                                value={row.sets}
                                onChange={(e) =>
                                  updateRow(setEditForm, blockIndex, rowIndex, {
                                    sets: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span>Zona HR</span>
                              <input
                                value={row.reps}
                                onChange={(e) =>
                                  updateRow(setEditForm, blockIndex, rowIndex, {
                                    reps: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span>Passo</span>
                              <input
                                value={row.rest}
                                onChange={(e) =>
                                  updateRow(setEditForm, blockIndex, rowIndex, {
                                    rest: e.target.value,
                                  })
                                }
                              />
                            </label>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "grid",
                              gap: 8,
                              gridTemplateColumns: "1fr 1fr",
                            }}
                          >
                            <label style={{ display: "grid", gap: 6 }}>
                              <span>Set</span>
                              <input
                                value={row.sets}
                                onChange={(e) =>
                                  updateRow(setEditForm, blockIndex, rowIndex, {
                                    sets: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span>Reps</span>
                              <input
                                value={row.reps}
                                onChange={(e) =>
                                  updateRow(setEditForm, blockIndex, rowIndex, {
                                    reps: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span>Rest</span>
                              <input
                                value={row.rest}
                                onChange={(e) =>
                                  updateRow(setEditForm, blockIndex, rowIndex, {
                                    rest: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span>%</span>
                              <input
                                value={row.percent}
                                onChange={(e) =>
                                  updateRow(setEditForm, blockIndex, rowIndex, {
                                    percent: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span>Kg</span>
                              <input
                                value={row.kg}
                                onChange={(e) =>
                                  updateRow(setEditForm, blockIndex, rowIndex, {
                                    kg: e.target.value,
                                  })
                                }
                              />
                            </label>
                          </div>
                        )}

                        <label style={{ display: "grid", gap: 6 }}>
                          <span>Note pubbliche</span>
                          <textarea
                            value={row.notesPublic}
                            onChange={(e) =>
                              updateRow(setEditForm, blockIndex, rowIndex, {
                                notesPublic: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label style={{ display: "grid", gap: 6 }}>
                          <span>Nota coach (privata)</span>
                          <textarea
                            value={row.notesPrivate}
                            onChange={(e) =>
                              updateRow(setEditForm, blockIndex, rowIndex, {
                                notesPrivate: e.target.value,
                              })
                            }
                          />
                        </label>
                      </div>
                    );
                  })}

                  <button type="button" onClick={() => addRow(setEditForm, blockIndex)}>
                    Aggiungi esercizio
                  </button>
                </div>
              ))}

              <button type="button" onClick={() => addBlock(setEditForm)}>
                Aggiungi blocco
              </button>
            </div>
          )}

          {editErr ? <p>Errore: {editErr}</p> : null}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={handleSaveTemplate} disabled={editBusy || editLoading}>
              {editBusy ? "Salvo..." : "Salva"}
            </button>
            <button type="button" onClick={cancelEdit} disabled={editBusy}>
              Annulla
            </button>
          </div>
        </section>
      ) : null}

      {viewId ? (
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
          <h2 style={{ margin: 0 }}>Visualizza template</h2>
          {viewLoading ? (
            <p>Caricamento template...</p>
          ) : viewTemplate ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 900 }}>{viewTemplate.title}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Aggiornato: {viewTemplate.updatedAt ? viewTemplate.updatedAt : "N/D"}
                </div>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <div>
                  <strong>Note pubbliche:</strong>{" "}
                  {viewTemplate.notesPublic?.trim() ? viewTemplate.notesPublic : "-"}
                </div>
                <div>
                  <strong>Note private:</strong>{" "}
                  {viewTemplate.notesPrivate?.trim() ? viewTemplate.notesPrivate : "-"}
                </div>
              </div>

              {viewTemplate.blocks.map((block, blockIndex) => (
                <div
                  key={`view-block-${blockIndex}`}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #ddd",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <strong>
                    Blocco {blockIndex + 1}: {block.name}
                  </strong>
                  {block.rows.length === 0 ? <p>Nessun esercizio.</p> : null}
                  {block.rows.map((row, rowIndex) => {
                    const ex = exercisesById[row.exerciseId];
                    const isRunErg = isEnduranceCategory(ex?.category);
                    return (
                      <div
                        key={`view-row-${blockIndex}-${rowIndex}`}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          border: "1px solid #eee",
                          display: "grid",
                          gap: 6,
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>
                          {rowIndex + 1}. {ex?.name || row.exerciseId}
                          {ex?.category ? ` (${ex.category})` : ""}
                        </div>
                        {isRunErg ? (
                          <div style={{ display: "grid", gap: 6 }}>
                            <div>Durata: {row.sets || "-"}</div>
                            <div>Zona HR: {row.reps || "-"}</div>
                            <div>Passo: {row.rest || "-"}</div>
                          </div>
                        ) : (
                          <div style={{ display: "grid", gap: 6 }}>
                            <div>Set: {row.sets || "-"}</div>
                            <div>Reps: {row.reps || "-"}</div>
                            <div>Rest: {row.rest || "-"}</div>
                            <div>%: {row.percent ?? "-"}</div>
                            <div>Kg: {row.kg ?? "-"}</div>
                          </div>
                        )}
                        <div>Note pubbliche: {row.notesPublic || "-"}</div>
                        <div>Note private: {row.notesPrivate || "-"}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : null}

          {viewErr ? <p>Errore: {viewErr}</p> : null}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={closeView} disabled={viewLoading}>
              Chiudi
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
