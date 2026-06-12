import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";

describe("DateRangeFilter", () => {
  it("renders all range options and marks the active one", () => {
    render(<DateRangeFilter active="30d" />);
    for (const label of ["7 days", "30 days", "90 days", "All time"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "30 days" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "7 days" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
