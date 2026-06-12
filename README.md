# Spend Lens

**Decode confusing kid-related digital spending and make it reviewable.**

Spend Lens is a parent-facing web app that turns cryptic charges — `APPLE.COM/BILL`,
`ROBLOX.COM`, `STEAMGAMES.COM`, `SQ *DIGITAL SERVICE` — into clear, reviewable
spending insights. Parents enter transactions manually, paste receipt text, or
upload a CSV. An AI classifier returns the likely **platform**, **category**,
**kid-related likelihood**, a **confidence score**, a **plain-English explanation**,
and — only when there's evidence — a suggested **child**. Parents can correct any
classification, and corrections teach future ones. A dashboard summarizes likely
kid-related spending by platform, category, child, and time period.

> This is an MVP focused on one job: **charge decoding + a readable dashboard.**
> It does **not** connect to banks, issue cards, send SMS/push, ship a mobile app,
> track screen time, or file refunds. See `BUILD_PLAN.md` for full scope.

---

## Tech stack

- **Next.js (App Router) + TypeScript**
- **Tailwind CSS**
- **Supabase** — Auth, Postgres, Row Level Security
- **Anthropic Claude API** for classification (OpenAI swappable behind one wrapper)
- **Zod** for strict AI-response validation
- **PapaParse** (CSV), **Recharts** (dashboard charts)
- Email (Resend/Postmark/Mailgun) and Stripe are **optional** and mocked/stubbed in the MVP

---

## Local setup

### Prerequisites
- Node.js 18+ (this repo developed on Node 24)
- A free [Supabase](https://supabase.com) project
- An Anthropic API key (or OpenAI key if you set `AI_PROVIDER=openai`)

### 1. Install
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```
Fill in `.env.local`:

| Variable | Required | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Supabase → Project Settings → API (**server-only secret**) |
| `AI_PROVIDER` | yes | `anthropic` (default) or `openai` |
| `AI_MODEL` | no | defaults to `claude-haiku-4-5` |
| `ANTHROPIC_API_KEY` | yes (if anthropic) | console.anthropic.com |
| `OPENAI_API_KEY` | yes (if openai) | platform.openai.com |
| `EMAIL_PROVIDER` + key | no | leave blank to mock weekly-summary email |
| `STRIPE_*` | no | leave blank — MVP uses a static pricing page |
| `NEXT_PUBLIC_APP_URL` | yes | `http://localhost:3000` for local |

> **Security:** `NEXT_PUBLIC_*` values reach the browser. The service-role and AI
> keys are server-side only and must never be exposed to the client.

### 3. Supabase setup
1. Create a new Supabase project.
2. In the SQL editor, run the schema + RLS policies (see `BUILD_PLAN.md` §5;
   the runnable SQL will live in `supabase/schema.sql` once Phase 2 is built).
3. Confirm **Row Level Security is enabled** on every table.
4. Email/password auth is enabled by default in Supabase Auth — no extra config
   needed for the MVP.

### 4. Run
```bash
npm run dev
```
Open http://localhost:3000.

### 5. Tests
```bash
npm test            # run the unit/component suite once
npm run test:watch  # re-run on change while developing
npm run test:coverage  # run with a V8 coverage report
```

---

## Testing

Automated tests are **mandatory** — no phase is considered complete until its
relevant tests are added and passing (see `BUILD_PLAN.md` Definition of Done and
the per-phase checklists in `TODO.md`).

**Stack**
- **Vitest** — test runner (jsdom environment)
- **React Testing Library** + `@testing-library/jest-dom` — component tests
- **Playwright** — reserved for end-to-end tests once core flows exist (not added yet)

**Conventions**
- Tests live in `__tests__/` mirroring `src/` (e.g. `__tests__/lib`, `__tests__/components`, `__tests__/pages`).
- Tests never make real network calls and never require real environment
  variables. External services (Supabase, AI APIs, Stripe, email) are mocked, and
  env vars are stubbed with `vi.stubEnv`.
- `next/navigation` and `next/link` are stubbed globally in `vitest.setup.ts` so
  router-dependent components render under jsdom.
- Pure business logic (route protection, CSV parsing, validation, aggregation,
  etc.) is extracted into framework-free modules so it can be unit-tested directly.

**What's covered today (Phase 1):** utility helpers, route-protection logic,
Supabase client construction, UI primitives, the app nav, and the landing / login
/ signup / dashboard pages — 39 tests.

**Priority targets as features land:** CSV parsing, column mapping, transaction
validation, duplicate detection, AI JSON-schema validation, confidence-score
logic, parent-correction override logic, dashboard aggregation, and auth/protected-
route behavior.

---

## How to test the core flows (manual)

1. **Auth** — sign up at `/signup`; you're redirected to `/onboarding`. Log out and
   confirm protected routes bounce you to `/login`.
2. **Family & kids** — create a family; optionally add kid nicknames. The app works
   fine with zero kids.
3. **Manual decode** — `/transactions/new` → enter `APPLE.COM/BILL`, `19.99`,
   today's date → submit. You should see a classification with confidence + a
   plain-English explanation; the child stays unassigned unless there's evidence.
4. **Receipt paste** — paste raw receipt text → preview the extracted transaction(s)
   → confirm to save + classify.
5. **CSV upload** — `/transactions/upload` a small CSV (≤500 rows). Confirm columns
   auto-map (or map them), preview valid/invalid/duplicate rows, then import.
6. **Review & correct** — open a transaction in the detail drawer, change the
   platform/category/kid-related/child, add a note, save. It's marked **Parent
   Verified** and the dashboard totals update.
7. **Dashboard** — check total likely kid-related spend, needs-review count, and the
   by-platform / by-category / by-child breakdowns.
8. **Weekly summary** — `/summary` shows a preview of the last 7 days (email send is
   mocked unless an email provider is configured).
9. **Pricing** — `/pricing` shows the static early-access plan (works with no Stripe).

---

## Project documents

- `BUILD_PLAN.md` — MVP definition, flows, routes, DB schema, API, AI schema + prompt,
  phases, testing, risks, decisions.
- `TODO.md` — ordered, phase-by-phase build checklist with done criteria.
- `.env.example` — all environment variables.
- Source of truth: `Spend Lens MVP - Product Requirements.pdf` and
  `Spend Lens MVP Feature Specifications.pdf`.

---

## Privacy (MVP stance)

Spend Lens is for **parents**, not children. It does not require bank logins, never
asks for or stores full card numbers, and doesn't sell or share transaction data.
Child profiles use first names or nicknames only. You can delete transactions at any
time. All data is protected by Supabase Row Level Security so you only ever see your
own family's data.
