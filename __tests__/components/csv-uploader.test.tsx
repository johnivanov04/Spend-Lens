import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CsvUploader } from "@/components/transactions/csv-uploader";
import { importCsvTransactionsClient } from "@/lib/data/transactions-client";

vi.mock("@/lib/data/transactions-client", () => ({
  createManualTransactionClient: vi.fn(),
  createReceiptTransactionClient: vi.fn(),
  importCsvTransactionsClient: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

const CSV =
  "Date,Description,Amount\n2026-06-11,Roblox,49.99\nbad-date,Steam,9.99\n";

function csvFile() {
  return new File([CSV], "test.csv", { type: "text/csv" });
}

describe("CsvUploader", () => {
  it("renders the file input", () => {
    render(<CsvUploader familyId="fam1" />);
    expect(screen.getByLabelText("CSV file")).toBeInTheDocument();
  });

  it("parses an uploaded file and shows a preview with valid/invalid counts", async () => {
    const user = userEvent.setup();
    render(<CsvUploader familyId="fam1" />);

    await user.upload(screen.getByLabelText("CSV file"), csvFile());

    expect(await screen.findByText("1 valid")).toBeInTheDocument();
    expect(screen.getByText("1 invalid")).toBeInTheDocument();
    expect(screen.getByText(/Invalid —/)).toBeInTheDocument();
    expect(screen.getByText("Columns detected automatically.")).toBeInTheDocument();
  });

  it("imports valid rows via the mocked client and shows a summary", async () => {
    const user = userEvent.setup();
    vi.mocked(importCsvTransactionsClient).mockResolvedValue({
      importId: "imp1",
      rowCount: 2,
      created: 1,
      skipped: 0,
      failed: 1,
    });
    render(<CsvUploader familyId="fam1" />);

    await user.upload(screen.getByLabelText("CSV file"), csvFile());
    await screen.findByText("1 valid");
    await user.click(
      screen.getByRole("button", { name: /Import 1 transaction/ }),
    );

    expect(importCsvTransactionsClient).toHaveBeenCalledWith(
      "fam1",
      expect.objectContaining({
        fileName: "test.csv",
        rowCount: 2,
        failedCount: 1,
      }),
    );
    const callArg = vi.mocked(importCsvTransactionsClient).mock.calls[0][1];
    expect(callArg.drafts).toHaveLength(1);
    expect(await screen.findByText("Import complete")).toBeInTheDocument();
  });
});
