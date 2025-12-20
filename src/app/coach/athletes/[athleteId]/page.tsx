'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react';

function asString(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function asBool(v: unknown): boolean {
  return v === true;
}

function toDateInputValue(v: string | null | undefined): string {
  return typeof v === 'string' && v.length >= 10 ? v.slice(0, 10) : '';
}

function parseDateInputValue(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;

  if (e && typeof e === 'object') {
    const rec = e as Record<string, unknown>;
    const msg = rec['message'];
    if (typeof msg === 'string' && msg.trim()) return msg;
  }

  return 'Errore sconosciuto';
}

type AthleteRow = {
  athleteId: string;
  firstName: string;
  lastName: string;
  notesPublic?: string | null;
  activatedAt?: string | null;
};

const COMPETITION_TYPES = ['HYROX', 'CROSSFIT', 'RUN', 'ALTRO'] as const;
type CompetitionType = (typeof COMPETITION_TYPES)[number];

const COMPETITION_STATUSES = ['PLANNED', 'DONE', 'CANCELLED'] as const;
type CompetitionStatus = (typeof COMPETITION_STATUSES)[number];

type CompetitionRow = {
  competitionId: string;
  athleteId: string;
  name: string;
  dateStart: string;
  dateEnd?: string | null;
  location?: string | null;
  link?: string | null;
  notesPublic: string;
  notesPrivate: string;
  status: CompetitionStatus;
  type: CompetitionType;
  isTarget: boolean;
};

type CompetitionForm = {
  name: string;
  type: CompetitionType;
  dateStart: string;
  dateEnd: string;
  location: string;
  link: string;
  status: CompetitionStatus;
  notesPublic: string;
  notesPrivate: string;
  isTarget: boolean;
};

function createEmptyCompetitionForm(): CompetitionForm {
  return {
    name: '',
    type: 'ALTRO',
    dateStart: '',
    dateEnd: '',
    location: '',
    link: '',
    status: 'PLANNED',
    notesPublic: '',
    notesPrivate: '',
    isTarget: false,
  };
}

function normalizeCompetition(value: unknown): CompetitionRow | null {
  if (!value || typeof value !== 'object') return null;
  const rec = value as Record<string, unknown>;

  const competitionId = asString(rec['competitionId']);
  const athleteId = asString(rec['athleteId']);
  const name = asString(rec['name']);
  const dateStart = asString(rec['dateStart']);
  const status = asString(rec['status']);
  const type = asString(rec['type']);

  if (!competitionId || !athleteId || !name || !dateStart) return null;
  if (!COMPETITION_STATUSES.includes(status as CompetitionStatus)) return null;
  if (!COMPETITION_TYPES.includes(type as CompetitionType)) return null;

  return {
    competitionId,
    athleteId,
    name,
    dateStart,
    dateEnd: asString(rec['dateEnd']) || null,
    location: asString(rec['location']) || null,
    link: asString(rec['link']) || null,
    notesPublic: asString(rec['notesPublic']),
    notesPrivate: asString(rec['notesPrivate']),
    status: status as CompetitionStatus,
    type: type as CompetitionType,
    isTarget: asBool(rec['isTarget']),
  };
}

export default function AthleteDetailPage() {
  const params = useParams<{ athleteId: string | string[] }>();
  const athleteId = Array.isArray(params.athleteId)
    ? params.athleteId[0]
    : params.athleteId;

  const [list, setList] = useState<AthleteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');

  const [competitions, setCompetitions] = useState<CompetitionRow[]>([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(false);
  const [competitionsErr, setCompetitionsErr] = useState<string>('');

  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<CompetitionForm>(createEmptyCompetitionForm);
  const [newFormErr, setNewFormErr] = useState<string>('');
  const [newFormBusy, setNewFormBusy] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CompetitionForm>(createEmptyCompetitionForm);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [rowErr, setRowErr] = useState<string>('');

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr('');
      try {
        const r = await fetch('/api/coach/athletes', { cache: 'no-store' });
        const data = await r.json().catch(() => null);

        if (!r.ok) {
          const msg =
            (data && (data.error || data.message)) ||
            `Errore caricamento atleti (${r.status})`;
          throw new Error(msg);
        }

        const arr = Array.isArray(data) ? data : data?.athletes;
        if (!Array.isArray(arr)) throw new Error('Risposta atleti non valida.');

        const normalized: AthleteRow[] = arr
          .map((o: unknown) => {
            const rec =
              o && typeof o === 'object'
                ? (o as Record<string, unknown>)
                : {};

            const athleteId = asString(rec['athleteId']);
            const firstName = asString(rec['firstName']);
            const lastName = asString(rec['lastName']);

            if (!athleteId || !firstName || !lastName) return null;

            const notesPublic = asString(rec['notesPublic']);
            const activatedAt = asString(rec['activatedAt']);

            return {
              athleteId,
              firstName,
              lastName,
              notesPublic: notesPublic || null,
              activatedAt: activatedAt || null,
            };
          })
          .filter(Boolean) as AthleteRow[];

        if (alive) setList(normalized);
      } catch (e: unknown) {
        setErr(errorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadCompetitions() {
      if (!athleteId) return;
      setCompetitionsLoading(true);
      setCompetitionsErr('');
      try {
        const r = await fetch(`/api/coach/athletes/${athleteId}/competitions`, {
          cache: 'no-store',
        });
        const data = await r.json().catch(() => null);

        if (!r.ok) {
          const msg =
            (data && (data.error || data.message)) ||
            `Errore caricamento gare (${r.status})`;
          throw new Error(msg);
        }

        if (!Array.isArray(data)) throw new Error('Risposta gare non valida.');

        const normalized = data
          .map((row: unknown) => normalizeCompetition(row))
          .filter(Boolean) as CompetitionRow[];

        if (alive) setCompetitions(normalized);
      } catch (e: unknown) {
        if (alive) setCompetitionsErr(errorMessage(e));
      } finally {
        if (alive) setCompetitionsLoading(false);
      }
    }

    loadCompetitions();

    return () => {
      alive = false;
    };
  }, [athleteId]);

  async function reloadCompetitions() {
    if (!athleteId) return;
    setCompetitionsLoading(true);
    setCompetitionsErr('');
    try {
      const r = await fetch(`/api/coach/athletes/${athleteId}/competitions`, {
        cache: 'no-store',
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore caricamento gare (${r.status})`;
        throw new Error(msg);
      }
      if (!Array.isArray(data)) throw new Error('Risposta gare non valida.');
      const normalized = data
        .map((row: unknown) => normalizeCompetition(row))
        .filter(Boolean) as CompetitionRow[];
      setCompetitions(normalized);
    } catch (e: unknown) {
      setCompetitionsErr(errorMessage(e));
    } finally {
      setCompetitionsLoading(false);
    }
  }

  function validateCompetitionForm(form: CompetitionForm): string | null {
    if (!form.name.trim()) return 'Nome obbligatorio.';
    if (!form.dateStart) return 'Data inizio obbligatoria.';
    const start = parseDateInputValue(form.dateStart);
    if (!start) return 'Data inizio non valida.';
    if (form.dateEnd) {
      const end = parseDateInputValue(form.dateEnd);
      if (!end) return 'Data fine non valida.';
      if (end < start) return 'Data fine deve essere >= data inizio.';
    }
    return null;
  }

  async function handleAddCompetition(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNewFormErr('');
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
        dateStart: newForm.dateStart,
        dateEnd: newForm.dateEnd || null,
        location: newForm.location.trim() || null,
        link: newForm.link.trim() || null,
        status: newForm.status,
        notesPublic: newForm.notesPublic,
        notesPrivate: newForm.notesPrivate,
        isTarget: newForm.isTarget,
      };

      const r = await fetch(`/api/coach/athletes/${athleteId}/competitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore creazione gara (${r.status})`;
        throw new Error(msg);
      }

      setNewForm(createEmptyCompetitionForm());
      setShowNewForm(false);
      await reloadCompetitions();
    } catch (e: unknown) {
      setNewFormErr(errorMessage(e));
    } finally {
      setNewFormBusy(false);
    }
  }

  function startEdit(row: CompetitionRow) {
    setEditId(row.competitionId);
    setRowErr('');
    setEditForm({
      name: row.name,
      type: row.type,
      dateStart: toDateInputValue(row.dateStart),
      dateEnd: toDateInputValue(row.dateEnd),
      location: row.location ?? '',
      link: row.link ?? '',
      status: row.status,
      notesPublic: row.notesPublic ?? '',
      notesPrivate: row.notesPrivate ?? '',
      isTarget: row.isTarget,
    });
  }

  function cancelEdit() {
    setEditId(null);
  }

  async function handleSaveCompetition(competitionId: string) {
    setRowErr('');
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
        dateStart: editForm.dateStart,
        dateEnd: editForm.dateEnd || '',
        location: editForm.location.trim(),
        link: editForm.link.trim(),
        status: editForm.status,
        notesPublic: editForm.notesPublic,
        notesPrivate: editForm.notesPrivate,
        isTarget: editForm.isTarget,
      };

      const r = await fetch(
        `/api/coach/athletes/${athleteId}/competitions/${competitionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore aggiornamento gara (${r.status})`;
        throw new Error(msg);
      }
      setEditId(null);
      await reloadCompetitions();
    } catch (e: unknown) {
      setRowErr(errorMessage(e));
    } finally {
      setRowBusyId(null);
    }
  }

  async function handleDeleteCompetition(competitionId: string) {
    if (!confirm('Eliminare questa gara?')) return;
    setRowErr('');
    setRowBusyId(competitionId);
    try {
      const r = await fetch(
        `/api/coach/athletes/${athleteId}/competitions/${competitionId}`,
        { method: 'DELETE' }
      );
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore eliminazione gara (${r.status})`;
        throw new Error(msg);
      }
      await reloadCompetitions();
    } catch (e: unknown) {
      setRowErr(errorMessage(e));
    } finally {
      setRowBusyId(null);
    }
  }

  async function handleToggleTarget(competitionId: string, nextValue: boolean) {
    setRowErr('');
    setRowBusyId(competitionId);
    try {
      const r = await fetch(
        `/api/coach/athletes/${athleteId}/competitions/${competitionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isTarget: nextValue }),
        }
      );
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore aggiornamento obiettivo (${r.status})`;
        throw new Error(msg);
      }
      await reloadCompetitions();
    } catch (e: unknown) {
      setRowErr(errorMessage(e));
    } finally {
      setRowBusyId(null);
    }
  }

  const athlete = useMemo(
    () => list.find((a) => a.athleteId === athleteId) || null,
    [list, athleteId]
  );

  return (
    <main style={{ padding: 16, display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link href="/coach" style={{ textDecoration: 'underline' }}>
          ← Torna alla lista atleti
        </Link>
      </div>

      <section style={{ padding: 12, border: '1px solid #ddd', borderRadius: 10 }}>
        <h1 style={{ margin: 0 }}>Scheda atleta</h1>

        {loading ? (
          <p style={{ marginTop: 8 }}>Caricamento…</p>
        ) : err ? (
          <p style={{ marginTop: 8 }}>Errore: {err}</p>
        ) : athlete ? (
          <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
            <div>
              <strong>Nome:</strong> {athlete.firstName} {athlete.lastName}
            </div>
            <div>
              <strong>Stato:</strong> {athlete.activatedAt ? 'ATTIVO' : 'NON ATTIVO'}
            </div>
            <div>
              <strong>ID:</strong> <code>{athlete.athleteId}</code>
            </div>
          </div>
        ) : (
          <p style={{ marginTop: 8 }}>
            Atleta non trovato (ID: <code>{athleteId}</code>)
          </p>
        )}
      </section>

      <section style={{ padding: 12, border: '1px solid #ddd', borderRadius: 10 }}>
        <h2 style={{ margin: 0 }}>Gare</h2>
        {competitionsLoading ? (
          <p style={{ marginTop: 8 }}>Caricamento gare...</p>
        ) : competitionsErr ? (
          <p style={{ marginTop: 8 }}>Errore: {competitionsErr}</p>
        ) : competitions.length === 0 ? (
          <p style={{ marginTop: 8 }}>Nessuna gara ancora.</p>
        ) : null}

        {rowErr ? <p style={{ marginTop: 8 }}>Errore: {rowErr}</p> : null}

        <div style={{ marginTop: 12, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                  Nome
                </th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                  Tipo
                </th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                  Data
                </th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                  Stato
                </th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                  Obiettivo
                </th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody>
              {competitions.map((c) => {
                const startLabel = toDateInputValue(c.dateStart);
                const endLabel = toDateInputValue(c.dateEnd);
                const dateLabel = endLabel ? `${startLabel} → ${endLabel}` : startLabel;
                const busy = rowBusyId === c.competitionId;
                return (
                  <Fragment key={c.competitionId}>
                    <tr>
                      <td style={{ padding: '6px 4px' }}>{c.name}</td>
                      <td style={{ padding: '6px 4px' }}>{c.type}</td>
                      <td style={{ padding: '6px 4px' }}>{dateLabel}</td>
                      <td style={{ padding: '6px 4px' }}>{c.status}</td>
                      <td style={{ padding: '6px 4px' }}>
                        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={c.isTarget}
                            disabled={busy}
                            onChange={(e) =>
                              handleToggleTarget(c.competitionId, e.target.checked)
                            }
                          />
                          {c.isTarget ? '✅ OBIETTIVO' : ''}
                        </label>
                      </td>
                      <td style={{ padding: '6px 4px', display: 'flex', gap: 8 }}>
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
                    {editId === c.competitionId ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '8px 4px' }}>
                          <div style={{ display: 'grid', gap: 8 }}>
                            <div style={{ display: 'grid', gap: 6 }}>
                              <label>
                                Nome *
                                <input
                                  type="text"
                                  value={editForm.name}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      name: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                Tipo
                                <select
                                  value={editForm.type}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      type: e.target.value as CompetitionType,
                                    }))
                                  }
                                >
                                  {COMPETITION_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Data inizio *
                                <input
                                  type="date"
                                  value={editForm.dateStart}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      dateStart: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                Data fine
                                <input
                                  type="date"
                                  value={editForm.dateEnd}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      dateEnd: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                Luogo
                                <input
                                  type="text"
                                  value={editForm.location}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      location: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                Link
                                <input
                                  type="url"
                                  value={editForm.link}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      link: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                Stato
                                <select
                                  value={editForm.status}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      status: e.target.value as CompetitionStatus,
                                    }))
                                  }
                                >
                                  {COMPETITION_STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Note pubbliche
                                <textarea
                                  value={editForm.notesPublic}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      notesPublic: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                Note private
                                <textarea
                                  value={editForm.notesPrivate}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      notesPrivate: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={editForm.isTarget}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      isTarget: e.target.checked,
                                    }))
                                  }
                                />
                                Gara obiettivo
                              </label>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12 }}>
          {!showNewForm ? (
            <button type="button" onClick={() => setShowNewForm(true)}>
              Aggiungi gara
            </button>
          ) : (
            <form onSubmit={handleAddCompetition} style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <label>
                  Nome *
                  <input
                    type="text"
                    value={newForm.name}
                    onChange={(e) =>
                      setNewForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Tipo
                  <select
                    value={newForm.type}
                    onChange={(e) =>
                      setNewForm((prev) => ({
                        ...prev,
                        type: e.target.value as CompetitionType,
                      }))
                    }
                  >
                    {COMPETITION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Data inizio *
                  <input
                    type="date"
                    value={newForm.dateStart}
                    onChange={(e) =>
                      setNewForm((prev) => ({ ...prev, dateStart: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Data fine
                  <input
                    type="date"
                    value={newForm.dateEnd}
                    onChange={(e) =>
                      setNewForm((prev) => ({ ...prev, dateEnd: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Luogo
                  <input
                    type="text"
                    value={newForm.location}
                    onChange={(e) =>
                      setNewForm((prev) => ({ ...prev, location: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Link
                  <input
                    type="url"
                    value={newForm.link}
                    onChange={(e) =>
                      setNewForm((prev) => ({ ...prev, link: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Stato
                  <select
                    value={newForm.status}
                    onChange={(e) =>
                      setNewForm((prev) => ({
                        ...prev,
                        status: e.target.value as CompetitionStatus,
                      }))
                    }
                  >
                    {COMPETITION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Note pubbliche
                  <textarea
                    value={newForm.notesPublic}
                    onChange={(e) =>
                      setNewForm((prev) => ({ ...prev, notesPublic: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Note private
                  <textarea
                    value={newForm.notesPrivate}
                    onChange={(e) =>
                      setNewForm((prev) => ({ ...prev, notesPrivate: e.target.value }))
                    }
                  />
                </label>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={newForm.isTarget}
                    onChange={(e) =>
                      setNewForm((prev) => ({ ...prev, isTarget: e.target.checked }))
                    }
                  />
                  Gara obiettivo
                </label>
              </div>

              {newFormErr ? <p>Errore: {newFormErr}</p> : null}

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={newFormBusy}>
                  Aggiungi
                </button>
                <button
                  type="button"
                  disabled={newFormBusy}
                  onClick={() => {
                    setShowNewForm(false);
                    setNewFormErr('');
                    setNewForm(createEmptyCompetitionForm());
                  }}
                >
                  Annulla
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      <section style={{ padding: 12, border: '1px solid #ddd', borderRadius: 10 }}>
        <h2 style={{ margin: 0 }}>Eventi</h2>
        <p style={{ marginTop: 8 }}>In arrivo: lista + aggiungi/modifica/elimina.</p>
      </section>
    </main>
  );
}
