'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

function asString(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
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

export default function AthleteDetailPage() {
  const params = useParams<{ athleteId: string | string[] }>();
  const athleteId = Array.isArray(params.athleteId)
    ? params.athleteId[0]
    : params.athleteId;

  const [list, setList] = useState<AthleteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');

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
        <p style={{ marginTop: 8 }}>
          In arrivo: lista + aggiungi/modifica/elimina + “gara obiettivo”.
        </p>
      </section>

      <section style={{ padding: 12, border: '1px solid #ddd', borderRadius: 10 }}>
        <h2 style={{ margin: 0 }}>Eventi</h2>
        <p style={{ marginTop: 8 }}>In arrivo: lista + aggiungi/modifica/elimina.</p>
      </section>
    </main>
  );
}