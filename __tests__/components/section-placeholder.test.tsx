import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionPlaceholder } from "@/components/section-placeholder";

describe("SectionPlaceholder", () => {
  it("renders the title, description, and target phase", () => {
    render(
      <SectionPlaceholder
        title="Transactions"
        description="Add and review transactions."
        phase="Phase 3"
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Transactions" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Add and review transactions.")).toBeInTheDocument();
    expect(screen.getByText("Coming in Phase 3")).toBeInTheDocument();
  });
});
