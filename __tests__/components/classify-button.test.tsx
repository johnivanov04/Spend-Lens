import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClassifyButton } from "@/components/transactions/classify-button";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("ClassifyButton", () => {
  it("renders a Classify button", () => {
    render(<ClassifyButton transactionId="t1" />);
    expect(screen.getByRole("button", { name: "Classify" })).toBeInTheDocument();
  });

  it("POSTs to the classify route on click", async () => {
    const user = userEvent.setup();
    render(<ClassifyButton transactionId="t1" />);
    await user.click(screen.getByRole("button", { name: "Classify" }));
    expect(fetch).toHaveBeenCalledWith("/api/transactions/t1/classify", {
      method: "POST",
    });
  });
});
