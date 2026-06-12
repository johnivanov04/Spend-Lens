import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import type { TransactionRow } from "@/lib/data/transactions";

function txn(over: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: "t1",
    family_id: "fam1",
    source_type: "manual",
    merchant: "APPLE.COM/BILL",
    description: null,
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

describe("DashboardView", () => {
  it("shows the empty state when there are no transactions", () => {
    render(<DashboardView transactionCount={0} recentTransactions={[]} />);
    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Add transactions" }),
    ).toHaveAttribute("href", "/transactions/new");
  });

  it("shows the count and recent transactions when data exists", () => {
    render(
      <DashboardView
        transactionCount={3}
        recentTransactions={[txn(), txn({ id: "t2", merchant: "ROBLOX.COM" })]}
      />,
    );
    expect(screen.getByText("Saved transactions")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Recent transactions" }),
    ).toBeInTheDocument();
    expect(screen.getByText("APPLE.COM/BILL")).toBeInTheDocument();
    expect(screen.getByText("ROBLOX.COM")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute(
      "href",
      "/transactions",
    );
  });
});
