import { describe, expect, it } from "vitest";
import {
  generateWeeklySummary,
  getWeeklyDateRange,
  getWeeklySummaryState,
} from "@/lib/weekly-summary";
import type {
  ClassificationRow,
  TransactionWithClassification,
} from "@/lib/data/classifications";
import type { ChildRef } from "@/lib/ai/schema";

const NOW = new Date("2026-06-11T12:00:00Z");

function row(o: {
  id?: string;
  amount?: number;
  date?: string;
  merchant?: string;
  c?: Partial<ClassificationRow> | null;
}): TransactionWithClassification {
  const c = o.c;
  return {
    id: o.id ?? "t1",
    family_id: "fam1",
    source_type: "manual",
    merchant: o.merchant ?? "Merchant",
    description: null,
    amount: o.amount ?? 10,
    currency: "USD",
    transaction_date: o.date ?? "2026-06-10",
    raw_text: null,
    source_file_name: null,
    duplicate_key: null,
    created_at: "2026-06-10T00:00:00Z",
    updated_at: "2026-06-10T00:00:00Z",
    classification:
      c === null || c === undefined
        ? null
        : ({
            id: `c-${o.id ?? "t1"}`,
            transaction_id: o.id ?? "t1",
            family_id: "fam1",
            platform: null,
            merchant_family: null,
            category: null,
            kid_related_likelihood: "yes",
            confidence_score: 0.95,
            confidence_label: "high",
            child_id: null,
            explanation: "x",
            needs_review: false,
            model_provider: "mock",
            model_name: null,
            raw_model_output: null,
            created_at: "2026-06-10T00:00:00Z",
            updated_at: "2026-06-10T00:00:00Z",
            ...c,
          } as ClassificationRow),
  };
}

const noChildren: ChildRef[] = [];

describe("getWeeklyDateRange", () => {
  it("returns the inclusive last-7-days window", () => {
    expect(getWeeklyDateRange(NOW)).toEqual({
      period_start: "2026-06-05",
      period_end: "2026-06-11",
    });
  });
});

describe("getWeeklySummaryState", () => {
  it("classifies the headline state", () => {
    expect(
      getWeeklySummaryState({ totalTransactions: 0, classifiedCount: 0, likelyKidSpend: 0, unclearKidSpend: 0 }),
    ).toBe("no_transactions");
    expect(
      getWeeklySummaryState({ totalTransactions: 2, classifiedCount: 0, likelyKidSpend: 0, unclearKidSpend: 0 }),
    ).toBe("none_classified");
    expect(
      getWeeklySummaryState({ totalTransactions: 2, classifiedCount: 2, likelyKidSpend: 0, unclearKidSpend: 0 }),
    ).toBe("no_kid_spend");
    expect(
      getWeeklySummaryState({ totalTransactions: 2, classifiedCount: 2, likelyKidSpend: 10, unclearKidSpend: 0 }),
    ).toBe("ok");
  });
});

describe("generateWeeklySummary", () => {
  it("handles no transactions in the last 7 days", () => {
    const out = generateWeeklySummary([], noChildren, NOW);
    expect(out.summary_json.state).toBe("no_transactions");
    expect(out.summary_json.totalTransactions).toBe(0);
    expect(out.summary_text).toMatch(/No transactions in the last 7 days/);
  });

  it("excludes transactions outside the 7-day window", () => {
    const out = generateWeeklySummary(
      [row({ id: "old", date: "2026-01-01" })],
      noChildren,
      NOW,
    );
    expect(out.summary_json.totalTransactions).toBe(0);
  });

  it("reports none-classified when transactions exist but aren't classified", () => {
    const out = generateWeeklySummary([row({ id: "a", c: null })], noChildren, NOW);
    expect(out.summary_json.state).toBe("none_classified");
    expect(out.summary_text).toMatch(/none are classified yet/);
  });

  it("reports no kid-related spend when nothing is likely kid-related", () => {
    const out = generateWeeklySummary(
      [row({ id: "a", c: { kid_related_likelihood: "no", category: "Subscription" } })],
      noChildren,
      NOW,
    );
    expect(out.summary_json.state).toBe("no_kid_spend");
    expect(out.summary_text).toMatch(/None look likely kid-related/);
  });

  it("summarizes likely kid-related spend with top categories", () => {
    const out = generateWeeklySummary(
      [
        row({ id: "a", amount: 50, c: { kid_related_likelihood: "yes", category: "Games", platform: "Roblox" } }),
        row({ id: "b", amount: 30, c: { kid_related_likelihood: "unclear", category: "Games", platform: "Steam", needs_review: true } }),
      ],
      noChildren,
      NOW,
    );
    expect(out.summary_json.state).toBe("ok");
    expect(out.summary_json.likelyKidSpend).toBe(50);
    expect(out.summary_json.unclearKidSpend).toBe(30);
    expect(out.summary_json.topCategories[0]).toEqual({ key: "Games", amount: 80, count: 2 });
    expect(out.summary_json.needsReviewCount).toBe(1);
    expect(out.summary_text).toMatch(/Likely kid-related spend was \$50\.00/);
    expect(out.summary_text).toMatch(/need review/);
  });

  it("nets refunds/negative amounts into spend", () => {
    const out = generateWeeklySummary(
      [
        row({ id: "a", amount: 50, c: { kid_related_likelihood: "yes", category: "Games" } }),
        row({ id: "b", amount: -20, c: { kid_related_likelihood: "yes", category: "Games" } }),
      ],
      noChildren,
      NOW,
    );
    expect(out.summary_json.likelyKidSpend).toBe(30);
  });

  it("includes a child breakdown when child assignments exist", () => {
    const out = generateWeeklySummary(
      [row({ id: "a", amount: 25, c: { kid_related_likelihood: "yes", child_id: "k1", category: "Games" } })],
      [{ id: "k1", name: "Alex" }],
      NOW,
    );
    expect(out.summary_json.hasChildren).toBe(true);
    expect(out.summary_json.byChild).toEqual([
      { childId: "k1", childName: "Alex", amount: 25, count: 1 },
    ]);
  });

  it("produces a serializable summary_json with the expected shape", () => {
    const out = generateWeeklySummary([row({ id: "a" })], noChildren, NOW);
    expect(out.summary_json).toMatchObject({
      periodStart: "2026-06-05",
      periodEnd: "2026-06-11",
      totalTransactions: 1,
      topCategories: expect.any(Array),
      topPlatforms: expect.any(Array),
      byChild: expect.any(Array),
      recentNeedsReview: expect.any(Array),
    });
    // round-trips through JSON without throwing
    expect(() => JSON.stringify(out.summary_json)).not.toThrow();
  });
});
