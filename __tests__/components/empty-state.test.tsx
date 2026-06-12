import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/empty-state";

describe("EmptyState", () => {
  it("renders the title and description", () => {
    render(
      <EmptyState
        title="No transactions yet"
        description="Upload a CSV or paste a receipt to get started."
      />,
    );
    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
    expect(
      screen.getByText("Upload a CSV or paste a receipt to get started."),
    ).toBeInTheDocument();
  });

  it("renders an action link when provided", () => {
    render(
      <EmptyState
        title="No transactions yet"
        description="desc"
        actionLabel="Add transactions"
        actionHref="/transactions"
      />,
    );
    const link = screen.getByRole("link", { name: "Add transactions" });
    expect(link).toHaveAttribute("href", "/transactions");
  });

  it("omits the action when no label/href is given", () => {
    render(<EmptyState title="Empty" description="desc" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
