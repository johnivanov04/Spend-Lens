import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TransactionTable } from "@/components/transactions/transaction-table";
import type { TransactionRow } from "@/lib/data/transactions";

function txn(over: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: "t1",
    family_id: "fam1",
    source_type: "manual",
    merchant: "APPLE.COM/BILL",
    description: "App Store",
    amount: 19.99,
    currency: "USD",
    transaction_date: "2026-06-11",
    raw_text: null,
    source_file_name: null,
    duplicate_key: null,
    created_at: "2026-06-11T00:00:00Z",
    updated_at: "2026-06-11T00:00:00Z",
    ...over,
  };
}

describe("TransactionTable", () => {
  it("renders the empty state with links to add and upload", () => {
    render(<TransactionTable transactions={[]} />);
    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Add a transaction" }),
    ).toHaveAttribute("href", "/transactions/new");
  });

  it("renders saved transactions with source and status", () => {
    render(
      <TransactionTable
        transactions={[
          txn(),
          txn({ id: "t2", merchant: "Refund Co", amount: -5, source_type: "csv_upload" }),
        ]}
      />,
    );

    expect(screen.getByText("APPLE.COM/BILL")).toBeInTheDocument();
    expect(screen.getByText("$19.99")).toBeInTheDocument();
    expect(screen.getByText("Manual")).toBeInTheDocument();
    expect(screen.getByText("CSV")).toBeInTheDocument();
    expect(screen.getAllByText("Unclassified").length).toBeGreaterThan(0);
    expect(screen.getByText("(refund)")).toBeInTheDocument();
  });
});
