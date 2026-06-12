import { describe, expect, it } from "vitest";
import { classificationCounts, summarizeCategories } from "@/lib/dashboard";
import type {
  ClassificationRow,
  TransactionWithClassification,
} from "@/lib/data/classifications";

function row(
  id: string,
  classification: Partial<ClassificationRow> | null,
): TransactionWithClassification {
  return {
    id,
    family_id: "fam1",
    source_type: "manual",
    merchant: "M",
    description: null,
    amount: 1,
    currency: "USD",
    transaction_date: "2026-06-11",
    raw_text: null,
    source_file_name: null,
    duplicate_key: null,
    created_at: "2026-06-11T00:00:00Z",
    updated_at: "2026-06-11T00:00:00Z",
    classification: classification
      ? ({
          id: `c-${id}`,
          transaction_id: id,
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
          ...classification,
        } as ClassificationRow)
      : null,
  };
}

describe("classificationCounts", () => {
  it("counts total, classified, and needs-review", () => {
    const rows = [
      row("1", { needs_review: true }),
      row("2", { needs_review: false }),
      row("3", null),
    ];
    expect(classificationCounts(rows)).toEqual({
      transactionCount: 3,
      classifiedCount: 2,
      needsReviewCount: 1,
    });
  });
});

describe("summarizeCategories", () => {
  it("counts classified transactions per category, highest first", () => {
    const rows = [
      row("1", { category: "Games" }),
      row("2", { category: "Games" }),
      row("3", { category: "Subscription" }),
      row("4", null),
    ];
    expect(summarizeCategories(rows)).toEqual([
      { category: "Games", count: 2 },
      { category: "Subscription", count: 1 },
    ]);
  });
});
