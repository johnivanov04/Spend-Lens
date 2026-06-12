import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PdfUploader } from "@/components/transactions/pdf-uploader";
import { importPdfTransactionsClient } from "@/lib/data/transactions-client";
import {
  convertPdfRowsToTransactionPreview,
  parsePdfStatementText,
} from "@/lib/transactions/pdf";

vi.mock("@/lib/data/transactions-client", () => ({
  importPdfTransactionsClient: vi.fn(),
  importCsvTransactionsClient: vi.fn(),
  createManualTransactionClient: vi.fn(),
  createReceiptTransactionClient: vi.fn(),
}));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function pdfFile() {
  return new File([new Uint8Array([1, 2, 3])], "statement.pdf", {
    type: "application/pdf",
  });
}

function samplePreview() {
  const { rows } = parsePdfStatementText(
    "06/11/2026 ROBLOX.COM 9.99\n06/12/2026 BAD ROW",
  );
  // add one explicit invalid row so the preview has a mix
  return convertPdfRowsToTransactionPreview([
    ...rows,
    { line: "bad", valid: false, errors: ["No amount found"] },
  ]);
}

describe("PdfUploader", () => {
  it("renders the PDF input and privacy copy", () => {
    render(<PdfUploader familyId="fam1" />);
    expect(screen.getByLabelText("PDF statement")).toBeInTheDocument();
    expect(
      screen.getByText(/never store the file itself/i),
    ).toBeInTheDocument();
  });

  it("shows the scanned/image-only error message", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        message:
          "This PDF appears to be scanned or image-only. Spend Lens can't read it yet. Try exporting a CSV or downloading a digital statement.",
      }),
    } as never);
    render(<PdfUploader familyId="fam1" />);

    await user.upload(screen.getByLabelText("PDF statement"), pdfFile());

    expect(
      await screen.findByText(/scanned or image-only/i),
    ).toBeInTheDocument();
  });

  it("renders a preview with valid + invalid rows", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ preview: samplePreview(), rowCount: 2 }),
    } as never);
    render(<PdfUploader familyId="fam1" />);

    await user.upload(screen.getByLabelText("PDF statement"), pdfFile());

    expect(await screen.findByText("1 valid")).toBeInTheDocument();
    expect(screen.getByText("1 invalid")).toBeInTheDocument();
    expect(screen.getByText("ROBLOX.COM")).toBeInTheDocument();
  });

  it("imports valid rows and shows a summary", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ preview: samplePreview(), rowCount: 2 }),
    } as never);
    vi.mocked(importPdfTransactionsClient).mockResolvedValue({
      importId: "imp1",
      rowCount: 2,
      created: 1,
      skipped: 0,
      failed: 1,
    });
    render(<PdfUploader familyId="fam1" />);

    await user.upload(screen.getByLabelText("PDF statement"), pdfFile());
    await screen.findByText("1 valid");
    await user.click(
      screen.getByRole("button", { name: /Import 1 transaction/ }),
    );

    expect(importPdfTransactionsClient).toHaveBeenCalledWith(
      "fam1",
      expect.objectContaining({ fileName: "statement.pdf", failedCount: 1 }),
    );
    expect(await screen.findByText("Import complete")).toBeInTheDocument();
  });
});
