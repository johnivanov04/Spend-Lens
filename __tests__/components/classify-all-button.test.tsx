import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClassifyAllButton } from "@/components/transactions/classify-all-button";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        classified_count: 3,
        needs_review_count: 1,
        failed_count: 0,
      }),
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("ClassifyAllButton", () => {
  it("renders the batch button", () => {
    render(<ClassifyAllButton />);
    expect(
      screen.getByRole("button", { name: "Classify all unclassified" }),
    ).toBeInTheDocument();
  });

  it("calls the batch route and shows a summary", async () => {
    const user = userEvent.setup();
    render(<ClassifyAllButton />);
    await user.click(
      screen.getByRole("button", { name: "Classify all unclassified" }),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/transactions/classify-batch",
      expect.objectContaining({ method: "POST" }),
    );
    expect(await screen.findByText(/Classified 3/)).toBeInTheDocument();
  });
});
