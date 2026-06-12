import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UploadTabs } from "@/components/transactions/upload-tabs";

vi.mock("@/lib/data/transactions-client", () => ({
  importPdfTransactionsClient: vi.fn(),
  importCsvTransactionsClient: vi.fn(),
  createManualTransactionClient: vi.fn(),
  createReceiptTransactionClient: vi.fn(),
}));

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());

describe("UploadTabs", () => {
  it("offers both CSV and PDF upload options", () => {
    render(<UploadTabs familyId="fam1" />);
    expect(
      screen.getByRole("tab", { name: "CSV (preferred)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "PDF statement" }),
    ).toBeInTheDocument();
    // CSV is the default tab
    expect(screen.getByLabelText("CSV file")).toBeInTheDocument();
  });

  it("switches to the PDF uploader", async () => {
    const user = userEvent.setup();
    render(<UploadTabs familyId="fam1" />);
    await user.click(screen.getByRole("tab", { name: "PDF statement" }));
    expect(screen.getByLabelText("PDF statement")).toBeInTheDocument();
  });
});
