# Spend Lens — TODO

Ordered implementation checklist. **This file is the source of truth for build
order.** Do not jump ahead; do not pull V2 features in. Build with mock data before
wiring external services. After each phase, report: files created, files changed,
how to run, how to test, what remains.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Phase 0 — Planning (current)
- [x] Read PRD + FSD in full
- [x] `BUILD_PLAN.md`
- [x] `TODO.md`
- [x] `.env.example`
- [x] `README.md`
- [ ] **Get founder approval on scope before writing app code**

**Done when:** all four planning files exist, scope + non-goals are explicit, and
the founder approves the plan.

---

## Phase 1 — App foundation  (est. 1–2 days)
- [ ] Scaffold Next.js (App Router) + TypeScript + Tailwind
- [ ] Add deps: `@supabase/supabase-js`, `@supabase/ssr`, `zod`
- [ ] Supabase clients: browser client + server client (`@supabase/ssr` cookies)
- [ ] `middleware.ts` to refresh session + gate protected routes
- [ ] Pages: `/`, `/login`, `/signup` (email/password)
- [ ] Protected app layout + top nav (Dashboard, Transactions, Settings, Log out)
- [ ] Empty `/dashboard` shell with `EmptyState`
- [ ] Auth UX: clear errors, redirect to `/onboarding` after first signup, log out

**Done when:** app runs locally (`npm run dev`); a user can sign up, log in, and log
out; logged-out users hitting protected routes are redirected to `/login`; auth
state is reflected in the UI.

---

## Phase 2 — Family & kid profiles  (est. 1 day)
- [ ] SQL: create all tables from `BUILD_PLAN.md` §5
- [ ] **RLS policies on every table** (ownership chains to `auth.uid()`)
- [ ] `profiles` row created on signup
- [ ] `/onboarding`: create `family` (name required) → redirect to dashboard
- [ ] Kid CRUD: add (nickname/first name), edit, archive (`archived_at`)
- [ ] `/settings/family`: edit family name + manage kids
- [ ] App works with **zero** kids (assignment nullable, no forced guessing)
- [ ] Redirect logged-in users with no family back to `/onboarding`

**Done when:** parent creates a family; can add/edit/archive kids; a second test
user cannot read or write the first user's family data (RLS verified).

---

## Phase 3 — Transaction input  (est. 2 days)
- [ ] `ManualTransactionForm` (merchant/description, amount, date, optional raw text,
      optional source) with required-field validation
- [ ] `POST /api/transactions/manual` (save row; classification wired in Phase 4)
- [ ] `ReceiptPasteForm` → `POST /api/transactions/parse-receipt` (extract preview)
- [ ] Receipt: handle multi-purchase (line items), reject too-short/irrelevant text,
      ambiguous → ask for manual confirmation, failure → helpful recoverable error
- [ ] `CSVUploader` (PapaParse, ≤2 MB, ≤500 rows, `.csv` only)
- [ ] Auto-detect common columns (Date, Description, Merchant, Amount)
- [ ] `ColumnMapper` for manual mapping when unclear
- [ ] Preview valid + invalid rows with per-row reasons
- [ ] Duplicate detection via `duplicate_key`; skip/flag dupes
- [ ] `POST /api/transactions/upload-csv` → import + `csv_imports` summary row
- [ ] Import summary UI: created / skipped / failed

**Done when:** parent can add a transaction manually, paste a receipt and see an
extracted preview, and upload a CSV that imports valid rows while clearly explaining
invalid/duplicate rows. Transactions are saved in Supabase.

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

**Done when:** manual and uploaded transactions receive a classification with
platform/category/kid-related/confidence/explanation; low-confidence results are
marked **Needs Review**; invalid AI output is handled safely and never breaks the app.

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

**Done when:** dashboard summaries are accurate and load <2 s for ~1,000 txns;
parent corrections persist and update totals; corrected transactions are visibly
marked Parent Verified; empty states guide the user to add transactions.

---

## Phase 6 — Weekly summary preview  (est. 1 day)
- [ ] Weekly summary generator (last 7 days): total kid-related, top
      platforms/categories, review-needed count → `weekly_summaries` row
- [ ] `/summary` preview page
- [ ] `MailProvider` interface; email send **mocked** unless provider env configured
- [ ] States: no kid-related spend; review prompt when items need review

**Done when:** parent can view a weekly summary preview that reflects recent
transactions; email is cleanly mocked when no provider is configured.

---

## Phase 7 — Polish & launch prep  (est. 1–2 days)
- [ ] Loading / error / empty states across all pages
- [ ] Mobile-responsive pass (clear labels, visible button states, readable errors)
- [ ] Seed / mock data script for demos
- [ ] Basic privacy copy in onboarding (no bank data, no full card numbers, delete anytime)
- [ ] `/pricing` early-access page (works with no Stripe) + `/settings/billing` reuse
- [ ] Finalize `README.md` (setup, env, Supabase, run, test core flows)
- [ ] End-to-end smoke test of the full flow from a clean clone

**Done when:** the app is demo-ready; a brand-new tester can follow the README and
complete every core flow end-to-end locally.

---

## Guardrails (apply to every phase)
- Do **not** implement V1 non-goals: bank feeds, card issuing, SMS, push, mobile app,
  deep platform integrations, refund automation, screen-time, enterprise, child accounts.
- Keep API + service-role keys server-side; browser sees only the anon key.
- Never request or store full card numbers; don't log raw financial text.
- Prefer a working local app over visual polish.
- If a requirement is ambiguous, choose the simpler MVP path and note it.
