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
2. Run the database migrations **in order**. They live in `supabase/migrations/`
   — open each file in the Supabase **SQL editor** and run it (or use the Supabase
   CLI). Each is idempotent.
   - `0001_phase2_family_schema.sql` — `profiles`, `families`, `children`, their
     `updated_at` triggers, a trigger that auto-creates a `profiles` row on signup,
     and **Row Level Security** so each user only reads/writes their own family.
   - `0002_phase3_transactions.sql` — `transactions` and `csv_imports`, with RLS
     chained through `families.owner_user_id = auth.uid()`.
3. Confirm **Row Level Security is enabled** on every table (the migration enables
   it; verify under Authentication → Policies).
4. Email/password auth is enabled by default in Supabase Auth. For the smoothest
   local testing you can disable "Confirm email" (Authentication → Providers →
   Email) so signups log in immediately; otherwise use the emailed confirmation link.

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

**What's covered today (Phases 1–2):** utility helpers, route-protection logic,
Supabase client construction, UI primitives, the app nav, the landing / login /
signup / dashboard pages, the family/child validators, the families + children
data-access layer (against a mocked Supabase client), and the onboarding flow,
kid manager, family-name form, and settings view — 68 tests.

**Priority targets as features land:** CSV parsing, column mapping, transaction
validation, duplicate detection, AI JSON-schema validation, confidence-score
logic, parent-correction override logic, dashboard aggregation, and auth/protected-
route behavior.

---

## How to test the core flows (manual)

1. **Auth** — sign up at `/signup`; you're redirected to `/onboarding`. Log out and
   confirm protected routes bounce you to `/login`.
2. **Onboarding (family & kids)** — Step 1: enter a family name (try submitting it
   empty to see validation). Step 2: optionally add one or more kids by first
   name/nickname, or skip. Step 3: Continue to the dashboard. Visiting `/onboarding`
   again after setup redirects you to the dashboard; visiting any app route without
   a family redirects you back to onboarding.
3. **Settings (`/settings/family`)** — rename the family, and add / edit / archive
   kids. Archiving soft-deletes (the child is hidden but kept). The app works fine
   with zero kids.
4. **Manual entry** — `/transactions/new` (Manual tab) → enter `APPLE.COM/BILL`,
   amount `19.99`, today's date → Save. Try an empty form to see validation, and a
   negative amount (e.g. `-9.99`) to see the refund flag. It appears in the list.
5. **Receipt paste** — `/transactions/new` (Paste receipt tab) → paste receipt text
   → **Extract preview** pulls out merchant/amount/date (deterministic, no AI) →
   edit if needed → Save. (Real AI extraction/classification is Phase 4.)
6. **CSV upload** — `/transactions/upload` a small CSV (≤2 MB, ≤500 rows). Columns
   auto-map (or use the column mapper); preview shows valid / invalid (with reasons)
   / duplicate rows; **Import** saves valid, non-duplicate rows and shows a summary.
7. **Transactions list** — `/transactions` shows everything you've added (date,
   merchant, description, amount, source, status). Status is "Unclassified" until
   Phase 4.
8. **Dashboard** — `/dashboard` shows your saved-transaction count and recent
   transactions. Full spending analytics arrive after classification (Phase 4+).

> Phase 3 ingests and stores transactions only. AI classification, the review/
> correction workflow, weekly summary, and pricing pages come in later phases.

---

## Verify the database against a real Supabase project (RLS)

This confirms the schema, auth, onboarding, family/kid profiles, transactions,
CSV imports, and — most importantly — that **Row Level Security stops one user
from seeing another user's data.**

### A. One-time setup
1. **Create/open a project** at [supabase.com](https://supabase.com) → *New project*
   (free tier is fine). Wait for it to finish provisioning.
2. **Run the migrations in order.** Open *SQL Editor* → *New query*, paste the full
   contents of `supabase/migrations/0001_phase2_family_schema.sql`, *Run*; then do
   the same for `0002_phase3_transactions.sql`. Both are idempotent. Expect "Success".
3. **Confirm RLS is on.** *Authentication → Policies* should list policies for
   `profiles`, `families`, `children`, `transactions`, and `csv_imports`.
4. **Grab your keys.** *Project Settings → API*: copy the **Project URL**, the
   **anon public** key, and the **service_role** key.
5. **Create `.env.local`** in the repo root:
   ```bash
   cp .env.example .env.local
   ```
   Fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
   SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY
   ```
6. **(For the manual flow)** the smoothest local testing is with email confirmation
   off: *Authentication → Providers → Email* → turn **Confirm email** off. (The
   automated script below doesn't need this if `SUPABASE_SERVICE_ROLE_KEY` is set.)

### B. Automated RLS check (fastest)
```bash
npm run verify:rls
```
This signs in two separate users, has User A create a throwaway family, child,
transaction, and CSV import, then asserts User B **cannot** read, fetch-by-id,
insert into, update, or delete A's families/children/transactions/csv_imports — and
that A's data is untouched. It cleans up the throwaway family afterward (cascading to
its rows). Expect:
```
✓ RLS verification PASSED: all 20 checks. Test family cleaned up.
```
(If `SUPABASE_SERVICE_ROLE_KEY` is set it creates pre-confirmed test users; otherwise
disable "Confirm email" first so signups return a session.)

### C. Manual two-account RLS checklist
Use two browsers (or a normal + incognito window) so you have two sessions.

- [ ] **User A** — `npm run dev`, sign up at `/signup`, complete onboarding: create a
      family (e.g. "Family A") and add a kid (e.g. "Alex").
- [ ] **User A** — confirm the dashboard loads and `/settings/family` shows "Family A"
      and "Alex".
- [ ] **User B** — in the other browser, sign up with a different email and complete
      onboarding with a clearly different family (e.g. "Family B").
- [ ] **User B** — `/settings/family` shows **only** "Family B" and B's kids — never
      "Family A" or "Alex".
- [ ] **User B** — the dashboard shows only B's context; there is no way to reach A's
      data through the UI.
- [ ] **No-family redirect** — a brand-new third user is sent to `/onboarding` and
      cannot reach `/dashboard` until they create a family.
- [ ] **Re-onboarding guard** — after setup, visiting `/onboarding` redirects to
      `/dashboard`.
- [ ] **(Optional, deeper) direct API probe** — while logged in as User B, open the
      browser devtools console and run a read against A's table; RLS should return an
      empty set, never A's rows. The automated script in **B** does this for you.

If every box checks out, Phase 2's data isolation is verified.

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
