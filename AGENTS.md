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
- `npx tsc --noEmit` — type-check the `.ts` sources
- `npm run typecheck` — `astro check`, also checks `.astro` files
- `npm run db:generate` / `db:migrate` / `db:studio` — Drizzle migrations
- `npm run db:guard` — installs the Postgres trigger that rejects invalid
  state transitions; run once per database, after `db:migrate`
- `npm run user:create -- <email> <name> [member|superuser]` — no password:
  the person signs in with the link emailed to that address
- `npm run user:role -- <email> <member|superuser>` — promote or demote an
  existing account (the UI has no such control; refuses to remove the last
  superuser)

Setup order: `npm install` → `cp .env.example .env` (fill `DATABASE_URL` and
`AUTH_SECRET`) → `db:generate` → `db:migrate` → `db:guard` → `user:create` →
`dev`.

## Deployment (Vercel)

The repo deploys from GitHub: import it in Vercel and it builds itself
(`VERCEL=1` selects `@astrojs/vercel`, `maxDuration: 30`, runtime `nodejs22.x`).
Both build paths are verifiable locally:

```bash
npm run build                                   # Node adapter (what preview uses)
VERCEL=1 PUBLIC_SITE_URL=https://microdosis-ia.vercel.app npm run build   # writes .vercel/output
```

Environment variables for the Vercel project (same names as `.env`):

| Var | Value |
| --- | --- |
| `DATABASE_URL` | production Neon connection string |
| `AUTH_SECRET` | a **new** secret (`openssl rand -base64 32`), not the local one |
| `PUBLIC_SITE_URL` | `https://<project>.vercel.app` — also read by `astro.config.mjs` to fill `allowedDomains` |
| `EMAIL_TRANSPORT` | `smtp` |
| `SMTP_HOST` / `SMTP_PORT` | `smtp.office365.com` / `587` |
| `SMTP_USER` / `SMTP_PASS` | the mailbox and its password (app password with MFA) |
| `EMAIL_FROM` | `MICRODOSISIA <that-mailbox>` |
| `SMTP_CA_FILE` | **leave unset** — the Avast root only exists on the local machine |

After changing the deployed hostname, add it to `allowedDomains`
(`astro.config.mjs`) and redeploy, run `npm run db:migrate` + `npm run db:guard`
against the production database, and add the first superuser with
`npm run user:create`. Vercel blocks outbound port 25 only, so SMTP 587 works
from its functions as long as the send is awaited (it is).

## Architecture

Astro 7 with `output: "server"` — every page is SSR. The adapter depends on
where it runs: `@astrojs/node` locally (so `dev` and `preview` keep working
exactly as before) and `@astrojs/vercel` when `VERCEL=1` (see Deployment).

- `src/middleware.ts` — runs first: decodes the session into
  `Astro.locals.user`, redirects anonymous users to `/login`, and keeps
  `/admin` out of reach of plain members.
- `src/lib/magic.ts` + `src/pages/api/login.ts` + `src/pages/api/magic.ts` —
  the login. `POST /api/login` accepts only `@secot.org` addresses present in
  `users`, stores a hashed one-time token (`magic_links`) and hands it to
  `src/lib/mailer.ts`; `GET /api/magic?token=…` consumes it atomically and
  issues the session cookie.
- `src/lib/auth.ts` — builds that cookie (Auth.js JWT, salt = cookie name);
  `src/lib/session.ts` proves the identity from it and reads role, name and
  existence from the database on **every request**, so promotions, demotions
  and removals apply immediately instead of lasting the 30 days of the token.
- `src/lib/mailer.ts` — how the link is delivered (`EMAIL_TRANSPORT`:
  `log` locally, `smtp` in production — Microsoft 365 on
  `smtp.office365.com:587` — or `resend`).
- `src/lib/states.ts` — the state machine (`propuesta → en estudio →
  realizada`). Routes, actions and UI must use its helpers; the same rules
  are enforced a second time by a Postgres trigger installed with
  `scripts/apply-db-guard.ts`.
- `src/actions/index.ts` — **the only place that mutates data**: add a
  topic, vote, unvote, transition state, fix the documentation link. Each
  handler re-checks role and transition server-side.
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
3. `npm run typecheck` (`astro check`) as well.

Manual smoke test for UI or flow changes: `/` renders, `/login` shows the
email-only form, requesting a link with a non-`secot.org` address or an
address that is not on the list shows the Spanish error, a valid link signs
you in (and cannot be replayed), submitting an invalid form shows field
errors, and anonymous requests to `/vote` redirect to `/login`. Run it against
`npm run preview`, not just `dev`: a form POST there must answer **302**, never
**403** (see the `allowedDomains` gotcha).

## Gotchas

- **Node version**: this machine now runs **Node 22.23.2** (LTS). Anything
  ≥ 22.20 is required — Astro 7 needs ≥ 22.12 and the Neon CLI ≥ 22.20.
  Older Node fails `astro check` with `ERR_REQUIRE_ESM`.
- **Astro 7 is the current stack** (7.3.5, upgraded from 5.18.2): Vite 8, the
  Rust compiler (which **errors on unclosed tags** instead of fixing them) and
  `compressHTML: "jsx"` (whitespace between inline elements is dropped — keep
  spacing in CSS, e.g. flex `gap`, or write `{" "}`). `npm audit` is clean for
  shipped code; the only remaining advisories are **4 moderate, dev-only** in
  `drizzle-kit`'s pinned `esbuild`, whose "fix" downgrades `drizzle-kit` to
  0.18.1 — not worth it.
- **Every served hostname must be in `security.allowedDomains`**
  (`astro.config.mjs`). Astro rebuilds the request URL only from hosts listed
  there; with an empty list it ignores the `Host` header and falls back to
  `http://localhost`, so `checkOrigin` compares against the wrong origin and
  answers **403 Cross-site POST form submissions are forbidden** to every form
  in `preview`/production (Vite's `dev` server is unaffected, which is why it
  only shows up when testing the real build). The list is built at config
  time from `localhost`, `microdosis-ia.vercel.app` and the hostname of
  `PUBLIC_SITE_URL` — **if the project is renamed or a custom domain is
  added, put the new hostname in `hosts`** (`astro.config.mjs`) and redeploy,
  or every form answers 403 in production.
- **Zod must stay on v4** (`^4.x`): Astro 6+ bundles Zod 4 in its action
  types, so Zod 3 breaks `astro check`. Note the deprecated string formats:
  use `z.uuid()` / `z.url()`, and for *trim first, validate second* write
  `z.string().trim().min(1, …).pipe(z.email(…))` — `z.email().trim()` validates
  **before** trimming and rejects padded input.
- **Astro actions are JSON-only by default**: any action called from an HTML
  form must declare `accept: "form"`, or every submit answers **415
  Unsupported Media Type**. Adding a new action? Copy the option.
- **No `.env` → login fails** with `error=config`: `AUTH_SECRET` (signs the
  session cookie) and `DATABASE_URL` (looks the address up) are required.
- **Mail**: `EMAIL_TRANSPORT=log` (the default) emails nothing — on localhost
  the link is shown on the page after submitting the form, and outside
  localhost the login refuses instead of silently losing links. Production is
  configured as **`EMAIL_TRANSPORT=smtp`** against Microsoft 365
  (`smtp.office365.com:587`, `SMTP_USER`/`SMTP_PASS` = the mailbox, an app
  password when MFA is on, `EMAIL_FROM` = that mailbox); `resend` is still
  supported as an alternative branch.
- **Antivirus intercepts SMTP STARTTLS on this machine**: Avast Mail Shield
  answers with a certificate issued by its own root (`Avast Web/Mail Shield
  Root`), which Node rejects with `self-signed certificate in certificate
  chain` because Node never reads the Windows cert store. Fix already in
  place: the root is exported to `.certs/avast-mail-shield-root.pem` (gitignored)
  and `SMTP_CA_FILE` points at it so `mailer.ts` trusts it *in addition to*
  Node's roots. Empty in production, where the real chain is used. Re-export
  it if Avast rotates the certificate, or if sending suddenly fails locally
  with that message.
- The database client is created lazily, so importing modules without a
  database configured does not break `npm run build`.
- The Postgres trigger from `npm run db:guard` raises an exception on an
  invalid transition or a `realizada` row without `documentation_url`; the
  app validates first, so this only fires for hand-made SQL updates.
- Session cookies are Auth.js JWTs; changing `AUTH_SECRET` signs everyone
  out.
