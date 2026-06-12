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

## Phase 4 — Classification  (est. 2–3 days)  ✅
- [x] SQL migration `0003_phase4_classification.sql`: `transaction_classifications`
      + `merchant_rules` + RLS (chained through the family)
- [x] Provider-agnostic `classifyTransaction` orchestrator (`src/lib/ai/classifier.ts`)
- [x] **Mock classifier** (deterministic, no key) — default `AI_PROVIDER=mock`
- [x] Real adapters (`anthropic` + `openai`) via fetch, behind `AI_PROVIDER` + server-only keys
- [x] System + user prompt (`src/lib/ai/prompt.ts`) — no-guess-child, strict JSON, cautious
- [x] Zod schema + strict validation (`src/lib/ai/schema.ts`)
- [x] Apply `merchant_rules` before calling AI (short-circuit, `model_provider='merchant_rule'`)
- [x] Persist to `transaction_classifications` (incl. `raw_model_output`, provider, model)
- [x] confidence→label + `needs_review` rules (<0.70 / unclear / uncertain child / fallback)
- [x] Child guardrail: never assign a child without evidence; strip unknown child + flag review
- [x] Safe fallback on error/timeout/invalid JSON → stored as Needs Review, never crashes
- [x] `POST /api/transactions/[id]/classify` + `POST /api/transactions/classify-batch` (≤50, resilient)
- [x] UI: classification columns, Classify + Classify-all buttons, explanation, **correction form**
- [x] Dashboard: classified / needs-review counts, by-category summary, recent
- [x] Server-only AI: keys never `NEXT_PUBLIC_`; frontend calls routes, not providers

**Tests** ✅ (priority targets covered)
- [x] Unit: **AI JSON-schema validation** (valid / bad enum / out-of-range / missing)
- [x] Unit: **confidence→label** + `needs_review` logic
- [x] Unit: child-assignment guardrail; merchant-rule matching + normalized matching
- [x] Unit: provider selection (mock vs real by env/key); fallback on error / timeout / invalid JSON
- [x] Unit: batch summary (continues after a failure); mock classifier behavior
- [x] Component: classification fields, needs-review badge, Classify + Classify-all, explanation, correction form, dashboard counts
- [x] API routes: unauthenticated rejected, cross-family 404, valid classify saves, batch continues after failure
- [x] RLS verification extended for classifications + merchant_rules (now **28 checks**)
- [x] **42 new tests; full suite 156 passing; `npm run build` passes; mock mode needs no key**

**Done when:** manual and uploaded transactions receive a classification with
platform/category/kid-related/confidence/explanation; low-confidence results are
marked **Needs Review**; invalid AI output is handled safely and never breaks the
app; **Phase 4 tests pass**. ✅

---

## Phase 5 — Dashboard analytics & review workflow  (est. 2 days)  ✅
- [x] **No new tables/RLS** — reused transactions/classifications/merchant_rules/children/families
- [x] Pure analytics layer (`src/lib/analytics.ts`): `summarizeDashboard`, `filterTransactions`,
      `sortTransactions`, `filterByDateRange`, `groupSpendBy{Category,Platform,Child,KidLikelihood}`,
      `getReviewQueue`, `calculateNeedsReviewCounts`, `parseTransactionQuery`, `facetsFromRows`
- [x] `/dashboard`: date-range filter (7/30/90/all), counts, likely + unclear kid spend,
      spend bars by category/platform/child/kid-likelihood, recent needs-review + classified
- [x] `GET /api/dashboard/summary` (auth, own family only, range filter)
- [x] `SpendBarChart` (CSS bars — no chart dependency), `DateRangeFilter`
- [x] `/transactions`: search + filters (status/category/platform/child/confidence/source) + sort
- [x] `/transactions/review` review queue (unclassified / low / unclear / needs_review) + filters
- [x] `TransactionFilters` bar syncing to URL query params; clear empty states
- [x] Correction form extended: platform, **merchant family**, category, kid-related, child,
      **note**, **keep-flagged-for-review**; overrides AI → Parent verified; optional merchant rule
- [x] Conservative language ("likely" / "unclear" / "needs review"); no "fraud"/"unauthorized"
- [x] `StatusBadge`/`ConfidenceBadge`/`KidRelatedBadge` (text, not color-only); Review nav link

**Tests** ✅ (priority targets covered)
- [x] Unit: dashboard aggregation; date-range filtering; category/platform/child/kid-likelihood
      grouping; needs-review counts; transaction filtering + sorting; review-queue selection;
      query parsing; facets
- [x] Unit: parent-correction override (merchant_family/note/needs_review) via `saveCorrection`
- [x] Component: dashboard cards + breakdowns, date filter, spend bar chart, filters bar,
      review queue empty + filled, correction form improvements
- [x] API route: unauthenticated rejected; summary scoped to own family; range filter affects summary
- [x] **30 new tests; full suite 186 passing; `npm run build` passes**

**Done when:** dashboard summaries are accurate; parent corrections persist and mark Parent
Verified; review queue + filters/search work; empty states are clear; dashboard numbers derive
only from the authenticated user's own data; **Phase 5 tests pass**. ✅

---

## Phase 6 — Weekly summary preview  (est. 1 day)  ✅
- [x] SQL migration `0004_phase6_weekly_summaries.sql`: `weekly_summaries` + RLS
      (unique `family_id,period_start,period_end` so regenerate upserts)
- [x] Pure generator (`src/lib/weekly-summary.ts`): `generateWeeklySummary`,
      `summarizeLastSevenDays`, `getWeeklyDateRange`, `getWeeklySummaryState`,
      `buildWeeklySummarySections`, `formatWeeklySummaryText` (reuses analytics)
- [x] States handled: no transactions / none classified / no kid spend / needs review
      / low-confidence / refunds (netted) / children-but-no-assignments / no children
- [x] `/summary` page (period, cards, plain-English text, top categories/platforms,
      child breakdown, needs-review section, back-to-dashboard, Regenerate, mock email button)
- [x] `MailProvider` interface + `MockMailProvider` (`src/lib/mail/*`); `isEmailEnabled`;
      **no real send** — default `MAIL_PROVIDER=mock`
- [x] Data layer (`src/lib/data/weekly-summaries.ts`): create/getLatest/list/updateStatus
- [x] `POST /api/summary/weekly/preview` + `GET /api/summary/weekly/latest` (auth, own family)
- [x] Conservative language ("likely"/"unclear"/"needs review"/"possible"; no "fraud"/"unauthorized")

**Tests** ✅
- [x] Unit: generator (7-day window, totals, top categories/platforms, JSON shape, text);
      states (no transactions / none classified / no kid spend / needs-review prompt);
      refund netting; child breakdown; date range; mail provider mock + `isEmailEnabled`
- [x] Component: summary view (period/text, cards/sections, needs-review, child breakdown,
      empty state, regenerate + disabled mock email button)
- [x] API route: unauthenticated 401; creates preview from own family; no-transactions →
      safe empty summary; never sends email
- [x] Data layer: `createWeeklySummaryPreview` upsert + `getLatestWeeklySummary`
- [x] RLS verification extended for `weekly_summaries` (now **36 checks**)
- [x] **22 new tests; full suite 208 passing; `npm run build` passes; mock works with no keys**

**Done when:** parent can view a weekly summary preview that reflects recent
transactions; email is cleanly mocked when no provider is configured; **Phase 6
tests pass**. ✅

---

## Phase 7 — Polish & launch prep  (est. 1–2 days)  ✅
- [x] **No new tables/RLS** — reused all existing tables; `verify:rls` unchanged (36 checks, passing)
- [x] Loading + error boundary for the authed area (`(app)/loading.tsx`, `(app)/error.tsx`)
      with a migration/setup hint; friendly `not-found.tsx`
- [x] Improved empty states (review queue "all caught up", dashboard "no transactions in range",
      filtered "no matching transactions")
- [x] Mobile-responsive pass: scrollable nav (every link reachable on small screens),
      horizontally-scrollable tables, wrapping filter bar, responsive card grids
- [x] Demo data: `src/lib/demo-data.ts` + `npm run seed:demo` (safe, non-destructive) +
      `demo-data/sample-transactions.csv` + `demo-data/sample-receipt.txt`
- [x] Privacy/trust copy in onboarding, CSV upload, receipt paste, weekly summary, and pricing
      (`PrivacyNote`) — honest, no legal guarantees
- [x] `/pricing` static early-access page (free beta, $10–$20 planned, CTA, no checkout) +
      `/settings/billing` "not enabled — free beta" placeholder; nav/landing link
- [x] `README.md` finalized (features, stack, env, migration order, run/test, mock AI + mail,
      demo flow, E2E, known limitations / not built)

**Tests** ✅
- [x] **Playwright** added (config + `e2e/smoke.spec.ts`); `test:e2e` / `test:e2e:ui` scripts —
      public-pages smoke (landing/login/signup/pricing + protected redirect); **4/4 passing**
- [x] Component: pricing page, billing placeholder, error boundary + retry, loading skeleton,
      not-found, `PrivacyNote`, privacy copy in receipt flow
- [x] Unit: demo-data helper (valid drafts, refund, last-7-days dates)
- [x] **10 new unit/component tests; full suite 218 passing; `npm run build` passes**
- [x] E2E documented as intentionally public-only (auth flow covered by unit/component + manual)

**Done when:** the app is demo-ready; a brand-new tester can follow the README and
complete every core flow end-to-end locally; **the full test suite (unit + E2E)
passes**. ✅

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
