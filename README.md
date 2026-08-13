# AUB Fantasy League

A Next.js site for our dynasty and redraft fantasy football leagues — team pages, draft history, trade history, game log with box scores, playoff brackets, and season stats. Data is pulled from [Sleeper's public API](https://docs.sleeper.com/) and stored in Postgres via Prisma; the app itself is read-only against that data.

## Stack

- Next.js (App Router) + React + Tailwind
- Prisma + Postgres (Supabase)
- Sleeper API for all league data (`scripts/sync-sleeper.ts`)

## Local setup

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` / `DIRECT_URL` for your Postgres instance.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Apply migrations:
   ```bash
   npx prisma migrate deploy
   ```
4. Pull league data from Sleeper:
   ```bash
   npm run sync:sleeper
   ```
5. Run the dev server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Syncing data

`npm run sync:sleeper` re-pulls everything from Sleeper (rosters, matchups, drafts, trades, playoff brackets, weekly player stats) and upserts it into the database. It's idempotent — safe to run repeatedly.

In production this runs automatically every 6 hours via `.github/workflows/sync-sleeper.yml`, which needs `DATABASE_URL` and `DIRECT_URL` set as repo secrets (Settings → Secrets and variables → Actions).

Which leagues/seasons get synced is configured in `src/lib/sleeper-config.ts`.

## Deploying (Vercel)

1. Import this repo on [Vercel](https://vercel.com/new).
2. Add `DATABASE_URL` and `DIRECT_URL` as environment variables in the Vercel project settings.
3. Deploy. `postinstall` runs `prisma generate` automatically as part of the build.

Migrations aren't run automatically on deploy — run `npx prisma migrate deploy` (with production env vars) whenever the schema changes, or let the next scheduled sync-sleeper run apply it.
