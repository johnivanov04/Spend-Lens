import { describe, expect, it } from "vitest";
import {
  calculateNeedsReviewCounts,
  dateRangeStart,
  facetsFromRows,
  filterByDateRange,
  filterTransactions,
  getReviewQueue,
  groupSpendByCategory,
  groupSpendByChild,
  groupSpendByKidLikelihood,
  groupSpendByPlatform,
  parseTransactionQuery,
  sortTransactions,
  summarizeDashboard,
} from "@/lib/analytics";
import type {
  ClassificationRow,
  TransactionWithClassification,
} from "@/lib/data/classifications";
import type { SourceType } from "@/lib/transactions/transaction";

function row(o: {
  id?: string;
  amount?: number;
  date?: string;
  created_at?: string;
  source?: SourceType;
  merchant?: string | null;
  description?: string | null;
  c?: Partial<ClassificationRow> | null;
}): TransactionWithClassification {
  const c = o.c;
  return {
    id: o.id ?? "t1",
    family_id: "fam1",
    source_type: o.source ?? "manual",
    merchant: o.merchant ?? "Merchant",
    description: o.description ?? null,
    amount: o.amount ?? 10,
    currency: "USD",
    transaction_date: o.date ?? "2026-06-11",
    raw_text: null,
    source_file_name: null,
    duplicate_key: null,
    created_at: o.created_at ?? "2026-06-11T00:00:00Z",
    updated_at: "2026-06-11T00:00:00Z",
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
            kid_related_likelihood: "unclear",
            confidence_score: 0.5,
            confidence_label: "low",
            child_id: null,
            explanation: "x",
            needs_review: false,
            model_provider: "mock",
            model_name: null,
            raw_model_output: null,
            created_at: "2026-06-11T00:00:00Z",
            updated_at: "2026-06-11T00:00:00Z",
            ...c,
          } as ClassificationRow),
  };
}

describe("dateRangeStart", () => {
  const now = new Date("2026-06-11T12:00:00Z");
  it("returns null for all-time", () => {
    expect(dateRangeStart("all", now)).toBeNull();
  });
  it("computes inclusive starts", () => {
    expect(dateRangeStart("7d", now)).toBe("2026-06-05");
    expect(dateRangeStart("30d", now)).toBe("2026-05-13");
  });
});

describe("filterByDateRange", () => {
  const now = new Date("2026-06-11T12:00:00Z");
  const rows = [
    row({ id: "a", date: "2026-06-10" }),
    row({ id: "b", date: "2026-01-01" }),
  ];
  it("keeps only rows within the range", () => {
    expect(filterByDateRange(rows, "7d", now).map((r) => r.id)).toEqual(["a"]);
    expect(filterByDateRange(rows, "all", now)).toHaveLength(2);
  });
});

describe("filterTransactions", () => {
  const rows = [
    row({ id: "a", merchant: "ROBLOX.COM", c: { category: "Games", platform: "Roblox", needs_review: true } }),
    row({ id: "b", merchant: "Netflix", c: { category: "Subscription", platform: "Netflix", needs_review: false } }),
    row({ id: "c", merchant: "Unknown", c: null }),
  ];

  it("searches merchant/description", () => {
    expect(filterTransactions(rows, { search: "roblox" }).map((r) => r.id)).toEqual(["a"]);
  });
  it("filters by category and platform", () => {
    expect(filterTransactions(rows, { category: "Games" }).map((r) => r.id)).toEqual(["a"]);
    expect(filterTransactions(rows, { platform: "Netflix" }).map((r) => r.id)).toEqual(["b"]);
  });
  it("filters by status", () => {
    expect(filterTransactions(rows, { status: "unclassified" }).map((r) => r.id)).toEqual(["c"]);
    expect(filterTransactions(rows, { status: "needs_review" }).map((r) => r.id)).toEqual(["a"]);
    expect(filterTransactions(rows, { status: "classified" }).map((r) => r.id)).toEqual(["a", "b"]);
  });
  it("filters by needs-review boolean", () => {
    expect(filterTransactions(rows, { needsReview: true }).map((r) => r.id)).toEqual(["a"]);
  });
});

describe("sortTransactions", () => {
  const rows = [
    row({ id: "a", amount: 5, date: "2026-06-01" }),
    row({ id: "b", amount: 20, date: "2026-06-10" }),
  ];
  it("sorts by amount", () => {
    expect(sortTransactions(rows, "amount", "desc").map((r) => r.id)).toEqual(["b", "a"]);
    expect(sortTransactions(rows, "amount", "asc").map((r) => r.id)).toEqual(["a", "b"]);
  });
  it("sorts by date desc by default direction", () => {
    expect(sortTransactions(rows, "date", "desc").map((r) => r.id)).toEqual(["b", "a"]);
  });
});

describe("grouping", () => {
  const rows = [
    row({ id: "a", amount: 50, c: { category: "Games", platform: "Roblox", child_id: "k1", kid_related_likelihood: "yes" } }),
    row({ id: "b", amount: 30, c: { category: "Games", platform: "Steam", child_id: null, kid_related_likelihood: "unclear" } }),
    row({ id: "c", amount: 10, c: { category: "Subscription", platform: "Netflix", child_id: "k1", kid_related_likelihood: "no" } }),
  ];

  it("groups spend by category", () => {
    expect(groupSpendByCategory(rows)).toEqual([
      { key: "Games", amount: 80, count: 2 },
      { key: "Subscription", amount: 10, count: 1 },
    ]);
  });
  it("groups spend by platform", () => {
    expect(groupSpendByPlatform(rows).map((g) => g.key)).toEqual(["Roblox", "Steam", "Netflix"]);
  });
  it("groups spend by child (assigned only)", () => {
    const byChild = groupSpendByChild(rows, [{ id: "k1", name: "Alex" }]);
    expect(byChild).toEqual([
      { childId: "k1", childName: "Alex", amount: 60, count: 2 },
    ]);
  });
  it("groups spend by kid-related likelihood", () => {
    expect(groupSpendByKidLikelihood(rows)).toEqual({ yes: 50, no: 10, unclear: 30 });
  });
});

describe("calculateNeedsReviewCounts", () => {
  it("counts needs-review rows by category", () => {
    const rows = [
      row({ id: "a", c: { category: "Games", needs_review: true } }),
      row({ id: "b", c: { category: "Games", needs_review: true } }),
      row({ id: "c", c: { category: "Subscription", needs_review: false } }),
    ];
    const counts = calculateNeedsReviewCounts(rows);
    expect(counts.total).toBe(2);
    expect(counts.byCategory).toEqual([{ key: "Games", amount: 20, count: 2 }]);
  });
});

describe("getReviewQueue", () => {
  it("selects unclassified, needs-review, low/unclassified, and unclear rows", () => {
    const rows = [
      row({ id: "a", c: null }), // unclassified
      row({ id: "b", c: { confidence_label: "high", needs_review: true, kid_related_likelihood: "yes" } }), // needs review
      row({ id: "c", c: { confidence_label: "low", needs_review: false, kid_related_likelihood: "yes" } }), // low
      row({ id: "d", c: { confidence_label: "high", needs_review: false, kid_related_likelihood: "unclear" } }), // unclear
      row({ id: "e", c: { confidence_label: "high", needs_review: false, kid_related_likelihood: "yes" } }), // clean
    ];
    expect(getReviewQueue(rows).map((r) => r.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("summarizeDashboard", () => {
  it("composes counts, spends, and breakdowns", () => {
    const rows = [
      row({ id: "a", amount: 50, c: { category: "Games", platform: "Roblox", kid_related_likelihood: "yes", confidence_label: "high", needs_review: false } }),
      row({ id: "b", amount: 30, c: { category: "Games", platform: "Steam", kid_related_likelihood: "unclear", needs_review: true } }),
      row({ id: "c", amount: 10, c: null }),
    ];
    const s = summarizeDashboard(rows, []);
    expect(s.totalTransactions).toBe(3);
    expect(s.classifiedCount).toBe(2);
    expect(s.needsReviewCount).toBe(1);
    expect(s.likelyKidSpend).toBe(50);
    expect(s.unclearKidSpend).toBe(30);
    expect(s.byCategory[0]).toEqual({ key: "Games", amount: 80, count: 2 });
  });
});

describe("parseTransactionQuery", () => {
  it("parses and defaults sensibly", () => {
    const q = parseTransactionQuery({ q: "roblox", status: "needs_review", sort: "amount", dir: "asc", category: "Games" });
    expect(q.range).toBe("all");
    expect(q.sort).toBe("amount");
    expect(q.dir).toBe("asc");
    expect(q.filters.search).toBe("roblox");
    expect(q.filters.status).toBe("needs_review");
    expect(q.filters.category).toBe("Games");
  });
  it("ignores invalid values", () => {
    const q = parseTransactionQuery({ sort: "bogus", status: "nope" });
    expect(q.sort).toBe("date");
    expect(q.filters.status).toBeNull();
  });
});

describe("facetsFromRows", () => {
  it("returns distinct sorted categories and platforms", () => {
    const rows = [
      row({ id: "a", c: { category: "Subscription", platform: "Netflix" } }),
      row({ id: "b", c: { category: "Games", platform: "Roblox" } }),
      row({ id: "c", c: { category: "Games", platform: "Roblox" } }),
    ];
    expect(facetsFromRows(rows)).toEqual({
      categories: ["Games", "Subscription"],
      platforms: ["Netflix", "Roblox"],
    });
  });
});
