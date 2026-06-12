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
| `AI_PROVIDER` | no | `mock` (default), `anthropic`, or `openai` — **server-only** |
| `AI_MODEL` | no | optional model override (defaults per provider) |
| `ANTHROPIC_API_KEY` | only if `anthropic` | console.anthropic.com (**server-only**) |
| `OPENAI_API_KEY` | only if `openai` | platform.openai.com (**server-only**) |
| `MAIL_PROVIDER` (+ `RESEND_API_KEY`, `SUMMARY_EMAIL_FROM`) | no | `mock` default; MVP never sends real email |
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
   - `0003_phase4_classification.sql` — `transaction_classifications` and
     `merchant_rules`, with RLS chained through the owning family.
   - `0004_phase6_weekly_summaries.sql` — `weekly_summaries` (one preview per
     family + period), with RLS chained through the owning family.
   - `0005_phase7_pdf_upload_source.sql` — allows the `pdf_upload` source type on
     `transactions` (no new table, no RLS change).
3. Confirm **Row Level Security is enabled** on every table (the migration enables
   it; verify under Authentication → Policies).
4. Email/password auth is enabled by default in Supabase Auth. For the smoothest
   local testing you can disable "Confirm email" (Authentication → Providers →
   Email) so signups log in immediately; otherwise use the emailed confirmation link.

### 3b. AI classification mode
Classification runs **server-side only** — provider API keys are never exposed to
the browser and must not be `NEXT_PUBLIC_`.

- **Mock mode (default):** with `AI_PROVIDER=mock` (or unset), a deterministic
  classifier runs with **no API key**. It usefully classifies common gaming /
  app-store merchants (Roblox, Apple, Steam, …) so the whole app works offline.
- **Real provider:** set `AI_PROVIDER=anthropic` (+ `ANTHROPIC_API_KEY`) or
  `AI_PROVIDER=openai` (+ `OPENAI_API_KEY`). Optionally set `AI_MODEL`. If the
  selected provider's key is missing, it **safely falls back to mock**. If a real
  call errors, times out, or returns invalid JSON, the transaction is saved as
  **Needs review** rather than crashing.

### 4. Run
```bash
npm run dev
```
Open http://localhost:3000.

### 5. Tests
```bash
npm test               # unit/component suite (Vitest), 218 tests
npm run test:watch     # re-run on change while developing
npm run test:coverage  # run with a V8 coverage report
npm run test:e2e       # Playwright smoke test (public pages) — see "End-to-end" below
```

### 6. Demo data (optional)
- **Upload sample data:** in the app, upload `demo-data/sample-transactions.csv`
  or paste `demo-data/sample-receipt.txt`, then click **Classify all unclassified**.
- **Seed a demo user (safe):** set `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` in
  `.env.local` and run `npm run seed:demo`. It inserts sample transactions for
  **that one user only**, never deletes anything, and never calls AI or sends email.

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

**What's covered today (Phases 1–4):** auth/route-protection, families/children +
transactions data layers, CSV parsing/mapping/validation/dedup, receipt extraction,
the **AI classifier** (schema validation, confidence/needs-review logic, child
guardrails, merchant-rule matching, provider selection, timeout/error/invalid-JSON
fallback, batch summary, mock mode), the classify/correction API routes (auth +
ownership + batch resilience), the **analytics layer** (date-range/filter/sort,
category/platform/child/kid-likelihood grouping, needs-review counts, review queue,
dashboard summary, query parsing), the **weekly-summary generator** (states, date
range, text, JSON shape, refunds) + mock mail provider, and the transaction / review
/ dashboard / summary UI, plus the pricing/billing/empty/error states and demo-data
helper, and the **PDF statement parser** (row detection, date/amount parsing,
metadata filtering, scanned-PDF handling) + parse-pdf route — 238 unit/component
tests + a Playwright public-pages smoke test. No test calls a real AI API, sends
email, or uploads a real PDF.

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
6. **Statement upload** — `/transactions/upload` has two tabs:
   - **CSV (preferred):** ≤2 MB, ≤500 rows; columns auto-map (or use the mapper).
   - **PDF statement:** for **digital/text** statements (not scanned images), ≤5 MB.
     The PDF is read in memory and **never stored** — only the transaction rows you
     import are saved. Scanned/image-only PDFs show a clear "can't read it yet" message.
   Both preview valid / invalid (with reasons) / duplicate rows, then **Import** saves
   valid, non-duplicate rows with a created/skipped/failed summary.
7. **Transactions list** — `/transactions` shows everything you've added with a
   **filter bar**: search merchant/description, filter by status / category /
   platform / child / confidence / source, and sort by date / amount / confidence /
   recently-added. Each unclassified row has a **Classify** button; the header has
   **Classify all unclassified**.
8. **Classify** — click **Classify** (or **Classify all unclassified**). Mock mode
   needs no API key. Low-confidence or unclear charges are marked **Needs review**
   and never get a child assigned without evidence.
9. **Review queue** — `/transactions/review` (also linked from the nav and the
   dashboard "Needs review" card) lists only transactions that are unclassified,
   low-confidence, unclear, or flagged — with the same filters/search. "You're all
   caught up" shows when the queue is empty.
10. **Review & correct** — open **Details** on a row to read the plain-English
    explanation and correct platform / merchant family / category / kid-related
    status / child, add a note, or keep it flagged for review. Your correction
    overrides the AI (marks it **Parent verified**); tick "Remember this for similar
    charges" to save a merchant rule that pre-fills future matches.
11. **Dashboard** — `/dashboard` shows a **date-range filter** (7/30/90 days, all
    time) and parent-facing summaries: transaction / classified / needs-review
    counts, **likely** and **unclear** kid-related spend, spend bars by category /
    platform / child / kid-related likelihood, and recent needs-review + classified
    lists. The same numbers are available at `GET /api/dashboard/summary?range=…`
    (auth required; your family only).
12. **Weekly summary** — `/summary` shows a last-7-days preview in plain English:
    the period, summary cards, top categories/platforms, a child breakdown (if any),
    and a needs-review section. It handles every state conservatively (no
    transactions / none classified / no likely kid spend / needs review).
    **Regenerate preview** saves a snapshot (`weekly_summaries`). Email is **mocked**:
    the button shows "Email sending not enabled" unless a mail provider is configured —
    no email is ever sent in the MVP.

13. **Pricing** — `/pricing` (public; also linked from the landing page) shows the
    static early-access plan: free during beta, planned $10–$20/month per family,
    honest expectations, and privacy copy. No checkout. `/settings/billing` shows a
    "billing not enabled — free beta" placeholder.

> **Mail is mock-safe.** `MAIL_PROVIDER` defaults to `mock` (no key, no send). Set
> `MAIL_PROVIDER=resend` + `RESEND_API_KEY` to *label* email as enabled; the MVP
> still never sends. Real scheduled email is a later phase.

> Phase 7 polishes the MVP for beta: loading/error/empty states, a mobile-responsive
> pass, the static pricing page, privacy copy, a demo seed, and a Playwright smoke test.

---

## Verify the database against a real Supabase project (RLS)

This confirms the schema, auth, onboarding, family/kid profiles, transactions,
CSV imports, classifications, merchant rules, and — most importantly — that **Row
Level Security stops one user from seeing another user's data.**

### A. One-time setup
1. **Create/open a project** at [supabase.com](https://supabase.com) → *New project*
   (free tier is fine). Wait for it to finish provisioning.
2. **Run the migrations in order** in *SQL Editor* → *New query*: paste/Run
   `0001` → `0002` → `0003` → `0004` → `0005_phase7_pdf_upload_source.sql`. All are
   idempotent. Expect "Success" each time. (`0005` only widens a check constraint, so
   the 36-check RLS verification is unchanged.)
3. **Confirm RLS is on.** *Authentication → Policies* should list policies for
   `profiles`, `families`, `children`, `transactions`, `csv_imports`,
   `transaction_classifications`, `merchant_rules`, and `weekly_summaries`.
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
transaction, CSV import, classification, merchant rule, and weekly summary, then
asserts User B **cannot** read, fetch-by-id, insert into, update, or delete any of
A's rows across all of those tables — and that A's data is untouched. It cleans up
the throwaway family afterward (cascading to its rows). Expect:
```
✓ RLS verification PASSED: all 36 checks. Test family cleaned up.
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

If every box checks out, data isolation is verified.

---

## End-to-end (Playwright)

A small smoke test confirms the app boots and public pages render:
```bash
npx playwright install chromium   # one-time
npm run test:e2e                  # starts a dev server + runs the smoke test
npm run test:e2e:ui               # interactive mode
```
It deliberately covers **public** routes only (landing / login / signup / pricing,
plus the protected-route → login redirect), so it needs **no Supabase credentials**
and stays non-flaky. The authenticated journey (onboarding → add → classify →
correct → dashboard → summary) is covered by the unit/component suite and the demo
flow above. It is separate from `npm test` and won't make the unit suite flaky.

---

## Known limitations & what's intentionally not built

**MVP scope is charge decoding + review.** Deliberately out of scope for now:
bank-feed connections, card issuing, SMS/push alerts, a mobile app, Stripe checkout,
real scheduled emails, email receipt forwarding, refund automation, screen-time
tracking, enterprise/multi-parent accounts, child-facing accounts, and legal/financial
advice.

Other current limitations:
- **AI is mock by default** and, with a real provider, returns cautious suggestions —
  it isn't authoritative. Parents correct anything that's wrong.
- **Email is mocked** — the weekly-summary email button never sends in the MVP.
- **No pagination** — pages render the full filtered list (fine for MVP volumes).
- **Analytics run in memory** per request rather than as SQL aggregates.
- **Date parsing** handles ISO + US slash formats; other locale formats are flagged
  invalid in CSV/PDF preview for you to fix.
- **PDF import is text-only** — scanned/image PDFs aren't supported (no OCR). The raw PDF
  is never stored. Extraction is coordinate-aware (it rebuilds the statement's rows) and
  parsing uses generic heuristics — verified on real Wells Fargo (checking) and Capital One
  (credit card) statements. Debit/credit sign is inferred (purchases positive, payments/
  deposits negative), so review the preview; unusual layouts may still need a CSV export.
  No bank login, no AI, no external upload.
- **Pricing/billing are static** — no checkout; Spend Lens is in free beta.

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
