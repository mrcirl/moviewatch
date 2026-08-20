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
- Single-user, password-protected, no external accounts required — or skip
  the password entirely for requests from a trusted LAN range (see below).

## Running with Docker (recommended)

```bash
docker compose up -d --build
```

This builds the app and starts it on [http://localhost:3000](http://localhost:3000),
storing its SQLite database in a named Docker volume (`moviewatch-data`) so it
survives rebuilds. On first visit you'll be asked to set a password.

## Running on Unraid

A prebuilt image is published to GHCR (`ghcr.io/mrcirl/moviewatch`) by
[`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml)
on every push to `main` (and can be triggered manually from the Actions tab
via "Run workflow" on any branch). One-time setup:

1. Push/merge to `main` (or manually run the workflow) so the image gets built.
2. On GitHub, go to the repo → **Packages** → `moviewatch` → **Package settings**
   → change visibility to **Public** (or, to keep it private, add a GHCR
   read-only PAT under Unraid's Docker settings → registry credentials).
3. In Unraid, go to the **Docker** tab → **Add Container**, and either:
   - paste this repo's template URL —
     `https://raw.githubusercontent.com/mrcirl/moviewatch/main/unraid-template.xml`
     — into the template field at the bottom of the Add Container page, or
   - fill the fields in manually:

     | Field | Value |
     | --- | --- |
     | Repository | `ghcr.io/mrcirl/moviewatch:latest` |
     | Network Type | Bridge |
     | Port | `3000` → `3000` (or any host port you prefer) |
     | Path | `/mnt/user/appdata/moviewatch` → `/data` |

4. Apply, then open `http://<unraid-ip>:3000` and set your password on first
   visit. The SQLite database lives entirely under the appdata path above, so
   it's included in whatever backs up `/mnt/user/appdata` (e.g. the CA
   Appdata Backup plugin).
5. To update later: re-pull the `latest` tag (Unraid's Docker tab flags
   updates automatically once the workflow publishes a new image) and restart
   the container — `docker-entrypoint.sh` runs the database migration
   automatically on startup.

If Jellyfin and/or Seerr also run on the same Unraid box, use their
container's Unraid hostname (e.g. `http://jellyfin:8096`) or the box's LAN IP
in MovieWatch's Settings page — not `localhost`, since each container is its
own network namespace.

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

### Skipping login on a trusted network

If MovieWatch never leaves your LAN, you can make the password optional for
requests from an allowlisted range: Settings → **Trusted network (skip
login)** → enter one or more IPs/CIDRs (comma or newline separated, e.g.
`192.168.1.0/24`). Matching requests skip login entirely — including the
first-run password setup — while everyone else still needs the password.

This checks the actual TCP connection's source address (via the custom
`server.js`, not a client-supplied header), so it can't be spoofed by a
request claiming a different IP. That also means it only works for a **direct**
deployment (e.g. Unraid's plain `-p 3000:3000` port mapping) — if you later
put MovieWatch behind a reverse proxy, the address it sees is the proxy's,
not the original client's, so don't enable this alongside one unless you're
certain what the proxy forwards.

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
