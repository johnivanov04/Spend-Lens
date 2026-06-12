import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import type { DashboardSummary } from "@/lib/analytics";

function summary(over: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    totalTransactions: 5,
    classifiedCount: 4,
    needsReviewCount: 2,
    likelyKidSpend: 79.98,
    unclearKidSpend: 9.99,
    byCategory: [{ key: "Games", amount: 79.98, count: 2 }],
    byPlatform: [{ key: "Roblox", amount: 79.98, count: 2 }],
    byChild: [],
    byKidLikelihood: { yes: 79.98, no: 0, unclear: 9.99 },
    recentNeedsReview: [],
    recentClassified: [],
    ...over,
  };
}

describe("DashboardView", () => {
  it("shows the empty state when there are no transactions in range", () => {
    render(
      <DashboardView
        summary={summary({ totalTransactions: 0, classifiedCount: 0 })}
        range="30d"
        hasChildren={false}
      />,
    );
    expect(screen.getByText("No transactions in this range")).toBeInTheDocument();
  });

  it("renders summary cards, breakdowns, and the date range filter", () => {
    render(<DashboardView summary={summary()} range="30d" hasChildren={false} />);
    expect(screen.getByText("Transactions")).toBeInTheDocument();
    expect(screen.getByText("Likely kid-related spend")).toBeInTheDocument();
    expect(screen.getByText("Unclear kid-related spend")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Spend by category" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Spend by platform" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Date range" })).toBeInTheDocument();
  });

  it("links the needs-review card to the review queue", () => {
    render(<DashboardView summary={summary()} range="30d" hasChildren={false} />);
    expect(screen.getByRole("link", { name: /Needs review/ })).toHaveAttribute(
      "href",
      "/transactions/review",
    );
  });
});
