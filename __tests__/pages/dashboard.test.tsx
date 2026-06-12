import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import type { TransactionWithClassification } from "@/lib/data/classifications";

function row(id: string): TransactionWithClassification {
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
    classification: null,
  };
}

describe("DashboardView", () => {
  it("shows the empty state when there are no transactions", () => {
    render(
      <DashboardView
        transactionCount={0}
        classifiedCount={0}
        needsReviewCount={0}
        recent={[]}
        categorySummary={[]}
      />,
    );
    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Add transactions" }),
    ).toHaveAttribute("href", "/transactions/new");
  });

  it("shows classification counts, category summary, and recent items", () => {
    render(
      <DashboardView
        transactionCount={5}
        classifiedCount={4}
        needsReviewCount={2}
        recent={[row("t1")]}
        categorySummary={[{ category: "Games", count: 3 }]}
      />,
    );
    expect(screen.getByText("Saved transactions")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Classified")).toBeInTheDocument();
    expect(screen.getByText("Needs review")).toBeInTheDocument();
    expect(screen.getByText("Games · 3")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Recent transactions" }),
    ).toBeInTheDocument();
  });
});
