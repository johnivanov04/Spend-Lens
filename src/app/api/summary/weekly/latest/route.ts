import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyForUser } from "@/lib/data/family";
import { getLatestWeeklySummary } from "@/lib/data/weekly-summaries";

/** Return the most recent saved weekly summary for the user's own family. */
export async function GET() {
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

  const summary = await getLatestWeeklySummary(supabase, family.id);
  return NextResponse.json({ summary });
}
