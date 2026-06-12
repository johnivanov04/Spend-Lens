import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TransactionsTable } from "@/components/transactions/transaction-table";
import type {
  ClassificationRow,
  TransactionWithClassification,
} from "@/lib/data/classifications";

vi.mock("@/lib/data/classifications-client", () => ({
  saveCorrectionClient: vi.fn(),
  createMerchantRuleClient: vi.fn(),
}));

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
  );
});
afterEach(() => vi.unstubAllGlobals());

function reviewRow(): TransactionWithClassification {
  return {
    id: "t1",
    family_id: "fam1",
    source_type: "manual",
    merchant: "SQ *DIGITAL SERVICE",
    description: null,
    amount: 12.34,
    currency: "USD",
    transaction_date: "2026-06-11",
    raw_text: null,
    source_file_name: null,
    duplicate_key: null,
    created_at: "2026-06-11T00:00:00Z",
    updated_at: "2026-06-11T00:00:00Z",
    classification: {
      id: "c1",
      transaction_id: "t1",
      family_id: "fam1",
      platform: null,
      merchant_family: null,
      category: null,
      kid_related_likelihood: "unclear",
      confidence_score: 0.3,
      confidence_label: "unclassified",
      child_id: null,
      explanation: "We couldn't confidently match this merchant.",
      needs_review: true,
      model_provider: "mock",
      model_name: null,
      raw_model_output: null,
      created_at: "2026-06-11T00:00:00Z",
      updated_at: "2026-06-11T00:00:00Z",
    } as ClassificationRow,
  };
}

describe("Review queue (TransactionsTable with review props)", () => {
  it("shows the all-caught-up empty state", () => {
    render(
      <TransactionsTable
        rows={[]}
        familyId="fam1"
        children={[]}
        emptyTitle="You're all caught up"
        emptyDescription="Nothing needs review right now."
        emptyActionLabel="View all transactions"
        emptyActionHref="/transactions"
      />,
    );
    expect(screen.getByText("You're all caught up")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View all transactions" }),
    ).toHaveAttribute("href", "/transactions");
  });

  it("renders review rows with a needs-review status", () => {
    render(
      <TransactionsTable
        rows={[reviewRow()]}
        familyId="fam1"
        children={[]}
      />,
    );
    expect(screen.getByText("SQ *DIGITAL SERVICE")).toBeInTheDocument();
    expect(screen.getByText("Needs review")).toBeInTheDocument();
  });
});
