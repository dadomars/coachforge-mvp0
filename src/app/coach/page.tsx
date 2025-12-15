"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";

type Athlete = {
  athleteId: string;
  firstName: string;
  lastName: string;
  notesPublic: string | null;
  createdAt: string;
};

function errMsg(data: unknown, fallback: string) {
  if (typeof data === "object" && data !== null && "error" in data) {
    const e = (data as { error?: unknown }).error;
    if (typeof e === "string" && e.trim()) return e;
  }
  return fallback;
}

export default function CoachPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Athlete[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  // form create
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [notesPublic, setNotesPublic] = useState("");
  const [creating, setCreating] = useState(false);

  const canCreate = useMemo(() => {
    return firstName.trim().length >= 2 && lastName.trim().length >= 2 && !creating;
  }, [firstName, lastName, creating]);

  async function load() {
    setMsg(null);
    setLoading(true);
    try {
      const r = await fetch("/api/coach/athletes", { cache: "no-store" });
      const data: unknown = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(errMsg(data, `Errore ${r.status}`));
        setList([]);
        return;
      }

      const arr = Array.isArray(data) ? data : (data as { athletes?: unknown }).athletes;
      if (Array.isArray(arr)) setList(arr as Athlete[]);
      else setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createAthlete(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate) return;

    setCreating(true);
    setMsg(null);

    try {
      const r = await fetch("/api/coach/athletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          notesPublic: notesPublic.trim() ? notesPublic.trim() : null,
        }),
      });

      const data: unknown = await r.json().catch(() => ({}));

      if (!r.ok) {
        setMsg(errMsg(data, `Errore ${r.status}`));
        return;
      }

      setMsg("✅ Atleta creato.");
      setFirstName("");
      setLastName("");
      setNotesPublic("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function createInvite(athleteId: string) {
    setMsg(null);
    try {
      const r = await fetch(`/api/coach/athletes/${athleteId}/invite`, {
        method: "POST",
      });
      const data: unknown = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(errMsg(data, `Errore ${r.status}`));
        return;
      }

      const inviteUrl =
        typeof data === "object" && data !== null && "invite_url" in data
          ? (data as { invite_url?: unknown }).invite_url
          : null;

      if (typeof inviteUrl === "string" && inviteUrl.startsWith("http")) {
        await navigator.clipboard.writeText(inviteUrl);
        setMsg(`✅ Invito creato e COPIATO negli appunti: ${inviteUrl}`);
      } else {
        setMsg("✅ Invito creato (ma risposta senza invite_url leggibile).");
      }

      // ricarica lista se vuoi vedere conteggi
      await load();
    } catch {
      setMsg("Errore inatteso creando invito.");
    }
  }

  return (
    <main style={{ maxWidth: 920, margin: "40px auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Area Coach</h1>
          <p style={{ marginTop: 6, opacity: 0.75 }}>Crea atleti e genera inviti one-time.</p>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #333", cursor: "pointer" }}
        >
          Logout
        </button>
      </header>

      {msg && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: "1px solid #ddd", background: "#f7f7f7" }}>
          {msg}
        </div>
      )}

      <section style={{ marginTop: 22, padding: 16, borderRadius: 14, border: "1px solid #e5e5e5" }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Crea nuovo atleta</h2>

        <form onSubmit={createAthlete} style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Nome</span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="es. Mario"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Cognome</span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="es. Rossi"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Note (visibili all’atleta) — opzionale</span>
            <textarea
              value={notesPublic}
              onChange={(e) => setNotesPublic(e.target.value)}
              placeholder="es. ciao a tutti"
              rows={3}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc", resize: "vertical" }}
            />
          </label>

          <button
            type="submit"
            disabled={!canCreate}
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid #333",
              cursor: canCreate ? "pointer" : "not-allowed",
              fontWeight: 800,
            }}
          >
            {creating ? "Creo..." : "Crea atleta"}
          </button>
        </form>
      </section>

      <section style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>I tuoi atleti</h2>
          <button
            onClick={() => load()}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #333", cursor: "pointer" }}
          >
            Aggiorna
          </button>
        </div>

        {loading ? (
          <p style={{ marginTop: 10 }}>Carico…</p>
        ) : list.length === 0 ? (
          <p style={{ marginTop: 10, opacity: 0.75 }}>Nessun atleta.</p>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {list.map((a) => (
              <div
                key={a.athleteId}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid #e5e5e5",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800 }}>
                    {a.firstName} {a.lastName}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75, wordBreak: "break-all" }}>
                    ID: <code>{a.athleteId}</code>
                  </div>
                  {a.notesPublic ? (
                    <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                      Note: <span>{a.notesPublic}</span>
                    </div>
                  ) : null}
                </div>

                <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                  <button
                    onClick={() => createInvite(a.athleteId)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid #333",
                      cursor: "pointer",
                      fontWeight: 800,
                    }}
                  >
                    Crea invito
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
