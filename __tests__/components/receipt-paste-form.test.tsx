import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReceiptPasteForm } from "@/components/transactions/receipt-paste-form";
import { createReceiptTransactionClient } from "@/lib/data/transactions-client";

vi.mock("@/lib/data/transactions-client", () => ({
  createManualTransactionClient: vi.fn(),
  createReceiptTransactionClient: vi.fn(),
  importCsvTransactionsClient: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

const RECEIPT = "Roblox\nOrder date: 06/11/2026\nTotal: $54.99";

describe("ReceiptPasteForm", () => {
  it("renders the receipt textarea and extract button", () => {
    render(<ReceiptPasteForm familyId="fam1" />);
    expect(screen.getByLabelText("Receipt text")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Extract preview" }),
    ).toBeInTheDocument();
  });

  it("shows an editable preview after extraction", async () => {
    const user = userEvent.setup();
    render(<ReceiptPasteForm familyId="fam1" />);

    await user.type(screen.getByLabelText("Receipt text"), RECEIPT);
    await user.click(screen.getByRole("button", { name: "Extract preview" }));

    expect(
      await screen.findByText(/Preview — review and edit before saving/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Merchant")).toHaveValue("Roblox");
    expect(screen.getByLabelText("Amount")).toHaveValue("54.99");
  });

  it("saves the previewed transaction via the mocked client", async () => {
    const user = userEvent.setup();
    vi.mocked(createReceiptTransactionClient).mockResolvedValue({
      id: "t1",
    } as never);
    render(<ReceiptPasteForm familyId="fam1" />);

    await user.type(screen.getByLabelText("Receipt text"), RECEIPT);
    await user.click(screen.getByRole("button", { name: "Extract preview" }));
    await screen.findByText(/review and edit before saving/i);
    await user.click(screen.getByRole("button", { name: "Save transaction" }));

    expect(createReceiptTransactionClient).toHaveBeenCalledWith(
      "fam1",
      expect.objectContaining({
        merchant: "Roblox",
        amount: 54.99,
        transaction_date: "2026-06-11",
      }),
    );
  });
});
