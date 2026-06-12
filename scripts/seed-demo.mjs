#!/usr/bin/env node
/*
 * Spend Lens — safe demo seed.
 *
 * Inserts a handful of sample transactions for a CONFIGURED DEMO USER only.
 * It never deletes anything, never touches other users, and never calls AI or
 * sends email. Classify the seeded transactions from the UI (mock mode needs no key).
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-demo.mjs
 *   (or)  npm run seed:demo
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *   DEMO_USER_EMAIL, DEMO_USER_PASSWORD
 * Optional env:
 *   SUPABASE_SERVICE_ROLE_KEY  (lets the script pre-confirm the demo user so you
 *                               don't have to disable "Confirm email")
 *
 * No demo credentials? Skip the script and just upload demo-data/sample-transactions.csv
 * or paste demo-data/sample-receipt.txt in the app.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.DEMO_USER_EMAIL;
const password = process.env.DEMO_USER_PASSWORD;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  console.error("✗ Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}
if (!email || !password) {
  console.error(
    "✗ Missing DEMO_USER_EMAIL / DEMO_USER_PASSWORD.\n" +
      "  This script seeds data for that one demo user only.\n" +
      "  Or skip it: upload demo-data/sample-transactions.csv in the app instead.",
  );
  process.exit(1);
}

function dayOffset(today, n) {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function sampleTransactions(today = new Date()) {
  return [
    { merchant: "ROBLOX.COM", description: "ROBLOX.COM 888-858-2569 CA", amount: 9.99, transaction_date: dayOffset(today, 0) },
    { merchant: "APPLE.COM/BILL", description: "APPLE.COM/BILL 866-712-7753 CA", amount: 19.99, transaction_date: dayOffset(today, 1) },
    { merchant: "STEAMGAMES.COM", description: "STEAMGAMES.COM 425-952-2985 WA", amount: 29.99, transaction_date: dayOffset(today, 2) },
    { merchant: "NETFLIX.COM", description: "NETFLIX.COM monthly", amount: 15.49, transaction_date: dayOffset(today, 3) },
    { merchant: "MICROSOFT XBOX", description: "MICROSOFT*XBOX", amount: 14.99, transaction_date: dayOffset(today, 4) },
    { merchant: "NINTENDO", description: "NINTENDO eShop", amount: 7.99, transaction_date: dayOffset(today, 5) },
    { merchant: "SPOTIFY", description: "SPOTIFY Premium", amount: 10.99, transaction_date: dayOffset(today, 6) },
    { merchant: "ROBLOX.COM", description: "ROBLOX.COM Robux", amount: 4.99, transaction_date: dayOffset(today, 1) },
    { merchant: "SQ *DIGITAL SERVICE", description: "SQ *DIGITAL SERVICE", amount: 6.0, transaction_date: dayOffset(today, 2) },
    { merchant: "APPLE.COM/BILL", description: "APPLE.COM/BILL refund", amount: -9.99, transaction_date: dayOffset(today, 3) },
  ];
}

async function ensureConfirmedUser() {
  if (!serviceKey) return;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error && !/already|registered|exists/i.test(error.message)) {
    throw new Error(`admin.createUser failed: ${error.message}`);
  }
}

async function main() {
  console.log("Spend Lens — demo seed");
  console.log(`Demo user: ${email}`);
  console.log("This inserts sample transactions for that user only. It never deletes anything.\n");

  await ensureConfirmedUser();

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const up = await supabase.auth.signUp({ email, password });
    if (up.error) throw new Error(`auth failed: ${up.error.message}`);
    data = up.data;
  }
  if (!data.session) {
    throw new Error(
      'No session for the demo user. Disable "Confirm email" in Supabase Auth, ' +
        "or set SUPABASE_SERVICE_ROLE_KEY so this script can pre-confirm the user.",
    );
  }
  const userId = data.user?.id ?? data.session.user.id;

  // Ensure a family (idempotent: reuse the first one).
  let { data: family } = await supabase.from("families").select("*").limit(1).maybeSingle();
  if (!family) {
    const created = await supabase
      .from("families")
      .insert({ owner_user_id: userId, name: "Demo Family" })
      .select()
      .single();
    if (created.error) throw new Error(`Could not create family: ${created.error.message}`);
    family = created.data;
  }
  console.log(`Using family: ${family.name} (${family.id})`);

  const rows = sampleTransactions().map((t) => ({
    family_id: family.id,
    source_type: "manual",
    merchant: t.merchant,
    description: t.description,
    amount: t.amount,
    transaction_date: t.transaction_date,
  }));

  const { data: inserted, error: insErr } = await supabase
    .from("transactions")
    .insert(rows)
    .select("id");
  if (insErr) throw new Error(`Could not insert transactions: ${insErr.message}`);

  console.log(`\n✓ Inserted ${inserted?.length ?? rows.length} sample transactions.`);
  console.log("Next: log in as the demo user, open /transactions, and click \"Classify all unclassified\".");
  console.log("(Re-running adds another batch — these are samples, not deduplicated.)");
}

main().catch((err) => {
  console.error(`\n✗ Seed error: ${err.message}`);
  process.exit(1);
});
