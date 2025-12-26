"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type ExerciseRow = {
  exerciseId: string;
  name: string;
  category?: string;
};

type SessionRow = {
  rowId: string;
  exerciseId: string;
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
  notesPrivate: string;
  updatedAt: string;
  blocks: SessionBlock[];
};

type SessionRowForm = {
  exerciseId: string;
  sets: string;
  reps: string;
  rest: string;
  percent: string;
  kg: string;
  notesPublic: string;
  notesPrivate: string;
  exerciseSearch: string;
  runDuration: string;
  runDistance: string;
  runPace: string;
  runHr: string;
  runRpe: string;
  runNote: string;
};

type SessionBlockForm = {
  name: string;
  rows: SessionRowForm[];
};

type SessionForm = {
  title: string;
  sessionDate: string;
  notesPublic: string;
  notesPrivate: string;
  blocks: SessionBlockForm[];
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

function normalizeSessionDetail(value: unknown): SessionDetail | null {
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
          if (!rowId || !exerciseId) return null;
          return {
            rowId,
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
        .filter(Boolean) as SessionRow[];
      if (!blockId || !name) return null;
      return { blockId, name, rows };
    })
    .filter(Boolean) as SessionBlock[];

  return {
    sessionId,
    title,
    sessionDate: asString(rec.sessionDate) || null,
    notesPublic: asString(rec.notesPublic),
    notesPrivate: asString(rec.notesPrivate),
    updatedAt: asString(rec.updatedAt),
    blocks,
  };
}

function createEmptyRow(): SessionRowForm {
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
    runDuration: "",
    runDistance: "",
    runPace: "",
    runHr: "",
    runRpe: "",
    runNote: "",
  };
}

function createEmptyBlock(): SessionBlockForm {
  return { name: "", rows: [] };
}

function createEmptyForm(): SessionForm {
  return {
    title: "",
    sessionDate: "",
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

function formatDate(value: string | null) {
  if (!value) return "";
  return value.length >= 10 ? value.slice(0, 10) : value;
}

function parseRunNotes(value: string | null) {
  if (!value || !value.startsWith("RUN|")) return null;
  const parts = value.split("|").slice(1);
  const out: Record<string, string> = {};
  parts.forEach((part) => {
    const [key, ...rest] = part.split("=");
    if (!key) return;
    out[key] = rest.join("=");
  });
  return {
    duration: out.dur ?? "",
    distance: out.dist ?? "",
    pace: out.pace ?? "",
    hr: out.hr ?? "",
    rpe: out.rpe ?? "",
    note: out.note ?? "",
  };
}

function serializeRunNotes(value: {
  duration: string;
  distance: string;
  pace: string;
  hr: string;
  rpe: string;
  note: string;
}) {
  const dur = value.duration.trim();
  const dist = value.distance.trim();
  const pace = value.pace.trim();
  const hr = value.hr.trim();
  const rpe = value.rpe.trim();
  const note = value.note.trim();
  const parts = [`RUN`, `dur=${dur}`, `dist=${dist}`, `pace=${pace}`, `hr=${hr}`, `rpe=${rpe}`];
  if (note) parts.push(`note=${note}`);
  return parts.join("|");
}

function formFromDetail(detail: SessionDetail): SessionForm {
  return {
    title: detail.title,
    sessionDate: formatDate(detail.sessionDate),
    notesPublic: detail.notesPublic ?? "",
    notesPrivate: detail.notesPrivate ?? "",
    blocks: detail.blocks.map((block) => ({
      name: block.name,
      rows: block.rows.map((row) => {
        const runNotes = parseRunNotes(row.notesPublic ?? null);
        return {
          exerciseId: row.exerciseId,
          sets: row.sets ?? "",
          reps: row.reps ?? "",
          rest: row.rest ?? "",
          percent: row.percent ?? "",
          kg: row.kg ?? "",
          notesPublic: runNotes ? "" : row.notesPublic ?? "",
          notesPrivate: row.notesPrivate ?? "",
          exerciseSearch: "",
          runDuration: runNotes?.duration ?? "",
          runDistance: runNotes?.distance ?? "",
          runPace: runNotes?.pace ?? "",
          runHr: runNotes?.hr ?? "",
          runRpe: runNotes?.rpe ?? "",
          runNote: runNotes?.note ?? "",
        };
      }),
    })),
  };
}

function buildPayload(form: SessionForm, exercisesById: Record<string, ExerciseRow>) {
  return {
    title: form.title.trim(),
    sessionDate: form.sessionDate.trim(),
    notesPublic: form.notesPublic,
    notesPrivate: form.notesPrivate,
    blocks: form.blocks.map((block) => ({
      name: block.name.trim(),
      rows: block.rows.map((row) => {
        const category = exercisesById[row.exerciseId]?.category;
        const isRun = category === "RUN";
        return {
          exerciseId: row.exerciseId,
          sets: isRun ? null : toTrimmedOrNull(row.sets),
          reps: isRun ? null : toTrimmedOrNull(row.reps),
          rest: isRun ? null : toTrimmedOrNull(row.rest),
          percent: isRun ? null : toNumberOrNull(row.percent),
          kg: isRun ? null : toNumberOrNull(row.kg),
          notesPublic: isRun
            ? serializeRunNotes({
                duration: row.runDuration,
                distance: row.runDistance,
                pace: row.runPace,
                hr: row.runHr,
                rpe: row.runRpe,
                note: row.runNote,
              })
            : toTrimmedOrNull(row.notesPublic),
          notesPrivate: toTrimmedOrNull(row.notesPrivate),
        };
      }),
    })),
  };
}

function getRowKey(blockIndex: number, rowIndex: number) {
  return `${blockIndex}-${rowIndex}`;
}

function validateForm(form: SessionForm, exercisesById: Record<string, ExerciseRow>) {
  const rowErrors: Record<string, string> = {};
  const blockErrors: Record<string, string> = {};
  let error = "";

  if (!form.title.trim()) {
    error = "Titolo obbligatorio.";
  }

  form.blocks.forEach((block, blockIndex) => {
    if (!block.name.trim()) {
      blockErrors[String(blockIndex)] = "Nome blocco obbligatorio.";
    }
    block.rows.forEach((row, rowIndex) => {
      const key = getRowKey(blockIndex, rowIndex);
      if (!row.exerciseId) {
        rowErrors[key] = "Seleziona esercizio.";
        return;
      }
      const category = exercisesById[row.exerciseId]?.category;
      const isRun = category === "RUN";
      if (!isRun && row.percent.trim() && toNumberOrNull(row.percent) == null) {
        rowErrors[key] = "Percentuale non valida.";
        return;
      }
      if (!isRun && row.kg.trim() && toNumberOrNull(row.kg) == null) {
        rowErrors[key] = "Kg non validi.";
        return;
      }
      const hasCoachNote = row.notesPrivate.trim().length > 0;
      const hasPublicNote = row.notesPublic.trim().length > 0;
      const hasPercent = row.percent.trim().length > 0;
      const hasKg = row.kg.trim().length > 0;
      if (!isRun && !hasCoachNote && !hasPublicNote && !hasPercent && !hasKg) {
        rowErrors[key] =
          "Inserisci nota pubblica/privata, % o kg per questa riga.";
      }
    });
  });

  if (!error && (Object.keys(rowErrors).length > 0 || Object.keys(blockErrors).length > 0)) {
    error = "Correggi gli errori evidenziati.";
  }

  return { error, rowErrors, blockErrors };
}

export default function AssignedSessionDetailPage() {
  const params = useParams<{ sessionId: string | string[] }>();
  const rawId = Array.isArray(params.sessionId)
    ? params.sessionId[0]
    : params.sessionId;
  const sessionId = rawId ?? "";
  const isNew = sessionId === "new";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEditMode = isNew || searchParams.get("mode") === "edit";

  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [blockErrors, setBlockErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<SessionForm>(createEmptyForm);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const draftInitRef = useRef(false);
  const didRestoreRef = useRef(false);

  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [searchResults, setSearchResults] = useState<Record<string, ExerciseRow[]>>({});
  const [searchLoadingByKey, setSearchLoadingByKey] = useState<Record<string, boolean>>(
    {}
  );
  const [searchErrorByKey, setSearchErrorByKey] = useState<Record<string, string>>({});
  const searchTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const searchQueryRef = useRef<Record<string, string>>({});

  async function loadExercises() {
    try {
      const r = await fetch("/api/coach/exercises", { cache: "no-store" });
      const data = await r.json().catch(() => null);
      if (!r.ok) return;
      if (!Array.isArray(data)) return;
      const normalized = data
        .map((row: unknown) => normalizeExercise(row))
        .filter(Boolean) as ExerciseRow[];
      setExercises(normalized);
    } catch {
      setExercises([]);
    }
  }

  async function loadDetail() {
    if (!sessionId || isNew) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/coach/sessions/${sessionId}`, { cache: "no-store" });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore caricamento sessione (${r.status})`;
        throw new Error(msg);
      }
      const normalized = normalizeSessionDetail(data);
      if (!normalized) throw new Error("Risposta sessione non valida.");
      setDetail(normalized);
      setForm(formFromDetail(normalized));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore sconosciuto.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    if (isNew) {
      const hasDraft = !!searchParams.get("draft");
      setDetail(null);
      if (!hasDraft && !didRestoreRef.current) {
        setForm(createEmptyForm());
      }
      return;
    }
    loadDetail();
  }, [isNew, searchParams, sessionId]);

  useEffect(() => {
    if (!isNew) return;
    const existing = searchParams.get("draft");
    if (existing) {
      setDraftId(existing);
      return;
    }
    const nextId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const qs = new URLSearchParams(searchParams.toString());
    qs.set("draft", nextId);
    router.replace(`${pathname}?${qs.toString()}`);
    setDraftId(nextId);
  }, [isNew, pathname, router, searchParams]);

  const draftKey = useMemo(() => {
    return draftId ? `session-draft:${draftId}` : null;
  }, [draftId]);

  function saveDraftNow(nextForm: SessionForm) {
    if (!draftKey) return;
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          version: 1,
          savedAt: new Date().toISOString(),
          form: nextForm,
          blocks: nextForm.blocks,
        })
      );
    } catch {
      // ignore draft save errors
    }
  }

  useEffect(() => {
    if (!isNew || !draftKey || draftInitRef.current) return;
    draftInitRef.current = true;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        form?: SessionForm;
        blocks?: SessionBlockForm[];
      };
      if (parsed && typeof parsed === "object") {
        if (parsed.form && Array.isArray(parsed.form.blocks)) {
          setForm(parsed.form);
          didRestoreRef.current = true;
          return;
        }
        if (Array.isArray(parsed.blocks)) {
          setForm((prev) => ({ ...prev, blocks: parsed.blocks as SessionBlockForm[] }));
          didRestoreRef.current = true;
        }
      }
    } catch {
      // ignore draft load errors
    }
  }, [draftKey, isNew]);

  useEffect(() => {
    if (!isNew || !draftKey) return;
    const handle = setTimeout(() => {
      saveDraftNow(form);
    }, 250);
    return () => clearTimeout(handle);
  }, [draftKey, form, isNew]);

  useEffect(() => {
    return () => {
      Object.values(searchTimersRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const exercisesById = useMemo(() => {
    const map: Record<string, ExerciseRow> = {};
    exercises.forEach((ex) => {
      map[ex.exerciseId] = ex;
    });
    return map;
  }, [exercises]);

  const groupedExercises = useMemo(() => {
    const buckets: Record<string, ExerciseRow[]> = {
      WL: [],
      Strength: [],
      Accessory: [],
      Mobility: [],
      Conditioning: [],
      Other: [],
    };
    exercises.forEach((ex) => {
      switch (ex.category) {
        case "WEIGHTLIFTING":
          buckets.WL.push(ex);
          break;
        case "GYM":
          buckets.Strength.push(ex);
          break;
        case "METCON":
        case "RUN":
        case "ERG":
          buckets.Conditioning.push(ex);
          break;
        default:
          buckets.Other.push(ex);
          break;
      }
    });
    const order = [
      { key: "WL", label: "WL" },
      { key: "Strength", label: "Strength" },
      { key: "Accessory", label: "Accessory" },
      { key: "Mobility", label: "Mobility" },
      { key: "Conditioning", label: "Conditioning" },
      { key: "Other", label: "Other" },
    ];
    return order
      .map((group) => ({
        label: group.label,
        items: buckets[group.key].slice().sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((group) => group.items.length > 0);
  }, [exercises]);

  const currentUrl = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string };
      if (!data || data.type !== "CF_EXERCISE_CREATED") return;
      loadExercises();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function handleEnterEdit() {
    router.replace(`${pathname}?mode=edit`);
  }

  function handleOpenExercises(url: string) {
    saveDraftNow(form);
    const popupUrl = `${url}${url.includes("?") ? "&" : "?"}popup=1`;
    const popup = window.open(
      popupUrl,
      "cf_exercises_popup",
      "popup=yes,width=1100,height=800,left=200,top=100"
    );
    if (!popup) {
      window.open(popupUrl, "_blank", "noopener,noreferrer");
      alert("Popup bloccato: aperto in nuova scheda. Torna qui senza refresh.");
    }
  }

  function handleCancelEdit() {
    setSaveError("");
    setRowErrors({});
    setBlockErrors({});
    if (isNew) {
      if (draftKey) {
        try {
          sessionStorage.removeItem(draftKey);
        } catch {
          // ignore
        }
      }
      router.replace("/coach/assigned-sessions");
      return;
    }
    if (detail) setForm(formFromDetail(detail));
    router.replace(pathname);
  }

  function scheduleExerciseSearch(key: string, value: string) {
    const trimmed = value.trim();
    searchQueryRef.current[key] = trimmed;

    if (searchTimersRef.current[key]) {
      clearTimeout(searchTimersRef.current[key]);
      delete searchTimersRef.current[key];
    }

    if (trimmed.length < 2) {
      setSearchResults((prev) => ({ ...prev, [key]: [] }));
      setSearchLoadingByKey((prev) => ({ ...prev, [key]: false }));
      setSearchErrorByKey((prev) => ({ ...prev, [key]: "" }));
      return;
    }

    searchTimersRef.current[key] = setTimeout(async () => {
      const latest = searchQueryRef.current[key];
      if (latest !== trimmed) return;
      setSearchLoadingByKey((prev) => ({ ...prev, [key]: true }));
      setSearchErrorByKey((prev) => ({ ...prev, [key]: "" }));
      try {
        const r = await fetch(`/api/coach/exercises?q=${encodeURIComponent(trimmed)}`, {
          cache: "no-store",
        });
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          const msg =
            (data && (data.error || data.message)) ||
            `Errore ricerca esercizi (${r.status})`;
          throw new Error(msg);
        }
        if (!Array.isArray(data)) throw new Error("Risposta esercizi non valida.");
        const normalized = data
          .map((row: unknown) => normalizeExercise(row))
          .filter(Boolean) as ExerciseRow[];
        setSearchResults((prev) => ({ ...prev, [key]: normalized.slice(0, 20) }));
      } catch (e) {
        setSearchErrorByKey((prev) => ({
          ...prev,
          [key]: e instanceof Error ? e.message : "Errore sconosciuto.",
        }));
        setSearchResults((prev) => ({ ...prev, [key]: [] }));
      } finally {
        setSearchLoadingByKey((prev) => ({ ...prev, [key]: false }));
      }
    }, 250);
  }

  function updateBlock(
    blockIndex: number,
    patch: Partial<SessionBlockForm>
  ) {
    setForm((prev) => {
      const blocks = [...prev.blocks];
      const current = blocks[blockIndex];
      if (!current) return prev;
      blocks[blockIndex] = { ...current, ...patch };
      return { ...prev, blocks };
    });
  }

  function addBlock() {
    setForm((prev) => ({
      ...prev,
      blocks: [...prev.blocks, createEmptyBlock()],
    }));
  }

  function addBlockAfter(blockIndex: number) {
    setForm((prev) => {
      const blocks = [...prev.blocks];
      const insertAt = Math.min(blockIndex + 1, blocks.length);
      blocks.splice(insertAt, 0, createEmptyBlock());
      return { ...prev, blocks };
    });
  }

  function removeBlock(blockIndex: number) {
    setForm((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((_, idx) => idx !== blockIndex),
    }));
  }

  function addRow(blockIndex: number) {
    setForm((prev) => {
      const blocks = [...prev.blocks];
      const block = blocks[blockIndex];
      if (!block) return prev;
      blocks[blockIndex] = { ...block, rows: [...block.rows, createEmptyRow()] };
      return { ...prev, blocks };
    });
  }

  function removeRow(blockIndex: number, rowIndex: number) {
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
    blockIndex: number,
    rowIndex: number,
    patch: Partial<SessionRowForm>
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

  function handleExerciseSearchChange(
    blockIndex: number,
    rowIndex: number,
    value: string
  ) {
    updateRow(blockIndex, rowIndex, { exerciseSearch: value });
    scheduleExerciseSearch(getRowKey(blockIndex, rowIndex), value);
  }

  function handleExerciseSelect(
    blockIndex: number,
    rowIndex: number,
    exercise: ExerciseRow
  ) {
    const key = getRowKey(blockIndex, rowIndex);
    updateRow(blockIndex, rowIndex, {
      exerciseId: exercise.exerciseId,
      exerciseSearch: exercise.name,
    });
    setSearchResults((prev) => ({ ...prev, [key]: [] }));
    setSearchLoadingByKey((prev) => ({ ...prev, [key]: false }));
    setSearchErrorByKey((prev) => ({ ...prev, [key]: "" }));
  }

  async function handleSave() {
    setSaveError("");
    setRowErrors({});
    setBlockErrors({});
    const validation = validateForm(form, exercisesById);
    if (validation.error) {
      setSaveError(validation.error);
      setRowErrors(validation.rowErrors);
      setBlockErrors(validation.blockErrors);
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(form, exercisesById);
      const r = await fetch(
        isNew ? "/api/coach/sessions" : `/api/coach/sessions/${sessionId}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore salvataggio sessione (${r.status})`;
        throw new Error(msg);
      }
      if (draftKey) {
        try {
          sessionStorage.removeItem(draftKey);
        } catch {
          // ignore
        }
      }
      router.replace("/coach/assigned-sessions");
      return;
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Errore sconosciuto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: "36px auto", padding: 16 }}>
      <section style={{ display: "grid", gap: 12 }}>
        {!isEditMode ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link href="/coach/assigned-sessions" style={{ textDecoration: "underline" }}>
              Indietro
            </Link>
            {!isNew ? (
              <button type="button" onClick={handleEnterEdit}>
                Modifica
              </button>
            ) : null}
          </div>
        ) : (
          <Link href="/coach/assigned-sessions" style={{ textDecoration: "underline" }}>
            {"<-"} Torna alle sessioni
          </Link>
        )}
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          {isNew ? "Nuova sessione" : "Sessione"}
        </h1>

        {isEditMode ? (
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 2,
              background: "#fff",
              padding: "8px 0",
              borderBottom: "1px solid #eee",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button type="button" onClick={handleCancelEdit} disabled={saving || loading}>
              Annulla
            </button>
            <button type="button" onClick={handleSave} disabled={saving || loading}>
              {saving ? "Salvo..." : isNew ? "Crea sessione" : "Salva sessione"}
            </button>
            <button type="button" onClick={addBlock} disabled={saving || loading}>
              + Blocco
            </button>
          </div>
        ) : null}

        {loading ? <p>Caricamento sessione...</p> : null}
        {error ? <p>Errore: {error}</p> : null}

        {isEditMode ? (
          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Titolo *</span>
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Data sessione</span>
              <input
                type="date"
                value={form.sessionDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sessionDate: e.target.value }))
                }
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Note pubbliche</span>
              <textarea
                value={form.notesPublic}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notesPublic: e.target.value }))
                }
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Note private</span>
              <textarea
                value={form.notesPrivate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notesPrivate: e.target.value }))
                }
              />
            </label>

            {form.blocks.map((block, blockIndex) => {
              const blockError = blockErrors[String(blockIndex)];
              return (
                <div
                  key={`block-${blockIndex}`}
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
                    <button type="button" onClick={() => removeBlock(blockIndex)}>
                      Rimuovi blocco
                    </button>
                  </div>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Nome blocco *</span>
                    <input
                      value={block.name}
                      onChange={(e) => updateBlock(blockIndex, { name: e.target.value })}
                    />
                  </label>
                  {blockError ? <p style={{ color: "#b00020" }}>{blockError}</p> : null}

                  {block.rows.map((row, rowIndex) => {
                    const rowKey = getRowKey(blockIndex, rowIndex);
                    const selected = exercisesById[row.exerciseId];
                    const suggestions = searchResults[rowKey] ?? [];
                    const searchLoading = !!searchLoadingByKey[rowKey];
                    const searchError = searchErrorByKey[rowKey] ?? "";
                    const searchActive = row.exerciseSearch.trim().length >= 2;
                    const showNoResults =
                      searchActive &&
                      !searchLoading &&
                      suggestions.length === 0 &&
                      !searchError &&
                      !selected;
                    const rowError = rowErrors[rowKey];
                    const isRun = selected?.category === "RUN";
                    const returnTo = isNew && draftId
                      ? `/coach/assigned-sessions/new?draft=${draftId}`
                      : currentUrl;
                    const newExerciseUrl = `/coach/exercises?name=${encodeURIComponent(
                      row.exerciseSearch.trim()
                    )}&returnTo=${encodeURIComponent(returnTo)}`;
                    return (
                      <div
                        key={`row-${blockIndex}-${rowIndex}`}
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
                            onClick={() => removeRow(blockIndex, rowIndex)}
                          >
                            Rimuovi
                          </button>
                        </div>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span>Seleziona esercizio</span>
                          <select
                            value={row.exerciseId}
                            onChange={(e) => {
                              const nextId = e.target.value;
                              const nextExercise = exercisesById[nextId];
                              updateRow(blockIndex, rowIndex, {
                                exerciseId: nextId,
                                exerciseSearch: nextExercise?.name ?? "",
                              });
                              const key = getRowKey(blockIndex, rowIndex);
                              setSearchResults((prev) => ({ ...prev, [key]: [] }));
                              setSearchLoadingByKey((prev) => ({ ...prev, [key]: false }));
                              setSearchErrorByKey((prev) => ({ ...prev, [key]: "" }));
                            }}
                          >
                            <option value="">Seleziona...</option>
                            {groupedExercises.map((group) => (
                              <optgroup key={group.label} label={group.label}>
                                {group.items.map((ex) => (
                                  <option key={ex.exerciseId} value={ex.exerciseId}>
                                    {ex.name}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span>Cerca esercizio</span>
                          <input
                            value={row.exerciseSearch}
                            onChange={(e) =>
                              handleExerciseSearchChange(
                                blockIndex,
                                rowIndex,
                                e.target.value
                              )
                            }
                            placeholder="Cerca esercizio..."
                          />
                        </label>

                        {searchLoading ? <p>Ricerca in corso...</p> : null}
                        {searchError ? <p>Errore: {searchError}</p> : null}
                        {showNoResults ? <p>Nessun risultato.</p> : null}

                        {searchActive && suggestions.length > 0 ? (
                          <div
                            style={{
                              display: "grid",
                              gap: 6,
                              padding: 8,
                              borderRadius: 10,
                              border: "1px solid #eee",
                              background: "#fafafa",
                            }}
                          >
                            {suggestions.map((ex) => (
                              <button
                                key={ex.exerciseId}
                                type="button"
                                onClick={() =>
                                  handleExerciseSelect(blockIndex, rowIndex, ex)
                                }
                                style={{
                                  textAlign: "left",
                                  padding: "6px 8px",
                                  borderRadius: 8,
                                  border: "1px solid #ddd",
                                  background: "#fff",
                                }}
                              >
                                {ex.name}
                              </button>
                            ))}
                          </div>
                        ) : null}

                        <div style={{ display: "grid", gap: 6 }}>
                          <span>Esercizio *</span>
                          <div
                            style={{
                              padding: "8px 10px",
                              borderRadius: 10,
                              border: "1px solid #ddd",
                              background: "#fff",
                            }}
                          >
                            {selected?.name ||
                              row.exerciseSearch ||
                              "Nessun esercizio selezionato"}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <Link
                            href={newExerciseUrl}
                            style={{ textDecoration: "underline" }}
                            onClick={(e) => {
                              e.preventDefault();
                              handleOpenExercises(newExerciseUrl);
                            }}
                          >
                            + Nuovo esercizio
                          </Link>
                        </div>

                        {isRun ? (
                          <>
                            <div
                              style={{
                                display: "grid",
                                gap: 8,
                                gridTemplateColumns: "1fr 1fr",
                              }}
                            >
                              <label style={{ display: "grid", gap: 6 }}>
                                <span>Durata (min)</span>
                                <input
                                  value={row.runDuration}
                                  onChange={(e) =>
                                    updateRow(blockIndex, rowIndex, {
                                      runDuration: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label style={{ display: "grid", gap: 6 }}>
                                <span>Distanza (km)</span>
                                <input
                                  value={row.runDistance}
                                  onChange={(e) =>
                                    updateRow(blockIndex, rowIndex, {
                                      runDistance: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label style={{ display: "grid", gap: 6 }}>
                                <span>Passo (min/km)</span>
                                <input
                                  value={row.runPace}
                                  onChange={(e) =>
                                    updateRow(blockIndex, rowIndex, {
                                      runPace: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label style={{ display: "grid", gap: 6 }}>
                                <span>Zona FC</span>
                                <input
                                  value={row.runHr}
                                  onChange={(e) =>
                                    updateRow(blockIndex, rowIndex, {
                                      runHr: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label style={{ display: "grid", gap: 6 }}>
                                <span>RPE</span>
                                <input
                                  value={row.runRpe}
                                  onChange={(e) =>
                                    updateRow(blockIndex, rowIndex, {
                                      runRpe: e.target.value,
                                    })
                                  }
                                />
                              </label>
                            </div>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span>Note</span>
                              <textarea
                                value={row.runNote}
                                onChange={(e) =>
                                  updateRow(blockIndex, rowIndex, {
                                    runNote: e.target.value,
                                  })
                                }
                              />
                            </label>
                          </>
                        ) : (
                          <>
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
                                    updateRow(blockIndex, rowIndex, { sets: e.target.value })
                                  }
                                />
                              </label>
                              <label style={{ display: "grid", gap: 6 }}>
                                <span>Reps</span>
                                <input
                                  value={row.reps}
                                  onChange={(e) =>
                                    updateRow(blockIndex, rowIndex, { reps: e.target.value })
                                  }
                                />
                              </label>
                              <label style={{ display: "grid", gap: 6 }}>
                                <span>Rest</span>
                                <input
                                  value={row.rest}
                                  onChange={(e) =>
                                    updateRow(blockIndex, rowIndex, { rest: e.target.value })
                                  }
                                />
                              </label>
                              <label style={{ display: "grid", gap: 6 }}>
                                <span>%</span>
                                <input
                                  value={row.percent}
                                  onChange={(e) =>
                                    updateRow(blockIndex, rowIndex, {
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
                                    updateRow(blockIndex, rowIndex, { kg: e.target.value })
                                  }
                                />
                              </label>
                            </div>

                            <label style={{ display: "grid", gap: 6 }}>
                              <span>Note pubbliche</span>
                              <textarea
                                value={row.notesPublic}
                                onChange={(e) =>
                                  updateRow(blockIndex, rowIndex, {
                                    notesPublic: e.target.value,
                                  })
                                }
                              />
                            </label>
                          </>
                        )}

                        <label style={{ display: "grid", gap: 6 }}>
                          <span>Nota coach (privata)</span>
                          <textarea
                            value={row.notesPrivate}
                            onChange={(e) =>
                              updateRow(blockIndex, rowIndex, {
                                notesPrivate: e.target.value,
                              })
                            }
                          />
                        </label>
                        {rowError ? <p style={{ color: "#b00020" }}>{rowError}</p> : null}
                      </div>
                    );
                  })}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => addRow(blockIndex)}>
                      + Esercizio
                    </button>
                    <button type="button" onClick={() => addBlockAfter(blockIndex)}>
                      + Blocco sotto
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <strong>Titolo</strong>
              <div>{detail?.title || form.title || "—"}</div>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <strong>Data sessione</strong>
              <div>{formatDate(detail?.sessionDate ?? form.sessionDate) || "—"}</div>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <strong>Note pubbliche</strong>
              <div>{detail?.notesPublic || "—"}</div>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <strong>Note private</strong>
              <div>{detail?.notesPrivate || "—"}</div>
            </div>

            <div className="space-y-6">
              {(detail?.blocks ?? []).map((block, blockIndex) => {
                const renderBlockTable = (rows: typeof block.rows) => (
                  <div className="overflow-x-auto -mx-2 px-2">
                    <table className="min-w-[1300px] w-full border-collapse table-fixed text-sm leading-6">
                      <colgroup>
                        <col style={{ width: "220px" }} />
                        <col style={{ width: "80px" }} />
                        <col style={{ width: "90px" }} />
                        <col style={{ width: "110px" }} />
                        <col style={{ width: "110px" }} />
                        <col style={{ width: "110px" }} />
                        <col style={{ width: "80px" }} />
                        <col style={{ width: "80px" }} />
                        <col style={{ width: "80px" }} />
                        <col style={{ width: "110px" }} />
                        <col style={{ width: "70px" }} />
                        <col style={{ width: "90px" }} />
                        <col style={{ width: "220px" }} />
                        <col style={{ width: "220px" }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold whitespace-nowrap">
                            Esercizio
                          </th>
                          <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold whitespace-nowrap">
                            Tipo
                          </th>
                          <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold whitespace-nowrap">
                            Durata
                          </th>
                          <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold whitespace-nowrap">
                            Distanza
                          </th>
                          <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold whitespace-nowrap">
                            Passo
                          </th>
                          <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold whitespace-nowrap">
                            Zona FC
                          </th>
                          <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold whitespace-nowrap">
                            RPE
                          </th>
                          <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold whitespace-nowrap">
                            Set
                          </th>
                          <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold whitespace-nowrap">
                            Reps
                          </th>
                          <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold whitespace-nowrap">
                            Rest
                          </th>
                          <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold whitespace-nowrap">
                            %
                          </th>
                          <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold whitespace-nowrap">
                            Kg
                          </th>
                          <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold whitespace-nowrap">
                            Note
                          </th>
                          <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold whitespace-nowrap">
                            Nota coach
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, rowIndex) => {
                          const ex = exercisesById[row.exerciseId];
                          const runNotes = parseRunNotes(row.notesPublic ?? null);
                          const isRun = !!runNotes;
                          return (
                            <tr key={row.rowId} className="even:bg-slate-50/50">
                              <td className="border border-slate-300 px-3 py-2 align-top">
                                {rowIndex + 1}. {ex?.name || row.exerciseId}
                              </td>
                              <td className="border border-slate-300 px-3 py-2 align-top text-center whitespace-nowrap">
                                {isRun ? "RUN" : "FORZA"}
                              </td>
                              <td className="border border-slate-300 px-3 py-2 align-top text-center whitespace-nowrap">
                                {runNotes?.duration || "—"}
                              </td>
                              <td className="border border-slate-300 px-3 py-2 align-top text-center whitespace-nowrap">
                                {runNotes?.distance || "—"}
                              </td>
                              <td className="border border-slate-300 px-3 py-2 align-top text-center whitespace-nowrap">
                                {runNotes?.pace || "—"}
                              </td>
                              <td className="border border-slate-300 px-3 py-2 align-top text-center whitespace-nowrap">
                                {runNotes?.hr || "—"}
                              </td>
                              <td className="border border-slate-300 px-3 py-2 align-top text-center whitespace-nowrap">
                                {runNotes?.rpe || "—"}
                              </td>
                              <td className="border border-slate-300 px-3 py-2 align-top text-center whitespace-nowrap">
                                {row.sets || "—"}
                              </td>
                              <td className="border border-slate-300 px-3 py-2 align-top text-center whitespace-nowrap">
                                {row.reps || "—"}
                              </td>
                              <td className="border border-slate-300 px-3 py-2 align-top text-center whitespace-nowrap">
                                {row.rest || "—"}
                              </td>
                              <td className="border border-slate-300 px-3 py-2 align-top text-center whitespace-nowrap">
                                {row.percent || "—"}
                              </td>
                              <td className="border border-slate-300 px-3 py-2 align-top text-center whitespace-nowrap">
                                {row.kg || "—"}
                              </td>
                              <td className="border border-slate-300 px-3 py-2 align-top whitespace-pre-wrap break-words">
                                {(runNotes?.note || row.notesPublic) || "—"}
                              </td>
                              <td className="border border-slate-300 px-3 py-2 align-top whitespace-pre-wrap break-words">
                                {row.notesPrivate || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );


                return (
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
                      Blocco {blockIndex + 1}: {block.name}
                    </strong>
                    <div className="space-y-4">
                      {renderBlockTable(block.rows)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isEditMode ? (
          <div
            style={{
              position: "sticky",
              bottom: 0,
              zIndex: 2,
              background: "#fff",
              padding: "8px 0",
              borderTop: "1px solid #eee",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button type="button" onClick={handleCancelEdit} disabled={saving || loading}>
              Annulla
            </button>
            <button type="button" onClick={handleSave} disabled={saving || loading}>
              {saving ? "Salvo..." : isNew ? "Crea sessione" : "Salva sessione"}
            </button>
            <button type="button" onClick={addBlock} disabled={saving || loading}>
              + Blocco
            </button>
          </div>
        ) : null}

        {saveError ? <p>Errore: {saveError}</p> : null}
      </section>
    </main>
  );
}
