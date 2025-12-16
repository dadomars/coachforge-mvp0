# CoachForge — MVP-0

Web app coach-first (Weightlifting) — MVP-0 con:
- Login Coach / Athlete
- Inviti one-time (token hashato in DB, mai token in chiaro)
- RBAC: `/coach/*` solo COACH, `/athlete/*` solo ATHLETE
- SSOT attivazione atleta: `athlete_auth.activated_at`

UI in italiano. Unità: Kg. Single coach owner.

---

## Prerequisiti

- Node.js LTS
- pnpm
- Postgres (Neon consigliato)

---

## Setup locale (DEV)

1) Installa dipendenze
```bash
pnpm install