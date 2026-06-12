import { describe, expect, it } from "vitest";
import {
  convertPdfRowsToTransactionPreview,
  detectPdfTransactionRows,
  identifyLikelyPdfStatementFormat,
  inferStatementYear,
  parsePdfStatementText,
  validatePdfTransactionRow,
} from "@/lib/transactions/pdf";

describe("detectPdfTransactionRows", () => {
  it("keeps date+amount lines and ignores balances/account/page metadata", () => {
    const lines = [
      "Statement period 06/01/2026 - 06/30/2026",
      "Account Number 1234567890",
      "06/11/2026 ROBLOX.COM 9.99",
      "06/12/2026 NETFLIX.COM 15.49",
      "01/01/2026 Beginning Balance 5,000.00",
      "Ending Balance 1,234.56",
      "Page 1 of 3",
    ];
    expect(detectPdfTransactionRows(lines)).toEqual([
      "06/11/2026 ROBLOX.COM 9.99",
      "06/12/2026 NETFLIX.COM 15.49",
    ]);
  });
});

describe("validatePdfTransactionRow", () => {
  it("parses MM/DD/YYYY rows", () => {
    const r = validatePdfTransactionRow("06/11/2026 ROBLOX.COM 9.99");
    expect(r.valid).toBe(true);
    expect(r.draft).toMatchObject({
      description: "ROBLOX.COM",
      amount: 9.99,
      transaction_date: "2026-06-11",
    });
  });

  it("parses MM/DD rows using an inferred year", () => {
    const r = validatePdfTransactionRow("06/11 ROBLOX.COM 9.99", 2026);
    expect(r.draft?.transaction_date).toBe("2026-06-11");
  });

  it("parses ISO rows", () => {
    const r = validatePdfTransactionRow("2026-06-11 STEAM 29.99");
    expect(r.draft?.transaction_date).toBe("2026-06-11");
    expect(r.draft?.amount).toBe(29.99);
  });

  it("handles leading-minus, trailing-minus, $ and commas", () => {
    expect(validatePdfTransactionRow("06/11/2026 REFUND -9.99").draft?.amount).toBe(-9.99);
    expect(validatePdfTransactionRow("06/11/2026 PAYMENT 9.99-").draft?.amount).toBe(-9.99);
    expect(validatePdfTransactionRow("06/11/2026 BIG BUY $1,234.56").draft?.amount).toBe(1234.56);
  });

  it("marks ambiguous rows invalid with reasons", () => {
    expect(validatePdfTransactionRow("06/11/2026 NO AMOUNT HERE")).toMatchObject({
      valid: false,
    });
    expect(validatePdfTransactionRow("JUST SOME TEXT 9.99").valid).toBe(false);
    expect(validatePdfTransactionRow("13/45/2026 BAD DATE 9.99").valid).toBe(false);
  });
});

describe("inferStatementYear", () => {
  it("reads a 4-digit year from the text, else falls back", () => {
    expect(inferStatementYear("Statement period 2026")).toBe(2026);
    expect(inferStatementYear("no year here", 2030)).toBe(2030);
  });
});

describe("identifyLikelyPdfStatementFormat", () => {
  it("picks the dominant date format", () => {
    expect(
      identifyLikelyPdfStatementFormat("06/11/2026 A 1.00\n06/12/2026 B 2.00"),
    ).toBe("mm/dd/yyyy");
    expect(identifyLikelyPdfStatementFormat("2026-06-11 A 1.00")).toBe("iso");
    expect(identifyLikelyPdfStatementFormat("no dates")).toBe("unknown");
  });
});

describe("parsePdfStatementText", () => {
  it("parses a statement, ignoring metadata", () => {
    const text = [
      "MY BANK Statement 2026",
      "Account Number 99887766",
      "06/11/2026 ROBLOX.COM 9.99",
      "06/12/2026 NETFLIX.COM 15.49",
      "Ending Balance 1,000.00",
    ].join("\n");
    const { rows } = parsePdfStatementText(text);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.valid)).toBe(true);
  });

  it("returns no rows for empty (scanned) text", () => {
    expect(parsePdfStatementText("").rows).toHaveLength(0);
  });
});

describe("convertPdfRowsToTransactionPreview", () => {
  it("counts valid, invalid, and within-file duplicate rows", () => {
    const { rows } = parsePdfStatementText(
      [
        "06/11/2026 ROBLOX.COM 9.99",
        "06/11/2026 ROBLOX.COM 9.99", // duplicate
        "06/12/2026 BROKEN ROW", // invalid (no amount)
      ].join("\n"),
    );
    // the broken row has no amount so it isn't detected as a candidate at all;
    // build an explicit invalid row to exercise the count.
    const preview = convertPdfRowsToTransactionPreview([
      ...rows,
      { line: "bad", valid: false, errors: ["No amount found"] },
    ]);
    expect(preview.validCount).toBe(1);
    expect(preview.duplicateCount).toBe(1);
    expect(preview.invalidCount).toBe(1);
  });
});
