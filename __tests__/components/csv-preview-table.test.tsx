import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CsvPreviewTable } from "@/components/transactions/csv-preview-table";
import { buildCsvPreview, type CsvColumnMapping } from "@/lib/transactions/csv";

const mapping: CsvColumnMapping = {
  date: "Date",
  amount: "Amount",
  merchant: "Description",
  description: null,
};

describe("CsvPreviewTable", () => {
  it("renders counts and per-row status, including invalid reasons", () => {
    const preview = buildCsvPreview(
      [
        { Date: "2026-06-11", Description: "Roblox", Amount: "49.99" },
        { Date: "bad", Description: "Steam", Amount: "" },
      ],
      mapping,
    );

    render(<CsvPreviewTable preview={preview} />);

    expect(screen.getByText("1 valid")).toBeInTheDocument();
    expect(screen.getByText("1 invalid")).toBeInTheDocument();
    expect(screen.getByText("Roblox")).toBeInTheDocument();
    expect(screen.getByText("Valid")).toBeInTheDocument();
    expect(screen.getByText(/Invalid —/)).toBeInTheDocument();
  });
});
