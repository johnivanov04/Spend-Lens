import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

function classification(over: Partial<ClassificationRow> = {}): ClassificationRow {
  return {
    id: "c1",
    transaction_id: "t1",
    family_id: "fam1",
    platform: "Roblox",
    merchant_family: "Roblox",
    category: "Games",
    kid_related_likelihood: "yes",
    confidence_score: 0.95,
    confidence_label: "high",
    child_id: null,
    explanation: "Likely a Roblox games charge.",
    needs_review: false,
    model_provider: "mock",
    model_name: null,
    raw_model_output: null,
    created_at: "2026-06-11T00:00:00Z",
    updated_at: "2026-06-11T00:00:00Z",
    ...over,
  };
}

function row(
  id: string,
  c: ClassificationRow | null,
): TransactionWithClassification {
  return {
    id,
    family_id: "fam1",
    source_type: "manual",
    merchant: "ROBLOX.COM",
    description: null,
    amount: 49.99,
    currency: "USD",
    transaction_date: "2026-06-11",
    raw_text: null,
    source_file_name: null,
    duplicate_key: null,
    created_at: "2026-06-11T00:00:00Z",
    updated_at: "2026-06-11T00:00:00Z",
    classification: c,
  };
}

describe("TransactionsTable", () => {
  it("renders the empty state with an add link", () => {
    render(<TransactionsTable rows={[]} familyId="fam1" children={[]} />);
    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Add a transaction" }),
    ).toHaveAttribute("href", "/transactions/new");
  });

  it("shows a Classify button for unclassified transactions", () => {
    render(
      <TransactionsTable
        rows={[row("t1", null)]}
        familyId="fam1"
        children={[]}
      />,
    );
    expect(screen.getByRole("button", { name: "Classify" })).toBeInTheDocument();
  });

  it("shows classification fields and a needs-review status", () => {
    render(
      <TransactionsTable
        rows={[row("t1", classification({ needs_review: true }))]}
        familyId="fam1"
        children={[]}
      />,
    );
    expect(screen.getByText("Games")).toBeInTheDocument();
    expect(screen.getByText("Roblox")).toBeInTheDocument();
    expect(screen.getByText("High confidence")).toBeInTheDocument();
    expect(screen.getByText("Needs review")).toBeInTheDocument();
  });

  it("reveals the explanation and correction form on Details", async () => {
    const user = userEvent.setup();
    render(
      <TransactionsTable
        rows={[row("t1", classification())]}
        familyId="fam1"
        children={[]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(
      screen.getByText(/Likely a Roblox games charge/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save correction" }),
    ).toBeInTheDocument();
  });
});
