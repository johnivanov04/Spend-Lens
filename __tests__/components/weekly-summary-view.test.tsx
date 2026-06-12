import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeeklySummaryView } from "@/components/summary/weekly-summary-view";
import type { WeeklySummaryData } from "@/lib/weekly-summary";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
  );
});
afterEach(() => vi.unstubAllGlobals());

function data(over: Partial<WeeklySummaryData> = {}): WeeklySummaryData {
  return {
    periodStart: "2026-06-05",
    periodEnd: "2026-06-11",
    totalTransactions: 3,
    classifiedCount: 3,
    needsReviewCount: 1,
    lowConfidenceCount: 1,
    likelyKidSpend: 79.98,
    unclearKidSpend: 9.99,
    topCategories: [{ key: "Games", amount: 79.98, count: 2 }],
    topPlatforms: [{ key: "Roblox", amount: 79.98, count: 2 }],
    byChild: [],
    hasChildren: false,
    recentNeedsReview: [
      { id: "t1", merchant: "SQ *DIGITAL", amount: 9.99, date: "2026-06-10" },
    ],
    state: "ok",
    ...over,
  };
}

describe("WeeklySummaryView", () => {
  it("renders the period, text, and a disabled email button", () => {
    render(
      <WeeklySummaryView data={data()} text="In the last 7 days…" emailEnabled={false} />,
    );
    expect(screen.getByText("2026-06-05 – 2026-06-11 (last 7 days)")).toBeInTheDocument();
    expect(screen.getByText("In the last 7 days…")).toBeInTheDocument();
    const emailBtn = screen.getByRole("button", { name: "Email sending not enabled" });
    expect(emailBtn).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Regenerate preview" }),
    ).toBeInTheDocument();
  });

  it("renders summary cards and sections for a normal week", () => {
    render(<WeeklySummaryView data={data()} text="…" emailEnabled={false} />);
    expect(screen.getByText("Likely kid-related spend")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Top categories" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Top platforms" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Needs review" }),
    ).toBeInTheDocument();
    expect(screen.getByText("SQ *DIGITAL")).toBeInTheDocument();
  });

  it("renders a child breakdown only when children exist", () => {
    render(
      <WeeklySummaryView
        data={data({
          hasChildren: true,
          byChild: [{ childId: "k1", childName: "Alex", amount: 25, count: 1 }],
        })}
        text="…"
        emailEnabled={false}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Spend by child" }),
    ).toBeInTheDocument();
  });

  it("hides cards/sections in the no-transactions state", () => {
    render(
      <WeeklySummaryView
        data={data({ totalTransactions: 0, state: "no_transactions" })}
        text="No transactions in the last 7 days (Jun 5–Jun 11)."
        emailEnabled={false}
      />,
    );
    expect(
      screen.getByText(/No transactions in the last 7 days/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Likely kid-related spend")).not.toBeInTheDocument();
  });
});
