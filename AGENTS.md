# Project instructions

OpenCode V2 loads this file automatically (no config entry needed) — it is
combined with the global `~/.config/opencode/AGENTS.md` and any nested
`AGENTS.md` files, nearest first. Commit it so every collaborator gets the
same guidance. Source: https://opencode.ai/v2/docs/instructions

## Project

MICRODOSISIA — website that generates a list of AI microlearnings
(microaprendizajes de IA) for SECOT (secot.org), an organization of startup
advisors/mentores.

Audience: SECOT advisors who want short, digestible AI learning items they
can apply while mentoring startups.

## Information flow

No LLM and no external AI service: everything is user-entered data persisted
in a database.

One entity — a **microdosis** (an AI learning topic) — moves through a state
machine. Two roles: `member` (any identified advisor) and `superuser`.

1. **Identify** — sign in is required before any action. Login is a **magic
   link**: the advisor asks for it with their `@secot.org` address and the
   site emails a one-time link (no passwords). Only addresses a superuser has
   added to `users` can enter — there is no public registration.
2. **Choose** — the home screen offers: *add a topic* or *vote on a topic*.
3. **Add** — form with `title` and `description` (the learning elements).
   Creates a microdosis in state `propuesta`.
4. **Vote** — records the user's preference on the list of open topics.
   One vote per member per microdosis (unique constraint).
5. **Consult** — anyone signed in can browse *microdosisia*: the microdoses
   already prepared.
6. **Superuser** transitions state: `propuesta` → `en estudio` → `realizada`.
   Reaching `realizada` requires the `documentation_url` (documents, audio,
   video, …).

State machine: `propuesta` → `en estudio` → `realizada` (+ documentation
link). Transitions are one-way and only valid from the previous state.

### Implications for implementation

- Needs auth + persistence → Astro with SSR/API routes and a database, not a
  fully static build.
- Access is restricted to the `secot.org` domain and to the list of advisors
  maintained by a superuser: no self-registration, no passwords.
- Enforce roles and transitions at the data layer (policies/RLS), never only
  in the UI: a member must not be able to self-promote a microdosis.
- Keep the state machine in one module so routes and UI share valid
  transitions.
- Validate `documentation_url` as a URL and require it exactly on the
  `en estudio` → `realizada` transition.
- Submissions and votes are untrusted input: validate server-side
  (length, format) and escape on render.
- Audit who changed a state and when (actor + timestamp).

## Commands

- `npm install` — dependencies
- `npm run dev` — dev server on http://localhost:4321
- `npm run build` / `npm run preview` — production build and local preview
- `npx tsc --noEmit` — type-check the `.ts` sources (works on Node 20)
- `npm run typecheck` — `astro check`, also checks `.astro` files
  (needs Node ≥ 22.12, see Gotchas)
- `npm run db:generate` / `db:migrate` / `db:studio` — Drizzle migrations
- `npm run db:guard` — installs the Postgres trigger that rejects invalid
  state transitions; run once per database, after `db:migrate`
- `npm run user:create -- <email> <name> [member|superuser]` — no password:
  the person signs in with the link emailed to that address

Setup order: `npm install` → `cp .env.example .env` (fill `DATABASE_URL` and
`AUTH_SECRET`) → `db:generate` → `db:migrate` → `db:guard` → `user:create` →
`dev`.

## Architecture

Astro 5 with `output: "server"` and the Node adapter — every page is SSR.

- `src/middleware.ts` — runs first: decodes the session into
  `Astro.locals.user`, redirects anonymous users to `/login`, and keeps
  `/admin` out of reach of plain members.
- `src/lib/magic.ts` + `src/pages/api/login.ts` + `src/pages/api/magic.ts` —
  the login. `POST /api/login` accepts only `@secot.org` addresses present in
  `users`, stores a hashed one-time token (`magic_links`) and hands it to
  `src/lib/mailer.ts`; `GET /api/magic?token=…` consumes it atomically and
  issues the session cookie.
- `src/lib/auth.ts` — builds that cookie (Auth.js JWT, salt = cookie name);
  `src/lib/session.ts` reads it back without an extra request.
- `src/lib/mailer.ts` — how the link is delivered (`EMAIL_TRANSPORT`:
  `log` locally, `resend` in production).
- `src/lib/states.ts` — the state machine (`propuesta → en estudio →
  realizada`). Routes, actions and UI must use its helpers; the same rules
  are enforced a second time by a Postgres trigger installed with
  `scripts/apply-db-guard.ts`.
- `src/actions/index.ts` — **the only place that mutates data**: add a
  topic, vote, unvote, transition state. Each handler re-checks role and
  transition server-side.
- `src/lib/db/` — Drizzle schema (`schema.ts`), lazy Neon client (`index.ts`),
  queries (`queries.ts`).
- `src/pages/` — `index`, `login`, `add`, `vote`, `microdosisia`, `admin`,
  plus the auth endpoints `api/login`, `api/magic` and `api/logout`.
- `src/components/Layout.astro` + `src/styles/global.css` — the whole UI.

Data model: `users` (no password column; role: `member` | `superuser`),
`magic_links` (one-time access tokens, stored as SHA-256 digests),
`microdosis` (state, `documentation_url`, `created_by`), `votes` (unique per
user + microdosis).

## Conventions

- UI copy and error messages are written in **Spanish**; code, comments and
  identifiers are in **English**.
- All mutations go through Astro actions in `src/actions/index.ts` — no ad
  hoc API routes for writes. Input is validated with Zod at the boundary.
  The only exceptions are the three auth endpoints (`/api/login`,
  `/api/magic`, `/api/logout`): their caller is anonymous by definition.
- Every action declares `accept: "form"` — the pages submit plain HTML forms
  and Astro's default is JSON-only (otherwise each submit answers **415**).
- Authorization is checked in the action handlers *and* in the middleware;
  never only in the UI.
- State transitions only via `src/lib/states.ts` helpers; never compare
  state strings ad hoc.
- Keep `AGENTS.md` in sync when commands, architecture or flows change.

## Verification

Before considering a change done:

1. `npx tsc --noEmit` — clean, no type errors.
2. `npm run build` — must succeed.
3. With Node ≥ 22.12: `npm run typecheck` (`astro check`) as well.

Manual smoke test for UI or flow changes: `/` renders, `/login` shows the
email-only form, requesting a link with a non-`secot.org` address or an
address that is not on the list shows the Spanish error, a valid link signs
you in (and cannot be replayed), submitting an invalid form shows field
errors, and anonymous requests to `/vote` redirect to `/login`.

## Gotchas

- **Node version**: the machine running this repo has Node 20.11.
  `npm run typecheck` (`astro check`) fails there with `ERR_REQUIRE_ESM`
  because the Astro language server needs Node ≥ 22.12. Use
  `npx tsc --noEmit` instead, or upgrade Node.
- **Astro is pinned to 5.x** because Astro 7 requires Node ≥ 22.12. Note that
  `npm audit` reports advisories in Astro 5.18 that are fixed only in 7.x —
  upgrading Node and then Astro is the pending security work.
- **Zod must stay on v3** (`^3.25.x`): Astro's action types bundle Zod v3, so
  Zod 4 breaks `astro check`.
- **Astro actions are JSON-only by default**: any action called from an HTML
  form must declare `accept: "form"`, or every submit answers **415
  Unsupported Media Type**. Adding a new action? Copy the option.
- **No `.env` → login fails** with `error=config`: `AUTH_SECRET` (signs the
  session cookie) and `DATABASE_URL` (looks the address up) are required.
- **No mail provider configured**: with `EMAIL_TRANSPORT=log` (the default)
  nothing is emailed — on localhost the link is shown on the page after
  submitting the form, and outside localhost the login refuses instead of
  silently losing links. Production needs `EMAIL_TRANSPORT=resend` plus
  `RESEND_API_KEY` and `EMAIL_FROM`.
- The database client is created lazily, so importing modules without a
  database configured does not break `npm run build`.
- The Postgres trigger from `npm run db:guard` raises an exception on an
  invalid transition or a `realizada` row without `documentation_url`; the
  app validates first, so this only fires for hand-made SQL updates.
- Session cookies are Auth.js JWTs; changing `AUTH_SECRET` signs everyone
  out.
