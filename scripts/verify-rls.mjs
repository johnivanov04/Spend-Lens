#!/usr/bin/env node
/*
 * Live Row Level Security verification for Spend Lens — Phase 2.
 *
 * Proves, against your real Supabase project, that one user cannot read or write
 * another user's family/children data.
 *
 * Usage:
 *   node --env-file=.env.local scripts/verify-rls.mjs
 *   (or)  npm run verify:rls
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 * Optional env: SUPABASE_SERVICE_ROLE_KEY
 *   - If present, the script creates pre-confirmed test users, so you do NOT
 *     need to disable email confirmation.
 *   - If absent, you must disable "Confirm email" in Supabase Auth settings so
 *     signups return a session.
 *
 * The script creates a clearly-marked throwaway family/child for User A, runs
 * the checks, then deletes that family (cascading the child). The two test auth
 * users remain — delete them under Authentication → Users if you wish.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  console.error(
    "✗ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  );
  console.error("  Run with: node --env-file=.env.local scripts/verify-rls.mjs");
  process.exit(1);
}

const A = { email: "spendlens-rls-a@example.com", password: "Rls-Test-A-123!" };
const B = { email: "spendlens-rls-b@example.com", password: "Rls-Test-B-123!" };
const TEST_FAMILY_NAME = "Spend Lens RLS Test (safe to delete)";

const results = [];
function check(name, passed, detail = "") {
  results.push({ name, passed });
  console.log(`${passed ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function anonClient() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ensureConfirmedUser(creds) {
  if (!serviceKey) return; // fall back to the signUp path
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  const { error } = await admin.auth.admin.createUser({
    email: creds.email,
    password: creds.password,
    email_confirm: true,
  });
  if (error && !/already|registered|exists/i.test(error.message)) {
    throw new Error(`admin.createUser failed for ${creds.email}: ${error.message}`);
  }
}

async function signInClient(creds) {
  await ensureConfirmedUser(creds);
  const c = anonClient();
  let { data, error } = await c.auth.signInWithPassword(creds);
  if (error) {
    const up = await c.auth.signUp(creds);
    if (up.error) {
      throw new Error(`auth failed for ${creds.email}: ${up.error.message}`);
    }
    data = up.data;
  }
  if (!data.session) {
    throw new Error(
      `No session for ${creds.email}. Either disable "Confirm email" in ` +
        `Supabase Auth settings, or set SUPABASE_SERVICE_ROLE_KEY in .env.local ` +
        `so this script can create pre-confirmed test users.`,
    );
  }
  return c;
}

async function main() {
  console.log("Spend Lens — live RLS verification\n");

  // --- User A: create own family + child ---
  const a = await signInClient(A);
  const {
    data: { user: userA },
  } = await a.auth.getUser();

  const { data: famA, error: famErr } = await a
    .from("families")
    .insert({ owner_user_id: userA.id, name: TEST_FAMILY_NAME })
    .select()
    .single();
  if (famErr) {
    throw new Error(
      `User A could not create a family (is the migration applied?): ${famErr.message}`,
    );
  }
  check("User A can create their own family", Boolean(famA));

  const { error: kidErr } = await a
    .from("children")
    .insert({ family_id: famA.id, name: "Test Kid A" })
    .select()
    .single();
  check("User A can add a child to their own family", !kidErr);

  // Phase 3: A also creates a transaction + a csv_import.
  const { data: txnA, error: txnErr } = await a
    .from("transactions")
    .insert({
      family_id: famA.id,
      source_type: "manual",
      merchant: "RLS Test Merchant",
      amount: 12.34,
      transaction_date: "2026-06-11",
    })
    .select()
    .single();
  if (txnErr) {
    throw new Error(
      `User A could not create a transaction (is the Phase 3 migration applied?): ${txnErr.message}`,
    );
  }
  check("User A can create a transaction in their own family", Boolean(txnA));

  const { error: impErr } = await a
    .from("csv_imports")
    .insert({
      family_id: famA.id,
      file_name: "rls-test.csv",
      row_count: 1,
      created_count: 1,
      skipped_count: 0,
      failed_count: 0,
      status: "imported",
    })
    .select()
    .single();
  check("User A can create a csv_import in their own family", !impErr);

  // --- User B: must not see or touch A's data ---
  const b = await signInClient(B);

  const { data: bFamAll } = await b.from("families").select("id");
  check(
    "User B cannot see User A's family in a broad select",
    !(bFamAll ?? []).some((f) => f.id === famA.id),
    `B sees ${bFamAll?.length ?? 0} family row(s) total`,
  );

  const { data: bFamById } = await b
    .from("families")
    .select("*")
    .eq("id", famA.id);
  check("User B cannot fetch User A's family by id", (bFamById ?? []).length === 0);

  const { data: bKids } = await b.from("children").select("id, family_id");
  check(
    "User B cannot see User A's children",
    !(bKids ?? []).some((k) => k.family_id === famA.id),
    `B sees ${bKids?.length ?? 0} child row(s) total`,
  );

  const { data: bKidsByFam } = await b
    .from("children")
    .select("*")
    .eq("family_id", famA.id);
  check(
    "User B cannot fetch User A's children by family_id",
    (bKidsByFam ?? []).length === 0,
  );

  const { error: bInsErr } = await b
    .from("children")
    .insert({ family_id: famA.id, name: "Intruder" })
    .select()
    .single();
  check(
    "User B cannot insert a child into User A's family",
    Boolean(bInsErr),
    bInsErr ? "rejected by RLS" : "INSERT unexpectedly succeeded",
  );

  const { data: bUpd } = await b
    .from("families")
    .update({ name: "hacked" })
    .eq("id", famA.id)
    .select();
  check("User B cannot update User A's family", (bUpd ?? []).length === 0);

  const { data: bDel } = await b
    .from("families")
    .delete()
    .eq("id", famA.id)
    .select();
  check("User B cannot delete User A's family", (bDel ?? []).length === 0);

  // transactions + csv_imports isolation (Phase 3)
  const { data: bTxnAll } = await b
    .from("transactions")
    .select("id, family_id");
  check(
    "User B cannot see User A's transactions",
    !(bTxnAll ?? []).some((t) => t.family_id === famA.id),
    `B sees ${bTxnAll?.length ?? 0} transaction row(s) total`,
  );

  const { data: bTxnById } = await b
    .from("transactions")
    .select("*")
    .eq("id", txnA.id);
  check(
    "User B cannot fetch User A's transaction by id",
    (bTxnById ?? []).length === 0,
  );

  const { error: bTxnInsErr } = await b
    .from("transactions")
    .insert({
      family_id: famA.id,
      source_type: "manual",
      merchant: "Intruder",
      amount: 1,
      transaction_date: "2026-06-11",
    })
    .select()
    .single();
  check(
    "User B cannot insert a transaction into User A's family",
    Boolean(bTxnInsErr),
    bTxnInsErr ? "rejected by RLS" : "INSERT unexpectedly succeeded",
  );

  const { data: bTxnUpd } = await b
    .from("transactions")
    .update({ merchant: "hacked" })
    .eq("id", txnA.id)
    .select();
  check("User B cannot update User A's transaction", (bTxnUpd ?? []).length === 0);

  const { data: bTxnDel } = await b
    .from("transactions")
    .delete()
    .eq("id", txnA.id)
    .select();
  check("User B cannot delete User A's transaction", (bTxnDel ?? []).length === 0);

  const { data: bImports } = await b
    .from("csv_imports")
    .select("id, family_id");
  check(
    "User B cannot see User A's csv_imports",
    !(bImports ?? []).some((i) => i.family_id === famA.id),
    `B sees ${bImports?.length ?? 0} csv_import row(s) total`,
  );

  // --- User A: still intact ---
  const { data: aFam } = await a.from("families").select("*").eq("id", famA.id);
  check("User A can still read their own family", (aFam ?? []).length === 1);
  check(
    "User A's family name is unchanged after B's attempts",
    (aFam ?? [])[0]?.name === TEST_FAMILY_NAME,
  );
  const { data: aTxn } = await a
    .from("transactions")
    .select("merchant")
    .eq("id", txnA.id);
  check(
    "User A's transaction is unchanged after B's attempts",
    (aTxn ?? [])[0]?.merchant === "RLS Test Merchant",
  );

  // --- Cleanup the throwaway family (cascades to the child) ---
  await a.from("families").delete().eq("id", famA.id);

  console.log("");
  const failed = results.filter((r) => !r.passed);
  if (failed.length > 0) {
    console.error(
      `✗ RLS verification FAILED: ${failed.length}/${results.length} checks failed.`,
    );
    process.exit(1);
  }
  console.log(
    `✓ RLS verification PASSED: all ${results.length} checks. Test family cleaned up.`,
  );
}

main().catch((err) => {
  console.error(`\n✗ Verification error: ${err.message}`);
  process.exit(1);
});
