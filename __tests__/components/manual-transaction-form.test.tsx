import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ManualTransactionForm } from "@/components/transactions/manual-transaction-form";
import { createManualTransactionClient } from "@/lib/data/transactions-client";

vi.mock("@/lib/data/transactions-client", () => ({
  createManualTransactionClient: vi.fn(),
  createReceiptTransactionClient: vi.fn(),
  importCsvTransactionsClient: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe("ManualTransactionForm", () => {
  it("renders the input fields", () => {
    render(<ManualTransactionForm familyId="fam1" />);
    expect(screen.getByLabelText("Merchant")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
  });

  it("shows validation errors and does not submit when required fields are missing", async () => {
    const user = userEvent.setup();
    render(<ManualTransactionForm familyId="fam1" />);

    await user.click(screen.getByRole("button", { name: "Save transaction" }));

    expect(
      screen.getByText("Enter a merchant or description."),
    ).toBeInTheDocument();
    expect(screen.getByText("Enter a valid amount.")).toBeInTheDocument();
    expect(createManualTransactionClient).not.toHaveBeenCalled();
  });

  it("flags negative amounts as refunds", async () => {
    const user = userEvent.setup();
    render(<ManualTransactionForm familyId="fam1" />);

    await user.type(screen.getByLabelText("Amount"), "-5");
    expect(
      screen.getByText(/recorded as a refund\/credit/i),
    ).toBeInTheDocument();
  });

  it("submits a valid transaction via the mocked client", async () => {
    const user = userEvent.setup();
    vi.mocked(createManualTransactionClient).mockResolvedValue({
      id: "t1",
    } as never);
    render(<ManualTransactionForm familyId="fam1" />);

    await user.type(screen.getByLabelText("Merchant"), "Roblox");
    await user.type(screen.getByLabelText("Amount"), "49.99");
    await user.click(screen.getByRole("button", { name: "Save transaction" }));

    expect(createManualTransactionClient).toHaveBeenCalledWith(
      "fam1",
      expect.objectContaining({ merchant: "Roblox", amount: 49.99 }),
    );
  });
});
