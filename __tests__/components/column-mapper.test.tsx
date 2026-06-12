import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ColumnMapper } from "@/components/transactions/column-mapper";

const EMPTY = { date: null, amount: null, merchant: null, description: null };

describe("ColumnMapper", () => {
  it("renders a selector for each field", () => {
    render(
      <ColumnMapper headers={["A", "B"]} mapping={EMPTY} onChange={() => {}} />,
    );
    expect(screen.getByLabelText("Map Date column")).toBeInTheDocument();
    expect(screen.getByLabelText("Map Amount column")).toBeInTheDocument();
    expect(screen.getByLabelText("Map Merchant column")).toBeInTheDocument();
    expect(screen.getByLabelText("Map Description column")).toBeInTheDocument();
  });

  it("emits an updated mapping when a column is chosen", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ColumnMapper
        headers={["When", "How much"]}
        mapping={EMPTY}
        onChange={onChange}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Map Date column"), "When");

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ date: "When" }),
    );
  });
});
