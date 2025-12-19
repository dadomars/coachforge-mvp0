"use client";

import { useEffect, useState } from "react";

import ForbiddenBanner from "@/components/ForbiddenBanner";

type AthleteRow = {
  athleteId: string;
  firstName: string;
  lastName: string;
  notesPublic?: string | null;
  activatedAt?: string | null;
};

type InviteResponse = {
  invite_url: string;
  expires_at: string;
};

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function getErrorMessage(data: unknown, fallback: string) {
  if (typeof data === "object" && data !== null && "error" in data) {
    const maybe = (data as { error?: unknown }).error;
    if (typeof maybe === "string" && maybe.trim().length > 0) return maybe;
  }
  return fallback;
}

export default function CoachAthletesPage() {
  
  const [forbidden, setForbidden] = useState<string | null>(null);
  const bannerText =
    forbidden === "athlete"
      ? "Accesso negato: sei loggato come COACH. L’area Atleta è riservata agli atleti."
      : forbidden === "coach"
      ? "Accesso negato: sei loggato come ATHLETE. L’area Coach è riservata ai coach."
      : null;

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<AthleteRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // create athlete (minimo)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [notesPublic, setNotesPublic] = useState("");
  const [creating, setCreating] = useState(false);

  // invite UI state
  const [inviteByAthleteId, setInviteByAthleteId] = useState<
    Record<string, { invite_url: string; expires_at: string }>
  >({});
  const [inviteLoadingId, setInviteLoadingId] = useState<string | null>(null);
  const [inviteErrByAthleteId, setInviteErrByAthleteId] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function loadAthletes() {
    setLoading(true);
    setError(null);

    try {
      const r = await fetch("/api/coach/athletes", { cache: "no-store" });
      const data: unknown = await r.json().catch(() => ({}));

      if (!r.ok) {
        setError(getErrorMessage(data, `Errore ${r.status}`));
        setList([]);
        return;
      }

      // supporta sia array puro sia { items: [...] }
      const items = Array.isArray(data) ? data : (data as { items?: unknown }).items;

      const arr = Array.isArray(items) ? items : [];
      const normalized: AthleteRow[] = arr
        .map((x) => {
          if (typeof x !== "object" || x === null) return null;
          const o = x as Record<string, unknown>;

          const athleteId = asString(o.athleteId);
          const firstName = asString(o.firstName);
          const lastName = asString(o.lastName);

          const notesPublic =
            typeof o.notesPublic === "string" || o.notesPublic === null
              ? (o.notesPublic as string | null)
              : null;

          const activatedAt =
            typeof o.activatedAt === "string" || o.activatedAt === null
              ? (o.activatedAt as string | null)
              : null;

          if (!athleteId || !firstName || !lastName) return null;

          return { athleteId, firstName, lastName, notesPublic, activatedAt };
        })
        .filter(Boolean) as AthleteRow[];

      setList(normalized);
    } catch {
      setError("Errore di rete.");
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  loadAthletes();
  setForbidden(new URLSearchParams(window.location.search).get("forbidden"));
}, []);

  async function createAthlete() {
    setCreating(true);
    setError(null);

    try {
      const r = await fetch("/api/coach/athletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          notesPublic: notesPublic.trim() || null,
        }),
      });

      const data: unknown = await r.json().catch(() => ({}));

      if (!r.ok) {
        setError(getErrorMessage(data, `Errore ${r.status}`));
        return;
      }

      setFirstName("");
      setLastName("");
      setNotesPublic("");
      await loadAthletes();
    } finally {
      setCreating(false);
    }
  }

  async function copyToClipboard(text: string, athleteId: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(athleteId);
      window.setTimeout(() => setCopiedId(null), 1200);
    } catch {
      window.prompt("Copia questo link:", text);
    }
  }

  async function createInvite(athleteId: string) {
    setInviteLoadingId(athleteId);
    setInviteErrByAthleteId((prev) => {
      const next = { ...prev };
      delete next[athleteId];
      return next;
    });

    try {
      const r = await fetch(`/api/coach/athletes/${athleteId}/invite`, {
        method: "POST",
      });

      const data: unknown = await r.json().catch(() => ({}));

      if (!r.ok) {
        const msg = getErrorMessage(data, `Errore ${r.status}`);
        setInviteErrByAthleteId((prev) => ({ ...prev, [athleteId]: msg }));
        return;
      }

      const d = data as Partial<InviteResponse>;
      const invite_url = typeof d.invite_url === "string" ? d.invite_url : "";
      const expires_at = typeof d.expires_at === "string" ? d.expires_at : "";

      if (!invite_url) {
        setInviteErrByAthleteId((prev) => ({
          ...prev,
          [athleteId]: "Risposta invito non valida (manca invite_url).",
        }));
        return;
      }

      setInviteByAthleteId((prev) => ({
        ...prev,
        [athleteId]: { invite_url, expires_at },
      }));
    } finally {
      setInviteLoadingId(null);
    }
  }

  const canCreate = firstName.trim().length > 0 && lastName.trim().length > 0 && !creating;

  return (
    <main style={{ maxWidth: 980, margin: "36px auto", padding: 16 }}>
      <section>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>Area Coach — Atleti</h1>

        <ForbiddenBanner text={bannerText} />

        <p style={{ opacity: 0.8, marginTop: 6 }}>
          Crea atleti e genera inviti one-time (link).
        </p>

        <div
          style={{
            marginTop: 18,
            padding: 14,
            borderRadius: 16,
            border: "1px solid #e5e5e5",
            display: "grid",
            gap: 10,
            maxWidth: 560,
          }}
        >
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Nome</span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Cognome</span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Note pubbliche (facoltative)</span>
              <input
                value={notesPublic}
                onChange={(e) => setNotesPublic(e.target.value)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              disabled={!canCreate}
              onClick={createAthlete}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #333",
                cursor: canCreate ? "pointer" : "not-allowed",
                fontWeight: 900,
              }}
            >
              {creating ? "Creo..." : "Crea atleta"}
            </button>

            <button
              onClick={loadAthletes}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #ddd",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Aggiorna lista
            </button>
          </div>

          {error ? (
            <div style={{ padding: 10, borderRadius: 10, border: "1px solid #f5b5b5" }}>
              {error}
            </div>
          ) : null}
        </div>

        {loading ? (
          <p style={{ marginTop: 10 }}>Carico…</p>
        ) : list.length === 0 ? (
          <p style={{ marginTop: 10, opacity: 0.75 }}>Nessun atleta.</p>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {list.map((a) => {
              const inv = inviteByAthleteId[a.athleteId];
              const invErr = inviteErrByAthleteId[a.athleteId];
              const invLoading = inviteLoadingId === a.athleteId;
              const isActive = !!a.activatedAt;

              return (
                <div
                  key={a.athleteId}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: "1px solid #e5e5e5",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 900 }}>
                        <span>
                          {a.firstName} {a.lastName}
                        </span>

                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 900,
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: "1px solid #ddd",
                            opacity: 0.9,
                          }}
                        >
                          {a.activatedAt ? "ATTIVO" : "NON ATTIVO"}
                        </span>
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
                      {!isActive ? (
                        <button
                          onClick={() => createInvite(a.athleteId)}
                          disabled={invLoading}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid #333",
                            cursor: invLoading ? "not-allowed" : "pointer",
                            fontWeight: 900,
                          }}
                        >
                          {invLoading ? "Genero..." : "Crea invito"}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {!isActive && inv ? (
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        border: "1px solid #ddd",
                        background: "#fafafa",
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>Invito (one-time)</div>

                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        Scadenza: <code>{inv.expires_at ? inv.expires_at : "N/D"}</code>
                      </div>

                      <div style={{ wordBreak: "break-all", fontSize: 12 }}>
                        <code>{inv.invite_url}</code>
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                          onClick={() => copyToClipboard(inv.invite_url, a.athleteId)}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid #333",
                            cursor: "pointer",
                            fontWeight: 900,
                          }}
                        >
                          {copiedId === a.athleteId ? "✅ Copiato" : "Copia link"}
                        </button>

                        <a
                          href={inv.invite_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid #ddd",
                            textDecoration: "none",
                            fontWeight: 900,
                            display: "inline-flex",
                            alignItems: "center",
                          }}
                        >
                          Apri link
                        </a>
                      </div>
                    </div>
                  ) : null}

                  {invErr ? (
                    <div style={{ padding: 10, borderRadius: 10, border: "1px solid #f5b5b5" }}>
                      {invErr}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}