# MovieWatch

A self-hosted watchlist for films: bookmark what you want to watch, tag who you
want to watch it with, and see at a glance whether it's already on your
Jellyfin server, available to stream, or worth requesting through
[Seerr](https://seerr.dev).

## Features

- **Watchlist** — search TMDB and add films with one click; mark them watched later.
- **People** — tag the friends/family you want to watch a film with.
- **Places** — a custom list of physical spots (living room, a friend's place, the
  local cinema) you can tag on a watchlist entry.
- **Availability** — each entry shows whether it's already in your Jellyfin
  library (with a direct link), what streaming services have it, and its
  request status on Seerr — with a one-click "Request via Seerr" button.
- Single-user, password-protected, no external accounts required.

## Running with Docker (recommended)

```bash
docker compose up -d --build
```

This builds the app and starts it on [http://localhost:3000](http://localhost:3000),
storing its SQLite database in a named Docker volume (`moviewatch-data`) so it
survives rebuilds. On first visit you'll be asked to set a password.

## Configuring integrations

Everything below is configured from the **Settings** page after you log in —
no restart required.

| Integration | What it needs | Where to find it |
| --- | --- | --- |
| TMDB | API key | themoviedb.org account → Settings → API (used for search, posters, and streaming-provider info) |
| Jellyfin | Server URL + API key | Jellyfin admin dashboard → API Keys |
| Seerr | Server URL + API key | Seerr → Settings → General |

Jellyfin and Seerr are optional — MovieWatch works as a plain watchlist/tagging
app without them, and TMDB streaming-provider info still shows if only a TMDB
key is set.

## Local development

Requires Node.js 20+.

```bash
npm install
cp .env.example .env
npx prisma migrate dev --name init   # first run only: creates prisma/dev.db
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Tech stack

Next.js (App Router) + TypeScript, Prisma + SQLite, Tailwind CSS. Single
deployable container — no separate backend service needed.
