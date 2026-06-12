# Task Board

A lightweight Trello-style task board. Tasks live in three columns — **To Do**,
**In Progress**, **Done** — and can be created, edited, moved, and deleted. A
stats panel summarizes counts per status and how many tasks are overdue.

This repo is a monorepo with two independent apps:

```
task-board/
├── backend/    Node.js + TypeScript REST API (Express, SQLite, JWT)
└── frontend/   React + TypeScript SPA (Vite)   ← see "Frontend" below
```

---

## Tech stack

**Backend**
- Node.js + TypeScript (run directly with [`tsx`], no build step needed)
- Express for the HTTP layer
- SQLite via `node-sqlite3-wasm` (synchronous, pure WASM — no native
  compilation, zero external services)
- `zod` for request validation
- `jsonwebtoken` + `bcryptjs` for auth
- `vitest` + `supertest` for tests

**Frontend**
- React + TypeScript + Vite
- `vitest` + Testing Library (jsdom) for tests

SQLite was chosen over Postgres so the project runs with no database server to
install — the whole thing is `npm install && npm run dev`. The pure-WASM
`node-sqlite3-wasm` driver was chosen deliberately over `better-sqlite3` so the
app runs anywhere — locally and on any deploy host — with zero native
compilation (no C/C++ toolchain, no node-gyp).

---

## Prerequisites

- **Node.js 18+** and npm (Node 20 LTS recommended)

---

## Quick start

Two terminals — one for the API, one for the web app.

### 1. Backend (API on http://localhost:4000)

```bash
cd backend
cp .env.example .env        # optional; sensible defaults are built in
npm install
npm run db:reset            # optional: creates the SQLite schema and seeds 18 tasks + the demo user
npm run dev                 # starts the API with auto-reload
```

The server also seeds itself on boot when the database is empty (and ensures
the demo user exists), so `db:reset` is only needed when you want to restore
the original sample data.

Verify it's up:

```bash
curl http://localhost:4000/health
# { "status": "ok", "timestamp": "..." }
```

### 2. Frontend (web app on http://localhost:5173)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and log in with the demo credentials below. The dev
server proxies `/api` and `/health` to the backend on port 4000, so the client
always uses relative URLs and no CORS configuration is required.

---

## Test login

| Email                  | Password      |
| ---------------------- | ------------- |
| `demo@taskboard.dev`   | `password123` |

These are created by the seed script (`backend/npm run seed`) and can be changed
via `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` in `backend/.env`.

---

## API reference

All `/api/tasks` and `/api/stats` routes require a bearer token:
`Authorization: Bearer <token>`.

### Auth

`POST /api/auth/login` → `{ token, user: { id, email } }`

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@taskboard.dev","password":"password123"}'
```

### Task shape

```ts
{
  id: number;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate: string | null;   // ISO date
  createdAt: string;        // ISO date
  updatedAt: string;        // ISO date
}
```

### Endpoints

| Method   | Path             | Notes                                                        |
| -------- | ---------------- | ------------------------------------------------------------ |
| `GET`    | `/health`        | Public health check                                          |
| `GET`    | `/api/tasks`     | List. Query: `status`, `page` (default 1), `limit` (default 20, max 100) |
| `GET`    | `/api/tasks/:id` | Fetch one (404 if missing)                                   |
| `POST`   | `/api/tasks`     | Create. `title` required; other fields optional              |
| `PATCH`  | `/api/tasks/:id` | Update any subset of fields                                  |
| `DELETE` | `/api/tasks/:id` | Delete (204 on success)                                      |
| `GET`    | `/api/stats`     | `{ total, byStatus: { todo, in_progress, done }, overdue }`  |

List responses are paginated:

```json
{
  "data": [ /* tasks */ ],
  "pagination": { "page": 1, "limit": 20, "total": 18, "totalPages": 1 }
}
```

### Error format

Every error uses the same envelope, with appropriate HTTP status codes
(`400` validation, `401` auth, `404` not found, `500` internal):

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "title is required" } }
```

---

## Tests

```bash
# Backend — API tests against an in-memory SQLite database
cd backend && npm test

# Frontend — component tests (jsdom + Testing Library, API mocked)
cd frontend && npm test
```

Backend tests cover login + route protection and the task lifecycle (create,
list with pagination/filter, update, delete, stats). They run against a fresh
in-memory database, so they don't touch your seeded data.

Frontend tests mock the API client, covering the login form (including the
inline error on bad credentials) and the board (rendering tasks into columns,
and the delete confirmation flow).

---

## Project structure

```
backend/
├── src/
│   ├── index.ts            # entrypoint: migrate + start listener
│   ├── app.ts              # Express app factory (imported by tests)
│   ├── config.ts           # env config with safe defaults
│   ├── db/
│   │   ├── schema.sql       # tables + indexes (the migration)
│   │   ├── migrate.ts       # applies schema.sql (idempotent)
│   │   ├── seed.ts          # 18 sample tasks + demo user
│   │   └── connection.ts    # shared SQLite connection
│   ├── repositories/        # data layer — all SQL lives here
│   ├── services/            # business logic (task, auth)
│   ├── routes/              # HTTP layer (health, auth, tasks, stats)
│   ├── middleware/          # auth, validation, error handling
│   ├── validators/          # zod schemas
│   └── utils/               # typed errors, async wrapper
└── tests/                   # vitest + supertest

frontend/
├── index.html
├── vite.config.ts           # dev proxy for /api and /health → :4000
└── src/
    ├── main.tsx             # entrypoint
    ├── App.tsx              # auth gate: login page vs board
    ├── api.ts               # fetch wrapper (relative URLs, JWT header, 401 handling)
    ├── types.ts             # API types (mirrors backend/src/types.ts)
    ├── test/setup.ts        # registers jest-dom matchers for vitest
    └── components/          # LoginPage, Board, TaskCard, TaskForm,
                             # ConfirmDialog, StatsPanel + *.test.tsx
```

The backend is organized in three layers so each has one job:
**routes** (HTTP in/out) → **services** (rules) → **repositories** (SQL). Errors
are thrown as typed `AppError`s and rendered into the JSON envelope by a single
error middleware, which keeps every handler free of try/catch boilerplate.

---

## What I'd improve with more time

- **Refresh tokens / token expiry handling on the client.** Right now it's a
  single short-lived JWT; a refresh flow would avoid surprise logouts.
- **A real migrations tool** (e.g. a versioned migrations folder) instead of a
  single idempotent `schema.sql`, so schema changes are tracked over time.
- **More test coverage** — edge cases around pagination bounds and concurrent
  updates, plus end-to-end tests across the UI and API together.

---

## Deploy

The app deploys as a **single web service**: the build compiles the frontend,
and in production (`NODE_ENV=production`) the backend serves the built SPA
from `frontend/dist` on the same origin — no CORS, no second service.

**Live URL:** https://task-board.up.railway.app <!-- placeholder — replace with your URL after the first deploy -->

The deploy host's disk is **ephemeral** — the SQLite file is wiped on every
deploy/restart. The server seeds itself on boot whenever the tasks table is
empty, so the demo data (18 tasks + demo user) is always there.

### Railway (railway.app)

The repo includes a root [`package.json`](package.json) with `build`/`start`
scripts (so Railway's builder detects the monorepo) and a
[`railway.json`](railway.json) with the health check. To deploy:

1. **New Project → Deploy from GitHub repo** and select this repo.
2. In the service **Variables**, add:
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = any long random string
3. **Settings → Networking → Generate Domain** to get the public URL.

Railway injects `PORT` automatically; the server reads it.

### Render (alternative)

A [`render.yaml`](render.yaml) Blueprint is also included: in the Render
dashboard create a new **Blueprint** pointing at the repo and apply it.
Note Render's free tier spins the instance down after ~15 minutes idle
(first request after that takes ~30–60s).

---

## Troubleshooting

- **`npm install` problems building SQLite?** There shouldn't be any: the
  backend uses `node-sqlite3-wasm`, a pure-WASM SQLite build with no native
  compilation step, so no compiler or native headers are required.
- **Frontend can't reach the API in dev?** Make sure the backend is running on
  port 4000 — the Vite dev server proxies `/api` and `/health` there.
- **Login fails locally?** The demo user is created automatically on server
  boot; restart the backend (or run `npm run db:reset` in `backend/`) and try
  `demo@taskboard.dev` / `password123`.

---

## AI tools

AI assistance (Claude, used inside Cursor) was used to scaffold boilerplate and
write tests. All architecture decisions, the data model, and the final code were
reviewed and adjusted by hand.

[`tsx`]: https://github.com/privatenumber/tsx
