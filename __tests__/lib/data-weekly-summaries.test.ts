import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createWeeklySummaryPreview,
  getLatestWeeklySummary,
} from "@/lib/data/weekly-summaries";

const asClient = (from: unknown) => ({ from }) as unknown as SupabaseClient;

describe("createWeeklySummaryPreview", () => {
  it("upserts a preview keyed on family + period", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "w1" }, error: null });
    const select = vi.fn(() => ({ single }));
    const upsert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ upsert }));

    await createWeeklySummaryPreview(asClient(from), "fam1", {
      period_start: "2026-06-05",
      period_end: "2026-06-11",
      summary_json: { totalTransactions: 0 } as never,
      summary_text: "No transactions…",
    });

    expect(from).toHaveBeenCalledWith("weekly_summaries");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        family_id: "fam1",
        period_start: "2026-06-05",
        period_end: "2026-06-11",
        status: "preview",
      }),
      { onConflict: "family_id,period_start,period_end" },
    );
  });
});

describe("getLatestWeeklySummary", () => {
  it("selects the newest summary for the family", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "w1" }, error: null });
    const limit = vi.fn(() => ({ maybeSingle }));
    const order = vi.fn(() => ({ limit }));
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    const out = await getLatestWeeklySummary(asClient(from), "fam1");

    expect(eq).toHaveBeenCalledWith("family_id", "fam1");
    expect(order).toHaveBeenCalledWith("period_end", { ascending: false });
    expect(out).toEqual({ id: "w1" });
  });
});
