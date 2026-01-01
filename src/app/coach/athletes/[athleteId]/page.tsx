'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function toLocalDateKey(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

function formatDateIT(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
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

type AssignedSessionRow = {
  assignmentId: string;
  sessionId: string;
  assignedAt: string;
  sessionDate: string | null;
  title: string;
  notesPublic: string;
  createdAt?: string;
  status: 'TODO' | 'DONE' | 'SKIPPED';
  performedAt?: string | null;
  durationMin?: number | null;
  rpe?: number | null;
  note?: string | null;
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

function normalizeAssignedSession(value: unknown): AssignedSessionRow | null {
  if (!value || typeof value !== 'object') return null;
  const rec = value as Record<string, unknown>;
  const assignmentId = asString(rec['assignmentId']);
  const sessionId = asString(rec['sessionId']);
  const assignedAt = asString(rec['assignedAt']);
  const title = asString(rec['title']);
  if (!assignmentId || !sessionId || !assignedAt || !title) return null;
  const status = asString(rec['status']) as AssignedSessionRow['status'];
  if (!['TODO', 'DONE', 'SKIPPED'].includes(status)) return null;
  return {
    assignmentId,
    sessionId,
    assignedAt,
    sessionDate: asString(rec['sessionDate']) || null,
    title,
    notesPublic: asString(rec['notesPublic']),
    createdAt: asString(rec['createdAt']) || undefined,
    status,
    performedAt: asString(rec['performedAt']) || null,
    durationMin:
      typeof rec['durationMin'] === 'number'
        ? rec['durationMin']
        : Number.isFinite(Number(rec['durationMin']))
        ? Number(rec['durationMin'])
        : null,
    rpe:
      typeof rec['rpe'] === 'number'
        ? rec['rpe']
        : Number.isFinite(Number(rec['rpe']))
        ? Number(rec['rpe'])
        : null,
    note: asString(rec['note']) || null,
  };
}
export default function AthleteDetailPage() {
  const params = useParams<{ athleteId: string | string[] }>();
  const router = useRouter();
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
  const [eventAssignErr, setEventAssignErr] = useState<string>('');
  const [eventAssignBusy, setEventAssignBusy] = useState(false);
  const [eventRowBusyId, setEventRowBusyId] = useState<string | null>(null);
  const [showEventAssignForm, setShowEventAssignForm] = useState(false);
  const [assignEventId, setAssignEventId] = useState('');

  const [assignedSessions, setAssignedSessions] = useState<AssignedSessionRow[]>([]);
  const [assignedSessionsLoading, setAssignedSessionsLoading] = useState(false);
  const [assignedSessionsErr, setAssignedSessionsErr] = useState('');
  const [sessionFilter, setSessionFilter] = useState<
    'today' | 'week' | 'range' | 'all'
  >('today');
  const [sessionDateFrom, setSessionDateFrom] = useState('');
  const [sessionDateTo, setSessionDateTo] = useState('');

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

    async function loadAssignedSessions() {
      if (!athleteId) return;
      setAssignedSessionsLoading(true);
      setAssignedSessionsErr('');
      try {
        const r = await fetch(
          `/api/coach/athletes/${athleteId}/session-assignments`,
          { cache: 'no-store' }
        );
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          const msg =
            (data && (data.error || data.message)) ||
            `Errore caricamento programmazione (${r.status})`;
          throw new Error(msg);
        }
        if (!Array.isArray(data))
          throw new Error('Risposta programmazione assegnata non valida.');
        const normalized = data
          .map((row: unknown) => normalizeAssignedSession(row))
          .filter(Boolean) as AssignedSessionRow[];
        if (alive) setAssignedSessions(normalized);
      } catch (e: unknown) {
        if (alive) setAssignedSessionsErr(errorMessage(e));
      } finally {
        if (alive) setAssignedSessionsLoading(false);
      }
    }

    loadAssignedSessions();

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

  async function handleAssignEventById(eventId: string) {
    if (!athleteId) return;
    setEventAssignErr('');
    if (!eventId) {
      setEventAssignErr('Seleziona un evento.');
      return;
    }

    setEventAssignBusy(true);
    setEventRowBusyId(eventId);
    let ok = false;
    try {
      const r = await fetch(
        `/api/coach/athletes/${athleteId}/event-assignments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId }),
        }
      );
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Errore assegnazione evento (${r.status})`;
        throw new Error(msg);
      }
      await reloadEventAssignments();
      ok = true;
    } catch (e: unknown) {
      setEventAssignErr(errorMessage(e));
    } finally {
      setEventAssignBusy(false);
      setEventRowBusyId(null);
    }
    return ok;
  }

  async function handleAssignEvent() {
    const ok = await handleAssignEventById(assignEventId);
    if (ok) {
      setAssignEventId('');
      setShowEventAssignForm(false);
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

  const filteredAssignedSessions = useMemo(() => {
    if (sessionFilter === 'all') return assignedSessions;

    const today = new Date();
    const todayKey = toLocalDateKey(today.toISOString());

    if (sessionFilter === 'today') {
      return assignedSessions.filter(
        (session) => toLocalDateKey(session.sessionDate) === todayKey
      );
    }

    if (sessionFilter === 'week') {
      const currentDay = (today.getDay() + 6) % 7;
      const start = new Date(today);
      start.setDate(today.getDate() - currentDay);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const startKey = toLocalDateKey(start.toISOString());
      const endKey = toLocalDateKey(end.toISOString());

      return assignedSessions.filter((session) => {
        const key = toLocalDateKey(session.sessionDate);
        if (!key) return false;
        return key >= startKey && key <= endKey;
      });
    }

    if (sessionFilter === 'range') {
      if (!sessionDateFrom) return [];
      const start = new Date(sessionDateFrom);
      start.setHours(0, 0, 0, 0);
      const end = sessionDateTo ? new Date(sessionDateTo) : new Date();
      end.setHours(23, 59, 59, 999);
      return assignedSessions.filter((session) => {
        if (!session.sessionDate) return false;
        const sessionDate = new Date(session.sessionDate);
        if (Number.isNaN(sessionDate.getTime())) return false;
        return sessionDate >= start && sessionDate <= end;
      });
    }

    return assignedSessions;
  }, [assignedSessions, sessionDateFrom, sessionDateTo, sessionFilter]);

  function handleResetRange() {
    setSessionDateFrom('');
    setSessionDateTo('');
  }

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
        <h2 style={{ margin: 0 }}>Programmazione assegnata</h2>
        {assignedSessionsLoading ? (
          <p style={{ marginTop: 8 }}>Caricamento sessioni...</p>
        ) : assignedSessionsErr ? (
          <p style={{ marginTop: 8 }}>Errore: {assignedSessionsErr}</p>
        ) : assignedSessions.length === 0 ? (
          <p style={{ marginTop: 8 }}>Nessuna programmazione assegnata.</p>
        ) : filteredAssignedSessions.length === 0 && sessionFilter === 'today' ? (
          <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
            <p>Nessuna sessione oggi.</p>
            <button type="button" onClick={() => setSessionFilter('week')}>
              Mostra settimana
            </button>
          </div>
        ) : sessionFilter === 'range' && !sessionDateFrom ? (
          <p style={{ marginTop: 8 }}>Seleziona almeno la data di inizio.</p>
        ) : filteredAssignedSessions.length === 0 ? (
          <p style={{ marginTop: 8 }}>Nessuna sessione nel periodo.</p>
        ) : null}

        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => setSessionFilter('today')}
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid #ccc',
                background: sessionFilter === 'today' ? '#111' : '#fff',
                color: sessionFilter === 'today' ? '#fff' : '#111',
                fontWeight: 600,
              }}
            >
              Oggi
            </button>
            <button
              type="button"
              onClick={() => setSessionFilter('week')}
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid #ccc',
                background: sessionFilter === 'week' ? '#111' : '#fff',
                color: sessionFilter === 'week' ? '#fff' : '#111',
                fontWeight: 600,
              }}
            >
              Settimana
            </button>
            <button
              type="button"
              onClick={() => setSessionFilter('range')}
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid #ccc',
                background: sessionFilter === 'range' ? '#111' : '#fff',
                color: sessionFilter === 'range' ? '#fff' : '#111',
                fontWeight: 600,
              }}
            >
              Periodo
            </button>
            <button
              type="button"
              onClick={() => setSessionFilter('all')}
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid #ccc',
                background: sessionFilter === 'all' ? '#111' : '#fff',
                color: sessionFilter === 'all' ? '#fff' : '#111',
                fontWeight: 600,
              }}
            >
              Tutte
            </button>
          </div>

          {sessionFilter === 'range' ? (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span>Da</span>
                <input
                  type="date"
                  value={sessionDateFrom}
                  onChange={(e) => setSessionDateFrom(e.target.value)}
                />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span>A</span>
                <input
                  type="date"
                  value={sessionDateTo}
                  onChange={(e) => setSessionDateTo(e.target.value)}
                />
              </label>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button type="button" onClick={handleResetRange}>
                  Reset
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {sessionFilter === 'range' && !sessionDateFrom ? null : (
          <div style={{ marginTop: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                    Programmazione
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignedSessions.map((session) => {
                  const dateLabel = formatDateIT(session.sessionDate);
                  const returnTo = encodeURIComponent(`/coach/athletes/${athleteId}`);
                  const badgeLabel =
                    session.status === 'DONE'
                      ? 'DONE'
                      : session.status === 'SKIPPED'
                      ? 'SKIPPED'
                      : 'TODO';
                  return (
                    <tr
                      key={session.assignmentId}
                      style={{ cursor: 'pointer' }}
                      onClick={() =>
                        router.push(
                          `/coach/sessions/${session.sessionId}?returnTo=${returnTo}`
                        )
                      }
                    >
                      <td style={{ padding: '6px 4px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                          }}
                        >
                          <div style={{ display: 'grid', gap: 4 }}>
                            <div>
                              <strong>Data:</strong> {dateLabel || '-'}
                            </div>
                            <div>
                              <strong>Titolo:</strong> {titleCaseIt(session.title)}
                            </div>
                            <div>
                              <strong>Note:</strong> {session.notesPublic || '-'}
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  border: '1px solid #ccc',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                }}
                              >
                                {badgeLabel}
                              </span>
                              {session.rpe != null ? (
                                <span style={{ fontSize: 12 }}>
                                  RPE {session.rpe}
                                </span>
                              ) : null}
                              {session.durationMin != null ? (
                                <span style={{ fontSize: 12 }}>
                                  Durata {session.durationMin}'
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <Link
                            href={`/coach/sessions/${session.sessionId}?returnTo=${returnTo}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '6px 12px',
                              borderRadius: 8,
                              border: '1px solid #ccc',
                              background: '#fff',
                              textDecoration: 'none',
                              color: 'inherit',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Apri
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
      </section>

      <section style={{ padding: 12, border: '1px solid #ddd', borderRadius: 10 }}>
        <h2 style={{ margin: 0 }}>Eventi</h2>

        {eventsLoading ? (
          <p style={{ marginTop: 8 }}>Caricamento eventi...</p>
        ) : eventsErr ? (
          <p style={{ marginTop: 8 }}>Errore: {eventsErr}</p>
        ) : events.length === 0 ? (
          <p style={{ marginTop: 8 }}>Nessun evento disponibile.</p>
        ) : null}

        {eventAssignErr ? <p style={{ marginTop: 8 }}>Errore: {eventAssignErr}</p> : null}

        <div style={{ marginTop: 12 }}>
          {!showEventAssignForm ? (
            <button type="button" onClick={() => setShowEventAssignForm(true)}>
              Assegna evento
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAssignEvent();
              }}
              style={{ display: 'grid', gap: 8 }}
            >
              <label>
                Evento
                <select
                  value={assignEventId}
                  disabled={eventsLoading}
                  onChange={(e) => setAssignEventId(e.target.value)}
                >
                  <option value="">Seleziona evento</option>
                  {events.map((ev) => (
                    <option key={ev.eventId} value={ev.eventId}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              </label>

              {eventsLoading ? <p>Caricamento eventi...</p> : null}
              {eventsErr ? <p>Errore: {eventsErr}</p> : null}

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={eventAssignBusy || eventsLoading}>
                  Assegna
                </button>
                <button
                  type="button"
                  disabled={eventAssignBusy}
                  onClick={() => {
                    setShowEventAssignForm(false);
                    setAssignEventId('');
                    setEventAssignErr('');
                  }}
                >
                  Annulla
                </button>
              </div>
            </form>
          )}
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

