import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpendBarChart } from "@/components/dashboard/spend-bar-chart";

describe("SpendBarChart", () => {
  it("renders the empty text when there is no data", () => {
    render(<SpendBarChart title="Spend by category" data={[]} emptyText="Nothing here." />);
    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
  });

  it("renders a labelled bar with a formatted amount per datum", () => {
    render(
      <SpendBarChart
        title="Spend by category"
        data={[
          { label: "Games", amount: 79.98 },
          { label: "Subscription", amount: 9.99 },
        ]}
      />,
    );
    expect(screen.getByText("Games")).toBeInTheDocument();
    expect(screen.getByText("$79.98")).toBeInTheDocument();
    expect(screen.getByText("Subscription")).toBeInTheDocument();
  });
});
