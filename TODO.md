# Spend Lens — TODO

Ordered implementation checklist. **This file is the source of truth for build
order.** Do not jump ahead; do not pull V2 features in. Build with mock data before
wiring external services. After each phase, report: files created, files changed,
how to run, how to test, tests added + results, what remains.

**Testing is mandatory.** No phase is complete until its **Tests** checklist is
green (`npm test`). Each phase includes unit tests for business logic, component
tests for important UI, integration-style tests for API/data flow where practical,
and clear manual test steps. Tests never make real network calls and never require
real env vars (Supabase, AI, Stripe, email are mocked). See `BUILD_PLAN.md` for the
testing strategy and the per-phase Definition of Done.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Phase 0 — Planning (current)
- [x] Read PRD + FSD in full
- [x] `BUILD_PLAN.md`
- [x] `TODO.md`
- [x] `.env.example`
- [x] `README.md`
- [x] **Get founder approval on scope before writing app code**

**Done when:** all four planning files exist, scope + non-goals are explicit, and
the founder approves the plan.

---

## Phase 1 — App foundation  (est. 1–2 days)  ✅
- [x] Scaffold Next.js (App Router) + TypeScript + Tailwind (Next 16, React 19, Tailwind v4)
- [x] Add deps: `@supabase/supabase-js`, `@supabase/ssr`, `zod`
- [x] Supabase clients: browser client + server client (`@supabase/ssr` cookies)
- [x] `middleware.ts` to refresh session + gate protected routes
- [x] Pages: `/`, `/login`, `/signup` (email/password)
- [x] Protected app layout + top nav (Dashboard, Transactions, Settings, Sign out)
- [x] Empty `/dashboard` shell with `EmptyState` + placeholder summary cards
- [x] Auth UX: clear errors, redirect to `/onboarding` after first signup, sign out
- [x] Email-confirmation handler (`/auth/confirm`) + sign-out route
- [x] Placeholder pages for nav routes so the app is fully navigable

**Tests** ✅
- [x] Testing foundation: Vitest + React Testing Library + jsdom; `test` /
      `test:watch` / `test:coverage` scripts; global mocks for `next/navigation` + `next/link`
- [x] Unit: `cn`, `formatCurrency`, `isSupabaseConfigured`
- [x] Unit: route-protection logic (`isProtectedRoute`, `getAuthRedirect`)
- [x] Unit: Supabase browser client constructs with mocked env (no network)
- [x] Component: UI primitives (Button, Alert), AppNav, EmptyState, SectionPlaceholder
- [x] Component: landing, login, signup, and dashboard pages render
- [x] **39 tests passing**

**Done when:** app runs locally (`npm run dev`); a user can sign up, log in, and log
out; logged-out users hitting protected routes are redirected to `/login`; auth
state is reflected in the UI; **Phase 1 tests pass**.

**Status:** Build passes; dev server verified — landing/login/signup render and
`/dashboard` redirects to `/login`. Live auth (sign up / log in / log out) needs
Supabase keys in `.env.local`; everything is wired and ready for them.

---

## Phase 2 — Family & kid profiles  (est. 1 day)  ✅
- [x] SQL migration: `profiles`, `families`, `children` (`supabase/migrations/0001_phase2_family_schema.sql`)
- [x] **RLS policies on every table** (ownership chains to `auth.uid()`)
- [x] `profiles` row created on signup (trigger on `auth.users`)
- [x] `/onboarding`: 3 steps — create `family` (name required) → optional kids → continue
- [x] Kid CRUD: add (nickname/first name), edit, archive (`archived_at` soft-delete)
- [x] `/settings/family`: edit family name + manage kids
- [x] App works with **zero** kids (assignment nullable, no forced guessing)
- [x] Redirect logged-in users with no family back to `/onboarding` (in `(app)` layout)
- [x] Nav exposes Settings/Family when logged in (already present from Phase 1)

**Tests** ✅
- [x] Unit: family/kid form validation (`validateFamilyName`, `validateChildName`)
- [x] Unit: "no family → null" data access (`getFamilyForUser`) used by the redirect gate
- [x] Component: onboarding flow (renders, validation, submit creates family → step 2)
- [x] Component: kid add/edit/archive flows against the mocked Supabase service
- [x] Component: family-name form (renders, validation, save) + settings view renders
- [x] Integration: families + children data layer against a mocked Supabase client (no network)
- [x] Protected route/auth behavior regression stays green
- [x] RLS: enforced in the migration; live 2nd-user verification available via
      `npm run verify:rls` (automated script) + a manual checklist in the README —
      runs once a Supabase project + keys exist (no live DB in this environment yet)
- [x] **29 new tests; full suite 68 passing**

**Done when:** parent creates a family; can add/edit/archive kids; a second test
user cannot read or write the first user's family data (RLS verified); **Phase 2
tests pass**. ✅ (RLS code-complete; live cross-user verification pending a Supabase project.)

---

## Phase 3 — Transaction input  (est. 2 days)  ✅
- [x] SQL migration `0002_phase3_transactions.sql`: `transactions` + `csv_imports` + RLS
- [x] `ManualTransactionForm` (merchant, description, amount, date, optional raw text)
      with validation + refund (negative amount) flag → saves `source_type = manual`
- [x] `ReceiptPasteForm` → deterministic `extractReceiptPreview` (no AI) → editable
      preview → saves `source_type = receipt_paste`
- [x] `CsvUploader` (PapaParse, ≤2 MB, ≤500 rows, `.csv` only)
- [x] Auto-detect common columns (Date, Description, Merchant, Amount)
- [x] `ColumnMapper` for manual mapping when auto-detect is unsure
- [x] Preview valid + invalid (with per-row reasons) + duplicate rows
- [x] Duplicate detection via `duplicate_key`; skip within-file + existing dupes on import
- [x] `importCsvTransactions` data fn + `csv_imports` summary row (created/skipped/failed)
- [x] `/transactions` list page (date, merchant, description, amount, source, status) + empty state
- [x] `/dashboard` shows saved-transaction count + recent transactions + empty state
- [x] Data layer (`src/lib/data/transactions.ts`) + pure utils (`src/lib/transactions/*`)
- **Deferred to Phase 4 (intentional):** real AI classification; status is "Unclassified".
  Implemented via the data layer + browser-client bindings rather than `/api/*` routes
  (see BUILD_PLAN note).

**Tests** ✅ (priority targets covered)
- [x] Unit: **CSV parsing** (headers, quoted fields, blank rows)
- [x] Unit: **column mapping** (auto-detect + manual override)
- [x] Unit: **transaction validation** (amount numeric, valid date, merchant/description
      required, negative/refund amounts)
- [x] Unit: **duplicate detection** (`generateDuplicateKey` + import skip logic)
- [x] Unit: amount + date parsing, merchant normalization, receipt extraction
- [x] Component: ManualTransactionForm, ReceiptPasteForm, CsvUploader, ColumnMapper,
      CsvPreviewTable, TransactionTable, DashboardView
- [x] Integration: transactions data layer (incl. import dedup) against a mocked Supabase client
- [x] RLS verification script extended for transactions + csv_imports isolation (20 checks)
- [x] **46 new tests; full suite 114 passing; `npm run build` passes**

**Done when:** parent can add a transaction manually, paste a receipt and see an
extracted preview, and upload a CSV that imports valid rows while clearly explaining
invalid/duplicate rows. Transactions are saved in Supabase; **Phase 3 tests pass**. ✅

---

## Phase 4 — Classification  (est. 2–3 days)
- [ ] AI provider interface (`classifyTransaction`) — provider-agnostic
- [ ] **Mock classifier first** (deterministic, no API key needed) behind a flag
- [ ] Anthropic implementation (`@anthropic-ai/sdk`, default Haiku 4.5)
- [ ] System + user prompt from `BUILD_PLAN.md` §8
- [ ] Zod schema for AI JSON (`BUILD_PLAN.md` §7) + strict validation
- [ ] Apply `merchant_rules` before calling AI (cost control)
- [ ] Persist to `transaction_classifications` (incl. `raw_ai_response`, `model_name`)
- [ ] `needs_review` logic: force true if confidence < 0.70 or uncertain kid-child
- [ ] Retry on invalid JSON; final fallback → store as Needs Review, never crash
- [ ] `POST /api/transactions/classify` (one or many ids; retry-able)
- [ ] Wire classification into manual create + CSV import (batch, async-capable)

**Tests** (priority targets for this phase)
- [ ] Unit: **AI JSON-schema validation** (Zod) — valid, malformed, missing fields,
      out-of-enum platform/category, confidence out of range
- [ ] Unit: **confidence-score logic** → band/label + `needs_review` forcing
      (<0.70, or uncertain child on a kid-related charge)
- [ ] Unit: merchant-rule short-circuit (high-confidence rule applied before AI call)
- [ ] Unit: retry/fallback (invalid JSON → stored as Needs Review, never throws)
- [ ] Integration: classify route with **mocked AI provider** (no network); assert
      no child assigned without evidence
- [ ] Manual: classify a known charge; force a bad-JSON response → confirm safe fallback

**Done when:** manual and uploaded transactions receive a classification with
platform/category/kid-related/confidence/explanation; low-confidence results are
marked **Needs Review**; invalid AI output is handled safely and never breaks the
app; **Phase 4 tests pass**.

---

## Phase 5 — Dashboard & corrections  (est. 2 days)
- [ ] `GET /api/dashboard/summary` (totals + by platform/category/child + needs-review;
      filters: start_date, end_date, platform, category, child_id)
- [ ] `DashboardSummaryCards`: total kid-related spend, needs-review, top platform,
      last import/upload
- [ ] Charts: `PlatformSpendChart`, `CategorySpendChart`, `ChildSpendChart`
      (child chart only when children exist)
- [ ] Recent transactions + needs-review tables; clicking a card filters the table
- [ ] `/transactions`: full `TransactionTable` (Date, Merchant, Amount, Platform,
      Category, Child, Confidence, Status, Actions)
- [ ] Search + filters (platform / category / child / status)
- [ ] `ConfidenceBadge`, `KidRelatedBadge`, `ReviewStatusBadge` (no color-only signals)
- [ ] `TransactionDetailDrawer`: raw txn, AI classification, explanation, evidence,
      `CorrectionForm`, save button
- [ ] `PATCH /api/transactions/:id/correction`: save correction, mark Parent Verified,
      latest correction wins, recalc dashboard
- [ ] Optionally create/update a `merchant_rule` from a correction
- [ ] "Not kid-related" excluded from kid totals; parent-verified visually distinct

**Tests** (priority targets for this phase)
- [ ] Unit: **dashboard aggregation logic** (totals; by platform/category/child;
      needs-review count; excludes "not kid-related"; nets refunds/negatives)
- [ ] Unit: **parent-correction override logic** (latest correction wins; marks
      Parent Verified; totals recalculate)
- [ ] Component: TransactionTable, filters/search, TransactionDetailDrawer,
      CorrectionForm, Confidence/KidRelated/ReviewStatus badges
- [ ] Integration: correction PATCH → updated summary via mocked Supabase
- [ ] Manual: correct a Roblox txn → Parent Verified + dashboard totals update

**Done when:** dashboard summaries are accurate and load <2 s for ~1,000 txns;
parent corrections persist and update totals; corrected transactions are visibly
marked Parent Verified; empty states guide the user to add transactions; **Phase 5
tests pass**.

---

## Phase 6 — Weekly summary preview  (est. 1 day)
- [ ] Weekly summary generator (last 7 days): total kid-related, top
      platforms/categories, review-needed count → `weekly_summaries` row
- [ ] `/summary` preview page
- [ ] `MailProvider` interface; email send **mocked** unless provider env configured
- [ ] States: no kid-related spend; review prompt when items need review

**Tests**
- [ ] Unit: weekly summary generator (7-day window; totals; top platforms/categories;
      review-needed count)
- [ ] Unit: empty/"no kid-related spend" + review-prompt states
- [ ] Component: summary preview page
- [ ] Integration: `MailProvider` mock — email is NOT sent when no provider configured
- [ ] Manual: `/summary` reflects the last 7 days of transactions

**Done when:** parent can view a weekly summary preview that reflects recent
transactions; email is cleanly mocked when no provider is configured; **Phase 6
tests pass**.

---

## Phase 7 — Polish & launch prep  (est. 1–2 days)
- [ ] Loading / error / empty states across all pages
- [ ] Mobile-responsive pass (clear labels, visible button states, readable errors)
- [ ] Seed / mock data script for demos
- [ ] Basic privacy copy in onboarding (no bank data, no full card numbers, delete anytime)
- [ ] `/pricing` early-access page (works with no Stripe) + `/settings/billing` reuse
- [ ] Finalize `README.md` (setup, env, Supabase, run, test core flows)
- [ ] End-to-end smoke test of the full flow from a clean clone

**Tests**
- [ ] **Add Playwright** now that core flows exist (E2E env + config)
- [ ] E2E: signup → onboarding → add transaction → classify → correct → dashboard
- [ ] Component: loading / error / empty states across pages
- [ ] Full `npm test` suite green; coverage reviewed for the priority-target modules
- [ ] Manual: full end-to-end smoke from a clean clone following the README

**Done when:** the app is demo-ready; a brand-new tester can follow the README and
complete every core flow end-to-end locally; **the full test suite (unit + E2E)
passes**.

---

## Guardrails (apply to every phase)
- **A phase is not done until its Tests checklist is green (`npm test`).** Extract
  business logic into framework-free modules so it's unit-testable.
- Tests must not make real network calls or require real env vars; mock Supabase,
  AI APIs, Stripe, and email providers.
- Do **not** implement V1 non-goals: bank feeds, card issuing, SMS, push, mobile app,
  deep platform integrations, refund automation, screen-time, enterprise, child accounts.
- Keep API + service-role keys server-side; browser sees only the anon key.
- Never request or store full card numbers; don't log raw financial text.
- Prefer a working local app over visual polish.
- If a requirement is ambiguous, choose the simpler MVP path and note it.
