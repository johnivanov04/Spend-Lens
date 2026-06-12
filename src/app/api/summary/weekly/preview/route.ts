import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyForUser, listChildren } from "@/lib/data/family";
import { listTransactionsWithClassification } from "@/lib/data/classifications";
import { createWeeklySummaryPreview } from "@/lib/data/weekly-summaries";
import { generateWeeklySummary } from "@/lib/weekly-summary";

/**
 * Generate + persist the current week's summary preview. Reads only the
 * authenticated user's own family data (RLS). Never sends email.
 */
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const family = await getFamilyForUser(supabase);
  if (!family) {
    return NextResponse.json({ error: "No family" }, { status: 400 });
  }

  const [rows, children] = await Promise.all([
    listTransactionsWithClassification(supabase, family.id),
    listChildren(supabase, family.id),
  ]);

  const result = generateWeeklySummary(
    rows,
    children.map((c) => ({ id: c.id, name: c.name })),
  );

  const saved = await createWeeklySummaryPreview(supabase, family.id, {
    period_start: result.period_start,
    period_end: result.period_end,
    summary_json: result.summary_json,
    summary_text: result.summary_text,
  });

  return NextResponse.json({ summary: saved });
}
