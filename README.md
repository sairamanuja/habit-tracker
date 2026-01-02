# Arin — Habit Tracker

Modern, data-driven habit tracker inspired by GitHub contributions and clean Notion-style UI.

## Tech stack

- Next.js (App Router) + JavaScript
- Tailwind CSS + shadcn/ui
- Auth: NextAuth (Google OAuth)
- DB: PostgreSQL + Prisma
- Charts: Recharts

## Features

- Auth-protected dashboard
- Create habits (daily/weekly)
- Daily status cycle: `COMPLETED → PARTIAL → MISSED`
- GitHub-style 365-day heatmap (intensity by completion %)
- Basic analytics: per-habit completion %, streaks, 30-day trend
- Server-side Zod validation + user-scoped queries
- Lightweight API rate limiting

## Screenshots

Add screenshots here after you run locally.

## Local setup

1) Install dependencies

```bash
npm install
```

2) Create env file

```bash
cp .env.example .env
```

3) Start Postgres (optional)

If you use Docker:

```bash
docker compose up -d db
```

If Docker says “permission denied”, add your user to the docker group (Linux) and re-login:

```bash
sudo usermod -aG docker $USER
```

4) Run migrations

```bash
npm run prisma:migrate
```

5) Start the app

```bash
npm run dev
```

Open http://localhost:3000

## Auth configuration

### Google OAuth

Set these in `.env`:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

## Deployment (Vercel + Neon/Supabase)

1) Create a Postgres DB (Neon/Supabase) and set `DATABASE_URL`.
2) In Vercel project settings, set:

- `DATABASE_URL`
- `NEXTAUTH_URL` (your production URL)
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

3) Deploy.

Run migrations in production using `prisma migrate deploy` (from CI/CD or locally with the same `DATABASE_URL`).

## Docker (production)

Build and run:

```bash
docker build -t arin .
docker run -p 3000:3000 --env-file .env arin
```

## Roadmap

- More granular weekly habits logic
- Editing/deleting habits in UI
- Export CSV/PDF
- Reflection journaling
- AI habit suggestions
# habit-tracker
