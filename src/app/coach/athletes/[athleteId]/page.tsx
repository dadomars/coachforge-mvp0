'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  formatStatusItUpper,
  formatTypeUpper,
  titleCaseIt,
} from '@/lib/ui/formatters';

function asString(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function asBool(v: unknown): boolean {
  return v === true;
}

function toDateInputValue(v: string | null | undefined): string {
  return typeof v === 'string' && v.length >= 10 ? v.slice(0, 10) : '';
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

const COMPETITION_STATUSES = ['PLANNED', 'DONE', 'CANCELLED'] as const;
type CompetitionStatus = (typeof COMPETITION_STATUSES)[number];

type CompetitionType = 'HYROX' | 'CROSSFIT' | 'RUN' | 'ALTRO';

type CompetitionLibraryRow = {
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

type CompetitionAssignmentRow = {
  assignmentId: string;
  isTarget: boolean;
  assignedAt: string;
  competition: CompetitionLibraryRow;
};

type EventStatus = 'PLANNED' | 'DONE' | 'CANCELLED';

type EventLibraryRow = {
  eventId: string;
  name: string;
  dateStart: string;
  dateEnd?: string | null;
  location?: string | null;
  link?: string | null;
  notesPublic: string;
  notesPrivate: string;
  status: EventStatus;
  typeLabel: string;
};

type EventAssignmentRow = {
  assignmentId: string;
  eventId: string;
  assignedAt: string;
};

function normalizeCompetition(value: unknown): CompetitionLibraryRow | null {
  if (!value || typeof value !== 'object') return null;
  const rec = value as Record<string, unknown>;

  const competitionId = asString(rec['competitionId']);
  const name = asString(rec['name']);
  const dateStart = asString(rec['dateStart']);
  const status = asString(rec['status']);
  const type = asString(rec['type']);

  if (!competitionId || !name || !dateStart) return null;
  if (!COMPETITION_STATUSES.includes(status as CompetitionStatus)) return null;
  if (!['HYROX', 'CROSSFIT', 'RUN', 'ALTRO'].includes(type)) return null;

  return {
    competitionId,
    name,
    dateStart,
    dateEnd: asString(rec['dateEnd']) || null,
    location: asString(rec['location']) || null,
    link: asString(rec['link']) || null,
    notesPublic: asString(rec['notesPublic']),
    notesPrivate: asString(rec['notesPrivate']),
    status: status as CompetitionStatus,
    type: type as CompetitionType,
  };
}

function normalizeAssignment(value: unknown): CompetitionAssignmentRow | null {
  if (!value || typeof value !== 'object') return null;
  const rec = value as Record<string, unknown>;
  const assignmentId = asString(rec['id']) || asString(rec['assignmentId']);
  const assignedAt = asString(rec['assignedAt']);
  const competition = normalizeCompetition(rec['competition']);

  if (!assignmentId || !assignedAt || !competition) return null;

  return {
    assignmentId,
    isTarget: asBool(rec['isTarget']),
    assignedAt,
    competition,
  };
}

function normalizeEvent(value: unknown): EventLibraryRow | null {
  if (!value || typeof value !== 'object') return null;
  const rec = value as Record<string, unknown>;
  const eventId = asString(rec['eventId']);
  const name = asString(rec['name']);
  const dateStart = asString(rec['dateStart']);
  const status = asString(rec['status']);
  const typeLabel = asString(rec['typeLabel']);

  if (!eventId || !name || !dateStart) return null;
  if (!['PLANNED', 'DONE', 'CANCELLED'].includes(status)) return null;

  return {
    eventId,
    name,
    dateStart,
    dateEnd: asString(rec['dateEnd']) || null,
    location: asString(rec['location']) || null,
    link: asString(rec['link']) || null,
    notesPublic: asString(rec['notesPublic']),
    notesPrivate: asString(rec['notesPrivate']),
    status: status as EventStatus,
    typeLabel: typeLabel || 'ALTRO',
  };
}

function normalizeEventAssignment(value: unknown): EventAssignmentRow | null {
  if (!value || typeof value !== 'object') return null;
  const rec = value as Record<string, unknown>;
  const assignmentId = asString(rec['assignmentId']) || asString(rec['id']);
  const eventId = asString(rec['eventId']);
  const assignedAt = asString(rec['assignedAt']);
  if (!assignmentId || !eventId || !assignedAt) return null;
  return { assignmentId, eventId, assignedAt };
}
export default function AthleteDetailPage() {
  const params = useParams<{ athleteId: string | string[] }>();
  const athleteId = Array.isArray(params.athleteId)
    ? params.athleteId[0]
    : params.athleteId;

  const [list, setList] = useState<AthleteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');

  const [assignments, setAssignments] = useState<CompetitionAssignmentRow[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsErr, setAssignmentsErr] = useState<string>('');

  const [library, setLibrary] = useState<CompetitionLibraryRow[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryErr, setLibraryErr] = useState<string>('');

  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignCompetitionId, setAssignCompetitionId] = useState('');
  const [assignIsTarget, setAssignIsTarget] = useState(false);
  const [assignErr, setAssignErr] = useState<string>('');
  const [assignBusy, setAssignBusy] = useState(false);

  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [rowErr, setRowErr] = useState<string>('');

  const [events, setEvents] = useState<EventLibraryRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsErr, setEventsErr] = useState<string>('');
  const [eventAssignments, setEventAssignments] = useState<EventAssignmentRow[]>([]);
  const [eventAssignmentsLoading, setEventAssignmentsLoading] = useState(false);
  const [eventAssignmentsErr, setEventAssignmentsErr] = useState<string>('');
  const [eventAssignId, setEventAssignId] = useState('');
  const [eventAssignErr, setEventAssignErr] = useState<string>('');
  const [eventAssignBusy, setEventAssignBusy] = useState(false);
  const [eventRowBusyId, setEventRowBusyId] = useState<string | null>(null);

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

    async function loadAssignments() {
      if (!athleteId) return;
      setAssignmentsLoading(true);
      setAssignmentsErr('');
      try {
        const r = await fetch(
          `/api/coach/athletes/${athleteId}/competition-assignments`,
          { cache: 'no-store' }
        );
        const data = await r.json().catch(() => null);

        if (!r.ok) {
          const msg =
            (data && (data.error || data.message)) ||
            `Errore caricamento assegnazioni (${r.status})`;
          throw new Error(msg);
        }

        if (!Array.isArray(data))
          throw new Error('Risposta assegnazioni non valida.');

        const normalized = data
          .map((row: unknown) => normalizeAssignment(row))
          .filter(Boolean) as CompetitionAssignmentRow[];

        if (alive) setAssignments(normalized);
      } catch (e: unknown) {
        if (alive) setAssignmentsErr(errorMessage(e));
      } finally {
        if (alive) setAssignmentsLoading(false);
      }
    }

    loadAssignments();

    return () => {
      alive = false;
    };
  }, [athleteId]);

  useEffect(() => {
    let alive = true;

    async function loadLibrary() {
      setLibraryLoading(true);
      setLibraryErr('');
      try {
        const r = await fetch('/api/coach/competitions', { cache: 'no-store' });
        const data = await r.json().catch(() => null);

        if (!r.ok) {
          const msg =
            (data && (data.error || data.message)) ||
            `Errore caricamento libreria (${r.status})`;
          throw new Error(msg);
        }

        if (!Array.isArray(data)) throw new Error('Risposta libreria non valida.');

        const normalized = data
          .map((row: unknown) => normalizeCompetition(row))
          .filter(Boolean) as CompetitionLibraryRow[];

        if (alive) setLibrary(normalized);
      } catch (e: unknown) {
        if (alive) setLibraryErr(errorMessage(e));
      } finally {
        if (alive) setLibraryLoading(false);
      }
    }

    loadLibrary();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadEvents() {
      setEventsLoading(true);
      setEventsErr('');
      try {
        const r = await fetch('/api/coach/events', { cache: 'no-store' });
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          const msg =
            (data && (data.error || data.message)) ||
            `Errore caricamento eventi (${r.status})`;
          throw new Error(msg);
        }
        if (!Array.isArray(data)) throw new Error('Risposta eventi non valida.');
        const normalized = data
          .map((row: unknown) => normalizeEvent(row))
          .filter(Boolean) as EventLibraryRow[];
        if (alive) setEvents(normalized);
      } catch (e: unknown) {
        if (alive) setEventsErr(errorMessage(e));
      } finally {
        if (alive) setEventsLoading(false);
      }
    }

    loadEvents();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadEventAssignments() {
      if (!athleteId) return;
      setEventAssignmentsLoading(true);
      setEventAssignmentsErr('');
      try {
        const r = await fetch(
          `/api/coach/athletes/${athleteId}/event-assignments`,
          { cache: 'no-store' }
        );
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          const msg =
            (data && (data.error || data.message)) ||
            `Errore caricamento eventi assegnati (${r.status})`;
          throw new Error(msg);
        }
        if (!Array.isArray(data))
          throw new Error('Risposta eventi assegnati non valida.');
        const normalized = data
          .map((row: unknown) => normalizeEventAssignment(row))
          .filter(Boolean) as EventAssignmentRow[];
        if (alive) setEventAssignments(normalized);
      } catch (e: unknown) {
        if (alive) setEventAssignmentsErr(errorMessage(e));
      } finally {
        if (alive) setEventAssignmentsLoading(false);
      }
    }

    loadEventAssignments();
    return () => {
      alive = false;
    };
  }, [athleteId]);

  async function reloadAssignments() {
    if (!athleteId) return;
    setAssignmentsLoading(true);
    setAssignmentsErr('');
    try {
      const r = await fetch(
        `/api/coach/athletes/${athleteId}/competition-assignments`,
        { cache: 'no-store' }
      );
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore caricamento assegnazioni (${r.status})`;
        throw new Error(msg);
      }
      if (!Array.isArray(data))
        throw new Error('Risposta assegnazioni non valida.');
      const normalized = data
        .map((row: unknown) => normalizeAssignment(row))
        .filter(Boolean) as CompetitionAssignmentRow[];
      setAssignments(normalized);
    } catch (e: unknown) {
      setAssignmentsErr(errorMessage(e));
    } finally {
      setAssignmentsLoading(false);
    }
  }

  async function reloadEventAssignments() {
    if (!athleteId) return;
    setEventAssignmentsLoading(true);
    setEventAssignmentsErr('');
    try {
      const r = await fetch(
        `/api/coach/athletes/${athleteId}/event-assignments`,
        { cache: 'no-store' }
      );
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore caricamento eventi assegnati (${r.status})`;
        throw new Error(msg);
      }
      if (!Array.isArray(data))
        throw new Error('Risposta eventi assegnati non valida.');
      const normalized = data
        .map((row: unknown) => normalizeEventAssignment(row))
        .filter(Boolean) as EventAssignmentRow[];
      setEventAssignments(normalized);
    } catch (e: unknown) {
      setEventAssignmentsErr(errorMessage(e));
    } finally {
      setEventAssignmentsLoading(false);
    }
  }

  async function handleAssignCompetition(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAssignErr('');
    if (!assignCompetitionId) {
      setAssignErr('Seleziona una gara.');
      return;
    }

    setAssignBusy(true);
    try {
      const payload = {
        competitionId: assignCompetitionId,
        isTarget: assignIsTarget,
      };

      const r = await fetch(
        `/api/coach/athletes/${athleteId}/competition-assignments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore assegnazione gara (${r.status})`;
        throw new Error(msg);
      }

      setAssignCompetitionId('');
      setAssignIsTarget(false);
      setShowAssignForm(false);
      await reloadAssignments();
    } catch (e: unknown) {
      setAssignErr(errorMessage(e));
    } finally {
      setAssignBusy(false);
    }
  }

  async function handleToggleTarget(assignmentId: string, nextValue: boolean) {
    setRowErr('');
    setRowBusyId(assignmentId);
    try {
      const r = await fetch(
        `/api/coach/athletes/${athleteId}/competition-assignments/${assignmentId}`,
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
      await reloadAssignments();
    } catch (e: unknown) {
      setRowErr(errorMessage(e));
    } finally {
      setRowBusyId(null);
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    if (!confirm('Rimuovere questa assegnazione?')) return;
    setRowErr('');
    setRowBusyId(assignmentId);
    try {
      const r = await fetch(
        `/api/coach/athletes/${athleteId}/competition-assignments/${assignmentId}`,
        { method: 'DELETE' }
      );
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore rimozione assegnazione (${r.status})`;
        throw new Error(msg);
      }
      await reloadAssignments();
    } catch (e: unknown) {
      setRowErr(errorMessage(e));
    } finally {
      setRowBusyId(null);
    }
  }

  async function handleAssignEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEventAssignErr('');
    if (!eventAssignId) {
      setEventAssignErr('Seleziona un evento.');
      return;
    }

    setEventAssignBusy(true);
    try {
      const r = await fetch(
        `/api/coach/athletes/${athleteId}/event-assignments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: eventAssignId }),
        }
      );
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore assegnazione evento (${r.status})`;
        throw new Error(msg);
      }
      setEventAssignId('');
      await reloadEventAssignments();
    } catch (e: unknown) {
      setEventAssignErr(errorMessage(e));
    } finally {
      setEventAssignBusy(false);
    }
  }

  async function handleRemoveEventAssignment(assignmentId: string) {
    if (!confirm('Rimuovere questo evento?')) return;
    setEventAssignmentsErr('');
    setEventRowBusyId(assignmentId);
    try {
      const r = await fetch(
        `/api/coach/athletes/${athleteId}/event-assignments/${assignmentId}`,
        { method: 'DELETE' }
      );
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore rimozione evento (${r.status})`;
        throw new Error(msg);
      }
      await reloadEventAssignments();
    } catch (e: unknown) {
      setEventAssignmentsErr(errorMessage(e));
    } finally {
      setEventRowBusyId(null);
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
        {assignmentsLoading ? (
          <p style={{ marginTop: 8 }}>Caricamento gare...</p>
        ) : assignmentsErr ? (
          <p style={{ marginTop: 8 }}>Errore: {assignmentsErr}</p>
        ) : assignments.length === 0 ? (
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
              {assignments.map((assignment) => {
                const c = assignment.competition;
                const startLabel = toDateInputValue(c.dateStart);
                const endLabel = toDateInputValue(c.dateEnd);
                const dateLabel = endLabel ? `${startLabel} - ${endLabel}` : startLabel;
                const busy = rowBusyId === assignment.assignmentId;
                return (
                  <Fragment key={assignment.assignmentId}>
                    <tr>
                      <td style={{ padding: '6px 4px' }}>{titleCaseIt(c.name)}</td>
                      <td style={{ padding: '6px 4px' }}>{formatTypeUpper(c.type)}</td>
                      <td style={{ padding: '6px 4px' }}>{dateLabel}</td>
                      <td style={{ padding: '6px 4px' }}>
                        {formatStatusItUpper(c.status)}
                      </td>
                      <td style={{ padding: '6px 4px' }}>{assignment.isTarget ? 'SI' : '-'}</td>
                      <td style={{ padding: '6px 4px', display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            handleToggleTarget(assignment.assignmentId, !assignment.isTarget)
                          }
                        >
                          {assignment.isTarget ? 'Rimuovi obiettivo' : 'Imposta obiettivo'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveAssignment(assignment.assignmentId)}
                          disabled={busy}
                        >
                          Rimuovi
                        </button>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12 }}>
          {!showAssignForm ? (
            <button type="button" onClick={() => setShowAssignForm(true)}>
              Assegna gara
            </button>
          ) : (
            <form onSubmit={handleAssignCompetition} style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <label>
                  Gara
                  <select
                    value={assignCompetitionId}
                    disabled={libraryLoading}
                    onChange={(e) => setAssignCompetitionId(e.target.value)}
                  >
                    <option value="">Seleziona gara</option>
                    {library.map((item) => (
                      <option key={item.competitionId} value={item.competitionId}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={assignIsTarget}
                    onChange={(e) => setAssignIsTarget(e.target.checked)}
                  />
                  Gara obiettivo
                </label>
              </div>

              {libraryLoading ? <p>Caricamento libreria...</p> : null}
              {libraryErr ? <p>Errore: {libraryErr}</p> : null}
              {assignErr ? <p>Errore: {assignErr}</p> : null}

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={assignBusy || libraryLoading}>
                  Assegna
                </button>
                <button
                  type="button"
                  disabled={assignBusy}
                  onClick={() => {
                    setShowAssignForm(false);
                    setAssignErr('');
                    setAssignCompetitionId('');
                    setAssignIsTarget(false);
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

        <div style={{ marginTop: 8 }}>
          <form onSubmit={handleAssignEvent} style={{ display: 'grid', gap: 8 }}>
            <label>
              Assegna evento
              <select
                value={eventAssignId}
                disabled={eventsLoading}
                onChange={(e) => setEventAssignId(e.target.value)}
              >
                <option value="">Seleziona evento</option>
                {events.map((ev) => (
                  <option key={ev.eventId} value={ev.eventId}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={eventAssignBusy || eventsLoading}>
                Assegna
              </button>
            </div>
            {eventsLoading ? <p>Caricamento eventi...</p> : null}
            {eventsErr ? <p>Errore: {eventsErr}</p> : null}
            {eventAssignErr ? <p>Errore: {eventAssignErr}</p> : null}
          </form>
        </div>

        <div style={{ marginTop: 12 }}>
          <h3 style={{ margin: 0 }}>Eventi assegnati</h3>
          {eventAssignmentsLoading ? (
            <p style={{ marginTop: 8 }}>Caricamento eventi assegnati...</p>
          ) : eventAssignmentsErr ? (
            <p style={{ marginTop: 8 }}>Errore: {eventAssignmentsErr}</p>
          ) : eventAssignments.length === 0 ? (
            <p style={{ marginTop: 8 }}>Nessun evento assegnato.</p>
          ) : null}

          <div style={{ marginTop: 8, overflowX: 'auto' }}>
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
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody>
                {eventAssignments.map((assignment) => {
                  const ev = events.find((e) => e.eventId === assignment.eventId);
                  const startLabel = ev ? toDateInputValue(ev.dateStart) : '';
                  const endLabel = ev ? toDateInputValue(ev.dateEnd) : '';
                  const dateLabel =
                    ev && endLabel ? `${startLabel} - ${endLabel}` : startLabel;
                  const busy = eventRowBusyId === assignment.assignmentId;
                  return (
                    <tr key={assignment.assignmentId}>
                      <td style={{ padding: '6px 4px' }}>
                        {ev ? titleCaseIt(ev.name) : 'Evento non trovato'}
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        {ev ? formatTypeUpper(ev.typeLabel) : 'N/D'}
                      </td>
                      <td style={{ padding: '6px 4px' }}>{dateLabel || 'N/D'}</td>
                      <td style={{ padding: '6px 4px' }}>
                        {ev ? formatStatusItUpper(ev.status) : 'N/D'}
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleRemoveEventAssignment(assignment.assignmentId)}
                        >
                          Rimuovi
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

