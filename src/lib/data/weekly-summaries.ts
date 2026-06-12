import type { SupabaseClient } from "@supabase/supabase-js";
import type { WeeklySummaryData } from "@/lib/weekly-summary";

export type WeeklySummaryRow = {
  id: string;
  family_id: string;
  period_start: string;
  period_end: string;
  summary_json: WeeklySummaryData;
  summary_text: string;
  status: "preview" | "sent" | "failed";
  emailed_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Save (or replace) the current week's preview for a family. */
export async function createWeeklySummaryPreview(
  supabase: SupabaseClient,
  familyId: string,
  input: {
    period_start: string;
    period_end: string;
    summary_json: WeeklySummaryData;
    summary_text: string;
  },
): Promise<WeeklySummaryRow> {
  const { data, error } = await supabase
    .from("weekly_summaries")
    .upsert(
      {
        family_id: familyId,
        period_start: input.period_start,
        period_end: input.period_end,
        summary_json: input.summary_json,
        summary_text: input.summary_text,
        status: "preview",
        emailed_at: null,
      },
      { onConflict: "family_id,period_start,period_end" },
    )
    .select()
    .single();
  if (error) throw error;
  return data as WeeklySummaryRow;
}

/** The most recent saved summary for a family, or null. */
export async function getLatestWeeklySummary(
  supabase: SupabaseClient,
  familyId: string,
): Promise<WeeklySummaryRow | null> {
  const { data, error } = await supabase
    .from("weekly_summaries")
    .select("*")
    .eq("family_id", familyId)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as WeeklySummaryRow | null) ?? null;
}

/** All saved summaries for a family, newest first. */
export async function listWeeklySummariesForFamily(
  supabase: SupabaseClient,
  familyId: string,
): Promise<WeeklySummaryRow[]> {
  const { data, error } = await supabase
    .from("weekly_summaries")
    .select("*")
    .eq("family_id", familyId)
    .order("period_end", { ascending: false });
  if (error) throw error;
  return (data as WeeklySummaryRow[]) ?? [];
}

/** Update a summary's status (e.g. after a future real send). */
export async function updateWeeklySummaryStatus(
  supabase: SupabaseClient,
  id: string,
  status: "preview" | "sent" | "failed",
  emailedAt: string | null = null,
): Promise<WeeklySummaryRow> {
  const { data, error } = await supabase
    .from("weekly_summaries")
    .update({ status, emailed_at: emailedAt })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as WeeklySummaryRow;
}
