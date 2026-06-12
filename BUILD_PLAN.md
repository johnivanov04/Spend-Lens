# Spend Lens — Build Plan

> Source of truth: `Spend Lens MVP - Product Requirements.pdf` (PRD) and
> `Spend Lens MVP Feature Specifications.pdf` (FSD). This file translates both
> into an engineering plan. Where the two documents differ, the resolution is
> noted in **Decisions & Assumptions**.

---

## 0. Product promise (and the anti-promise)

- **Promise:** *Decode confusing kid-related digital spending and make it reviewable.*
- **Not the promise:** *Perfectly control every child purchase across every platform.*

Spend Lens is a **parent-facing charge decoder**. A parent pastes, types, or
uploads a transaction (e.g. `APPLE.COM/BILL`, `ROBLOX.COM`, `SQ *DIGITAL SERVICE`)
and gets back: platform, category, kid-related likelihood, a confidence score, a
plain-English explanation, and — only when there is evidence — a suggested child.
Parents can correct anything, and corrections teach future classifications.

---

## 1. Final narrowed MVP definition

### In scope (must build)
1. Parent auth (email/password via Supabase Auth)
2. Family profile setup (onboarding)
3. Optional kid profiles (CRUD, archivable)
4. Manual transaction entry
5. Receipt text paste → AI extraction → preview → save
6. CSV upload → auto column detect → manual mapping → preview → import
7. AI transaction classification (strict JSON, confidence, explanation, evidence)
8. Parent correction workflow + merchant correction rules
9. Transaction review table (search, filters, detail drawer)
10. Dashboard summaries (total kid-related, by platform / category / child, needs-review)
11. Weekly summary **preview** (email send mockable)
12. Static early-access pricing page
13. Basic privacy messaging in onboarding
14. README + local setup

### Explicitly NOT in V1 (guard against scope creep — Risk 3/5)
Bank feeds, card issuing, mobile app, SMS alerts, push notifications, deep
Apple/Google/Roblox/Steam integrations, automatic refund filing, legal/financial
advice, screen-time tracking, enterprise accounts, child-facing accounts, browser
extension, complex marketing funnel, production-grade compliance automation.

### MVP is "done" when
A new tester can, from the README, run the app locally and: sign up → create a
family → add optional kids → add ≥10 transactions (manual / paste / CSV) →
see AI classifications with confidence + explanation → correct one → watch the
dashboard update → view a weekly summary preview → view the pricing page. RLS
prevents cross-family data access. Invalid AI output never crashes the app.

---

## 2. Tech stack

| Layer | Choice | Notes |
|------|--------|------|
| Framework | **Next.js (App Router) + TypeScript** | Server Components where practical; Client Components for forms, uploads, filters, correction UI |
| Styling | **Tailwind CSS** | Calm, trustworthy, non-alarmist; mobile-responsive |
| Auth | **Supabase Auth** | Email/password; session via `@supabase/ssr` cookies |
| DB | **Supabase Postgres + RLS** | User-owned family data model; RLS on every table |
| AI | **Anthropic Claude API** (default) | `@anthropic-ai/sdk`; OpenAI swappable behind one wrapper. Default model: **Claude Haiku 4.5** for classification (cheap/fast, meets <15s), escalate to Sonnet for hard cases later |
| Validation | **Zod** | Validate every AI JSON response against the schema before persisting |
| CSV | **PapaParse** | Client-side parse + preview; server-side validate + import |
| Charts | **Recharts** | Platform / category / child bar charts |
| Email | **Mocked in MVP** | Resend/Postmark/Mailgun behind a `MailProvider` interface, off by default |
| Payments | **Static pricing page only** | Stripe deferred; env vars stubbed |
| Deploy | Vercel (local-first for MVP) | — |

**Key security stance:** AI + service-role keys are **server-side only**. The
browser only ever sees the Supabase anon key. No full card numbers are requested
or stored. Raw receipt/CSV text stored only when needed; never logged verbatim.

---

## 3. Core user flows

1. **Auth & onboarding:** signup → create `family` → optionally add `children` →
   read privacy blurb → land on empty `/dashboard`. Missing family profile always
   redirects back to `/onboarding`.
2. **Manual decode:** `/transactions/new` → enter merchant/description/amount/date →
   submit → classify → row appears in table + dashboard with confidence + explanation.
3. **Receipt paste:** paste raw text → `POST /api/transactions/parse-receipt` →
   AI extracts candidate transaction(s) + line items → **preview** → confirm → save +
   classify. Ambiguous/short text → ask for manual confirmation, never fabricate.
4. **CSV import:** upload (≤2 MB, ≤500 rows) → auto-detect columns → manual map if
   unclear → preview valid/invalid rows → confirm → import (skip/flag duplicates) →
   batch classify (async-capable). Import summary: created / skipped / failed.
5. **Review & correct:** `/transactions` table → filter/search → open detail drawer →
   edit platform/category/kid-related/child + note → save → marked **Parent Verified**,
   dashboard recalculates, optional **merchant rule** created for future matches.
6. **Dashboard:** total likely kid-related spend, needs-review count, top platform,
   last import; charts by platform/category/child; recent + needs-review tables.
7. **Weekly summary preview:** `/summary` shows last-7-days kid-related total, top
   platforms/categories, review count. Email send is mocked unless a provider is set.

---

## 4. App routes / pages

| Route | Auth | Purpose |
|------|------|---------|
| `/` | public | Landing: product explanation + CTA to sign up |
| `/login` | public | Login form |
| `/signup` | public | Signup form |
| `/onboarding` | protected | Create family, add optional kids, privacy basics |
| `/dashboard` | protected | Summary cards, charts, recent + needs-review tables |
| `/transactions` | protected | Full table: search, filters, detail drawer/correction |
| `/transactions/new` | protected | Manual entry form + receipt paste form (tabs) |
| `/transactions/upload` | protected | CSV upload → mapping → preview → confirm import |
| `/settings/family` | protected | Edit family name, manage kids (add/edit/archive) |
| `/settings/billing` | protected | Static early-access pricing (links to/embeds `/pricing`) |
| `/pricing` | public | Early-access pricing page |
| `/summary` | protected | Weekly summary preview |

Protected routes are gated in `middleware.ts` + per-route session checks; a
logged-out visitor hitting any protected route is redirected to `/login`. A
logged-in user with no `family` row is redirected to `/onboarding`.

### Core components (from FSD)
`DashboardSummaryCards`, `PlatformSpendChart`, `CategorySpendChart`,
`ChildSpendChart`, `TransactionTable`, `TransactionDetailDrawer`, `ConfidenceBadge`,
`KidRelatedBadge`, `ReviewStatusBadge`, `CSVUploader`, `ColumnMapper`,
`ReceiptPasteForm`, `ManualTransactionForm`, `CorrectionForm`, `EmptyState`,
`LoadingState`, `ErrorAlert`.

---

## 5. Database schema

All tables carry RLS. Ownership chains to `auth.uid()` through
`families.owner_user_id`. Timestamps default `now()`.

```sql
-- profiles: parent metadata, 1:1 with auth.users
create table profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- families: the data container; everything chains to this
create table families (
  id             uuid primary key default gen_random_uuid(),
  owner_user_id  uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- children: optional kid profiles (nicknames/first names only)
create table children (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references families(id) on delete cascade,
  name         text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz
);

-- transactions: raw transaction data from any source
create table transactions (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references families(id) on delete cascade,
  source_type       text not null default 'manual'
                    check (source_type in ('manual','receipt_paste','csv_upload','email_forward_later','bank_feed_later')),
  merchant          text,
  description        text,
  amount            numeric,
  currency          text not null default 'USD',
  transaction_date  date,
  raw_text          text,
  source_file_name  text,
  duplicate_key     text,          -- hash(family_id|norm_merchant|amount|date)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on transactions (family_id);
create unique index on transactions (family_id, duplicate_key) where duplicate_key is not null;

-- transaction_classifications: AI output (raw response retained)
create table transaction_classifications (
  id                         uuid primary key default gen_random_uuid(),
  transaction_id             uuid not null references transactions(id) on delete cascade,
  platform                   text,
  category                   text,
  is_kid_related             boolean,
  child_id                   uuid references children(id) on delete set null,
  confidence                 numeric,
  plain_english_explanation  text,
  needs_review               boolean,
  model_name                 text,
  raw_ai_response            jsonb,
  created_at                 timestamptz not null default now()
);
create index on transaction_classifications (transaction_id);

-- transaction_corrections: parent edits + audit trail (latest = active)
create table transaction_corrections (
  id                  uuid primary key default gen_random_uuid(),
  transaction_id      uuid not null references transactions(id) on delete cascade,
  corrected_by_user_id uuid not null references auth.users(id) on delete cascade,
  platform            text,
  category            text,
  is_kid_related      boolean,
  child_id            uuid references children(id) on delete set null,
  parent_note         text,
  created_at          timestamptz not null default now()
);
create index on transaction_corrections (transaction_id, created_at desc);

-- merchant_rules: parent-specific learned rules applied before calling the AI
create table merchant_rules (
  id                          uuid primary key default gen_random_uuid(),
  family_id                   uuid not null references families(id) on delete cascade,
  merchant_pattern            text not null,
  platform                    text,
  category                    text,
  is_kid_related              boolean,
  child_id                    uuid references children(id) on delete set null,
  confidence                  numeric not null default 1.0,
  created_from_transaction_id uuid references transactions(id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index on merchant_rules (family_id);

-- csv_imports: tracks upload sessions
create table csv_imports (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references families(id) on delete cascade,
  file_name      text,
  row_count      integer,
  created_count  integer,
  skipped_count  integer,
  failed_count   integer,
  status         text,           -- pending | classification_pending | completed | failed
  created_at     timestamptz not null default now()
);

-- weekly_summaries: generated previews / sent records
create table weekly_summaries (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families(id) on delete cascade,
  week_start    date,
  week_end      date,
  summary_json  jsonb,
  email_status  text,            -- mocked | queued | sent | skipped
  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);
```

### RLS pattern (applied to every table)
- Enable RLS on all tables.
- `profiles`: row visible/editable where `user_id = auth.uid()`.
- `families`: where `owner_user_id = auth.uid()`.
- All child tables (`children`, `transactions`, `merchant_rules`, `csv_imports`,
  `weekly_summaries`): visible/editable where the row's `family_id` belongs to a
  family owned by `auth.uid()` (subquery against `families`).
- `transaction_classifications` / `transaction_corrections`: chain through
  `transactions → families.owner_user_id = auth.uid()`.
- Server-side privileged writes (AI classification inserts, batch imports) use the
  **service-role key** in API routes only, never exposed to the client.

### Status derivation (not a stored column — derived from data)
- **Failed** — classification attempt errored / invalid JSON after retries.
- **Unclassified** — no classification yet (queued/pending).
- **Parent Verified** — a `transaction_corrections` row exists (latest wins).
- **Needs Review** — classification exists and `needs_review = true`.
- **Classified** — classification exists, `needs_review = false`, no correction.

---

## 6. API routes

| Method | Path | Purpose |
|------|------|------|
| POST | `/api/transactions/manual` | Create one transaction + classify it |
| POST | `/api/transactions/parse-receipt` | AI-extract candidate transaction(s) from pasted text (preview, no save) |
| POST | `/api/transactions/upload-csv` | Import mapped CSV rows (skip/flag dupes), queue batch classify |
| POST | `/api/transactions/classify` | Classify one or more existing transaction IDs (retry-able) |
| PATCH | `/api/transactions/:id/correction` | Save parent correction, mark verified, optionally create merchant rule |
| GET | `/api/dashboard/summary` | Aggregated totals; query params `start_date,end_date,platform,category,child_id` |

Representative contracts (full examples in PRD §11 / FSD §9):

```jsonc
// POST /api/transactions/manual  →  request
{ "merchant": "APPLE.COM/BILL", "description": "APPLE.COM/BILL 866-712-7753 CA",
  "amount": 19.99, "date": "2026-06-11", "raw_text": "optional" }
// response
{ "transaction_id": "uuid", "classification_status": "completed",
  "classification": { "platform": "Apple", "category": "In-app purchase",
    "is_kid_related": true, "confidence": 0.82, "child_id": null,
    "plain_english_explanation": "Likely an App Store or in-app purchase…",
    "needs_review": true } }

// POST /api/transactions/upload-csv  →  response
{ "import_id": "uuid", "created_count": 42, "skipped_duplicates": 3,
  "failed_count": 2, "status": "classification_pending" }

// PATCH /api/transactions/:id/correction  →  response
{ "transaction_id": "uuid", "verified_by_parent": true, "updated": true }

// GET /api/dashboard/summary  →  response
{ "total_kid_related_spend": 127.45, "needs_review_count": 6,
  "by_platform": [{ "platform": "Roblox", "amount": 79.98 }],
  "by_category": [{ "category": "Games", "amount": 99.98 }],
  "by_child":    [{ "child_id": "uuid", "child_name": "Alex", "amount": 49.99 }] }
```

---

## 7. AI classification JSON schema

The model must return **only** valid JSON in this shape; we validate with Zod and
fall back to `needs_review` on any failure.

```jsonc
{
  "merchant_normalized": "string",
  "platform": "Apple | Google Play | Roblox | Steam | Xbox | PlayStation | Nintendo | Epic Games | Discord | Amazon | YouTube | Spotify | Netflix | Unknown | Other",
  "category":  "Games | In-app purchase | Subscription | App store | Entertainment | Education | Hardware/device | Unknown digital purchase | Not kid-related | Other",
  "is_kid_related": true,
  "confidence": 0.0,                       // 0..1
  "child_assignment": { "child_id": null, "reason": "string" },
  "plain_english_explanation": "string",
  "evidence": ["string"],
  "needs_review": true,
  "risk_flags": ["low_confidence", "unknown_child", "possible_subscription"]
}
```

**Validation rules (enforced server-side):**
- `confidence` ∈ [0, 1].
- `child_assignment.child_id` must be `null` unless the input contained
  child-specific evidence **and** the id matches a real child in the family.
- `plain_english_explanation` must read plainly for a non-technical parent.
- `evidence` must cite input clues (merchant text, receipt line items, platform names).
- `needs_review` is forced `true` if `confidence < 0.70`, or if a kid-related charge
  has an uncertain child assignment.
- Model must not invent product names, child names, account names, or platform details.

**Confidence bands → label:**
- `0.90–1.00` High · `0.70–0.89` Medium · `0.40–0.69` Low (needs review) ·
  `<0.40` Unclassified / manual review.

**Pipeline order (cost control — Risk 5):** preprocess merchant text → check
family `merchant_rules` (apply directly when a high-confidence rule matches, **no
AI call**) → else call AI → validate JSON → store result. Classify only after the
user confirms (manual submit / CSV import confirm), batch where possible.

---

## 8. AI classification prompt

**System prompt:**
```
You classify parent-submitted transaction and receipt data for a family spending
monitoring app.

Your job is to help parents understand confusing digital charges. You must be
cautious, transparent, and avoid overclaiming.

Classify the transaction by merchant, platform, category, whether it is likely
kid-related, confidence score, and plain-English explanation.

Rules:
- Return only valid JSON matching the required schema.
- Use "likely" language when certainty is not absolute.
- Do not assign a child unless there is direct evidence.
- If child identity is unclear, return child_id: null.
- If the transaction may be kid-related but evidence is limited, set needs_review: true.
- Do not invent details.
- Do not provide financial, legal, or refund advice.
- If the merchant is unknown, classify as Unknown and explain what information is missing.
```

**User prompt template:**
```
Classify this transaction.

Known child profiles:
{{children_json}}

Previous family merchant rules:
{{merchant_rules_json}}

Transaction:
Merchant: {{merchant}}
Description: {{description}}
Amount: {{amount}}
Date: {{transaction_date}}
Raw text / receipt text: {{raw_text}}

Return JSON only.
```

A second, similar prompt is used by `parse-receipt` to extract candidate
transactions + line items from pasted receipt text (extraction only — it does not
classify; extracted candidates are previewed, then classified after the user saves).

---

## 9. Implementation phases

> Build in order. Use mock data/classifier before wiring external services.
> Report after each phase: files created, files changed, how to run, how to test,
> **tests added + results**, what remains. When ambiguous, take the simpler MVP path.

| Phase | Scope | Est. | Acceptance |
|------|------|------|-----------|
| **0 — Planning** | This file, `TODO.md`, `.env.example`, `README.md` | — | Scope clear, non-goals explicit, enough direction to build |
| **1 — Foundation** | Next.js+TS+Tailwind scaffold, Supabase client (browser+server), auth pages, protected layout, nav, empty dashboard | 1–2 d | App runs locally; sign up / log in / log out; protected routes redirect |
| **2 — Family & kids** | Onboarding (create family), kid CRUD + archive, `/settings/family`, full RLS policies | 1 d | Parent creates family; add/edit/archive kids; cannot access another user's data |
| **3 — Transaction input** | Manual form, receipt paste form, CSV upload + auto-detect + `ColumnMapper` + preview + import summary | 2 d | Manual add works; receipt paste previews; CSV imports valid rows; invalid rows explained |
| **4 — Classification** | **Mock classifier first**, then Anthropic wrapper, `/classify` route, Zod schema validation, retry/fallback, store results | 2–3 d | Manual + uploaded txns classify; invalid AI JSON never crashes; low-confidence → Needs Review |
| **5 — Dashboard & corrections** | Summary cards, charts, transaction table, filters/search, detail drawer, `CorrectionForm`, correction storage, merchant-rule creation | 2 d | Dashboard totals accurate; corrections persist; corrected txns update totals; verified visually distinct |
| **6 — Weekly summary** | Summary generator, `/summary` preview page, optional email behind provider flag (mocked) | 1 d | Parent views weekly summary; reflects recent txns; "no kid spend" + review-prompt states |
| **7 — Polish & launch prep** | Loading/error/empty states, responsive pass, seed/mock data, privacy copy, `/pricing`, README finalize | 1–2 d | Demo-ready; new tester completes full flow from README end-to-end |

### Definition of Done — applies to **every** phase
A phase is complete only when, **in addition** to the acceptance criteria above:
- **unit tests** cover its business logic,
- **component tests** cover its important UI,
- **integration-style tests** cover API/data flow where practical,
- **manual test steps** are documented, and
- the full suite passes (`npm test`).

Tests never make real network calls and never require real env vars — Supabase, AI
APIs, Stripe, and email providers are mocked. Per-phase test checklists live in
`TODO.md`. (Phase 1 also established the test harness; see §10.)

---

## 10. Testing plan

**Stack & conventions**
- **Vitest** (jsdom) for unit + component tests; **React Testing Library** +
  `@testing-library/jest-dom` for components; **Playwright** for E2E once core flows
  exist (added in Phase 7, not before).
- Tests live in `__tests__/` mirroring `src/`. Run with `npm test` (`test:watch`,
  `test:coverage` also available).
- No real network calls, no real env vars. Mock Supabase, AI APIs, Stripe, email;
  stub env with `vi.stubEnv`. `next/navigation` + `next/link` are stubbed in
  `vitest.setup.ts`.
- Extract business logic into framework-free modules (e.g. `src/lib/auth-routes.ts`)
  so it's directly unit-testable without the Next runtime or a database.
- **Phase 1 status:** harness in place; 39 tests passing (utils, route-protection,
  Supabase client construction, UI primitives, nav, and landing/login/signup/
  dashboard pages).

**Unit:** CSV parsing · column mapping · amount normalization (incl. negatives/refunds)
· date parsing · duplicate-key generation · AI JSON schema validation (Zod) ·
confidence-band → label logic · dashboard aggregation · correction-override (latest
correction wins) · status derivation · route-protection logic.

**Integration:** signup → onboarding → dashboard · manual → classify → dashboard ·
receipt paste → extract → confirm → classify · CSV → preview → import → classify ·
correction → dashboard update · **RLS: a user can only read/write their own family**.

**User-acceptance scenarios (from the docs):**
1. **Manual suspicious charge** — enter `APPLE.COM/BILL` `$19.99` → classifies as
   likely Apple/App Store or in-app; child stays unknown; parent marks kid-related +
   assigns child; dashboard updates. *Pass:* saved, readable explanation, visible
   confidence, correction persists.
2. **CSV upload (25 rows)** — detect date/description/amount; preview; confirm;
   classify. *Pass:* valid rows import, invalid shown, dupes skipped/flagged, totals correct.
3. **AI uncertainty** — vague `SQ *DIGITAL SERVICE` → no confident platform →
   **Needs Review**, no child assigned. *Pass:* no hallucination; parent can correct.
4. **Correction rule** — correct `ROBLOX.COM` as kid-related + assign child; upload
   another similar Roblox txn → existing merchant rule applies / suggests same.
   *Pass:* rule applies; parent can override.

**Non-functional targets:** dashboard loads <2 s for 1,000 txns · CSV preview <5 s
for 500 rows · single manual classification <15 s · batch classify may be async ·
app stays usable while classification pending.

---

## 11. Known risks & mitigations

| # | Risk | Impact | Mitigation |
|---|------|--------|-----------|
| 1 | **AI misclassification / hallucination** | High — confident wrong answers destroy trust | Strict JSON + Zod validation, confidence labels, Needs-Review state, parent corrections, **no child without evidence**, cautious "likely" language |
| 2 | **Parent trust failure** | High — one confident error feels unreliable | Show confidence, highlight uncertainty, never overstate certainty, make correction trivial, track correction rate as a core metric |
| 3 | **Privacy resistance** | High — parents hesitate to share financial text | No bank integration in V1, manual paste + CSV only, never store full card numbers, plain data-usage copy, allow deletion, RLS everywhere |
| 4 | **CSV variability** | Medium — banks export differently | Auto-detect common columns, manual mapping fallback, preview before import, row-level error reporting |
| 5 | **AI cost overruns** | Medium | Classify only after confirmation, apply merchant rules before AI, batch intelligently, cap CSV at 500 rows / 2 MB, cheap default model (Haiku 4.5) |
| 6 | **Scope creep** | High | Lock V1 to charge-decoding + dashboard; defer bank/SMS/refund/screen-time; build in phases; `TODO.md` is the source of truth |
| 7 | **Weak willingness to pay** | High | Validate with 10 beta parents first, ask WTP questions, static pricing page, measure activation + repeat use before building more |

---

## 12. Decisions & assumptions

1. **Repo location:** project scaffolded at `~/spend-lens`. The two PDFs remain the
   source of truth (in `~/Downloads`); if you want Markdown mirrors
   (`PRODUCT_REQUIREMENTS.md` / `FEATURE_SPECIFICATIONS.md`) committed in-repo, say so.
2. **Pricing routes:** PRD references `/pricing`; FSD references `/settings/billing`.
   Resolution → public **`/pricing`** is the canonical early-access page;
   **`/settings/billing`** (auth) reuses the same static content. Both work with no
   Stripe configured.
3. **Default AI provider/model:** Anthropic **Claude Haiku 4.5** for classification
   (cost/latency), behind a provider interface so OpenAI is a config swap. Sonnet 4.6
   available as an escalation later.
4. **Email & Stripe:** fully stubbed/mocked in MVP; presence of provider env vars
   flips them on. Absence must never block any core flow.
5. **Refunds / negative amounts:** stored as-is; dashboard nets them into totals and
   displays sign (kept simple per "reduce totals or show separately").
6. **Child deletion after transactions exist:** soft-archive via `archived_at`;
   existing assignments retain the child reference (or fall back to "unassigned").
   No hard delete that orphans data silently.
7. **Duplicate detection:** `duplicate_key = hash(family_id | normalized_merchant |
   amount | transaction_date)`; partial unique index enforces skip/flag on import.
8. **Status is derived, not stored** — see §5 derivation table — so corrections and
   re-classification can't leave a stale status column.

### Phase 2 implementation notes (as built)
- **Migrations live in `supabase/migrations/`.** Phase 2 = `0001_phase2_family_schema.sql`
  (profiles/families/children, `updated_at` triggers, a `handle_new_user` trigger that
  auto-creates a `profiles` row on signup, and full RLS). Idempotent; run via the
  Supabase SQL editor or CLI. (Earlier docs referenced a single `supabase/schema.sql`;
  superseded by numbered migrations.)
- **Data-access layer:** `src/lib/data/family.ts` holds pure functions that take a
  `SupabaseClient` (works server- or browser-side, unit-testable with a mock client);
  `src/lib/data/family-client.ts` binds the browser client for Client Components.
- **Onboarding gate:** the no-family → `/onboarding` redirect lives in the `(app)`
  server layout (uses `getFamilyForUser`), not middleware — keeps DB access off the
  edge and out of every request. `/onboarding` redirects to `/dashboard` once a family
  exists.
- **Family/kid mutations** use the authenticated **browser** Supabase client guarded by
  RLS (not server actions) — secure and straightforward to test by mocking the client
  service. Kid delete is **soft** (`archived_at`); the UI hides archived kids.
- **Auth-confirmation UX:** local testing is smoothest with Supabase "Confirm email"
  disabled (documented in README); otherwise the `/auth/confirm` route handles the link.
- **Live RLS verification:** `scripts/verify-rls.mjs` (`npm run verify:rls`) signs in two
  users and asserts that User B cannot read/fetch/insert/update/delete User A's
  family/children. Run it after applying the migration to a real project. A manual
  two-account checklist is in the README.
