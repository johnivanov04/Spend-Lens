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

describe("real statement formats (reconstructed lines)", () => {
  it("parses Wells Fargo checking rows (M/D) and ignores the running balance", () => {
    const r = validatePdfTransactionRow(
      "4/27 Purchase authorized on 04/25 Spotify USA NEW York NY 12.99 1,049.34",
      2026,
    );
    expect(r.valid).toBe(true);
    expect(r.draft?.amount).toBe(12.99); // the 1,049.34 is the balance, ignored
    expect(r.draft?.transaction_date).toBe("2026-04-27");
    expect(r.draft?.description).toMatch(/Spotify/);
  });

  it("treats Wells Fargo deposits (transfer/zelle from, cashout) as negative", () => {
    expect(
      validatePdfTransactionRow(
        "5/4 Online Transfer From Ivanov D Premier Checking xxxxxx3362 1,000.00",
        2026,
      ).draft?.amount,
    ).toBe(-1000);
    expect(
      validatePdfTransactionRow(
        "5/18 Venmo Cashout 260516 1050327716185 John Ivanov 124.10",
        2026,
      ).draft?.amount,
    ).toBe(-124.1);
  });

  it("parses Capital One credit-card rows (two MMM DD dates) with the - $ sign", () => {
    const purchase = validatePdfTransactionRow(
      "Apr 17 Apr 20 SHELL OIL 10007927006GLENDALECA $5.99",
      2026,
    );
    expect(purchase.draft?.amount).toBe(5.99);
    expect(purchase.draft?.transaction_date).toBe("2026-04-17");
    expect(purchase.draft?.description).toMatch(/SHELL OIL/);

    const payment = validatePdfTransactionRow(
      "Apr 27 Apr 27 CAPITAL ONE ONLINE PYMT - $611.81",
      2026,
    );
    expect(payment.draft?.amount).toBe(-611.81);
  });

  it("excludes statement headers and balance lines that start with a date", () => {
    const rows = detectPdfTransactionRows([
      "Apr 18, 2026 - May 18, 2026 | 31 days in Billing Cycle",
      "May 26, 2026 Page 1 of 5",
      "Beginning balance on 4/24 $1,112.32",
      "Apr 27 Apr 27 SHELL OIL CA $5.99",
    ]);
    expect(rows).toEqual(["Apr 27 Apr 27 SHELL OIL CA $5.99"]);
  });
});
