import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "@/app/(app)/dashboard/page";

describe("Dashboard shell", () => {
  it("renders the dashboard heading and summary cards", () => {
    render(<DashboardPage />);
    expect(
      screen.getByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Likely kid-related spend")).toBeInTheDocument();
    expect(screen.getByText("$0.00")).toBeInTheDocument();
    expect(screen.getByText("Needs review")).toBeInTheDocument();
  });

  it("shows the empty state guiding the user to add transactions", () => {
    render(<DashboardPage />);
    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Upload a CSV or paste a receipt to start decoding family digital spending.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Add transactions" }),
    ).toHaveAttribute("href", "/transactions");
  });
});
