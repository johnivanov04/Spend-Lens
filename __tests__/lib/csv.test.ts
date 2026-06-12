import { describe, expect, it } from "vitest";
import {
  buildCsvPreview,
  detectCsvColumns,
  parseCsvRows,
  validateCsvRow,
  type CsvColumnMapping,
} from "@/lib/transactions/csv";

const MAPPING: CsvColumnMapping = {
  date: "Date",
  amount: "Amount",
  merchant: "Description",
  description: null,
};

describe("parseCsvRows", () => {
  it("parses headers and rows and skips blank lines", () => {
    const csv = "Date,Description,Amount\n2026-06-11,Roblox,49.99\n\n2026-06-12,Steam,9.99\n";
    const { headers, rows } = parseCsvRows(csv);
    expect(headers).toEqual(["Date", "Description", "Amount"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ Description: "Roblox", Amount: "49.99" });
  });

  it("handles quoted fields containing commas", () => {
    const csv = 'Date,Description,Amount\n2026-06-11,"ACME, INC",10.00\n';
    const { rows } = parseCsvRows(csv);
    expect(rows[0].Description).toBe("ACME, INC");
  });
});

describe("detectCsvColumns", () => {
  it("auto-detects common headers", () => {
    const { mapping, confident } = detectCsvColumns([
      "Date",
      "Description",
      "Amount",
    ]);
    expect(mapping.date).toBe("Date");
    expect(mapping.amount).toBe("Amount");
    expect(mapping.description).toBe("Description");
    expect(confident).toBe(true);
  });

  it("is not confident when key columns are missing", () => {
    const { confident } = detectCsvColumns(["Foo", "Bar", "Baz"]);
    expect(confident).toBe(false);
  });
});

describe("validateCsvRow", () => {
  it("accepts a valid row", () => {
    const result = validateCsvRow(
      { Date: "2026-06-11", Description: "Roblox", Amount: "49.99" },
      MAPPING,
    );
    expect(result.valid).toBe(true);
    expect(result.draft?.amount).toBe(49.99);
  });

  it("reports specific reasons for invalid rows", () => {
    const result = validateCsvRow(
      { Date: "nope", Description: "", Amount: "" },
      MAPPING,
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid date "nope"');
    expect(result.errors).toContain("Missing amount");
    expect(result.errors).toContain("Missing merchant/description");
  });
});

describe("buildCsvPreview", () => {
  it("counts valid, invalid, and within-file duplicate rows", () => {
    const rows = [
      { Date: "2026-06-11", Description: "Roblox", Amount: "49.99" },
      { Date: "2026-06-11", Description: "Roblox", Amount: "49.99" }, // dup
      { Date: "bad", Description: "Steam", Amount: "9.99" }, // invalid
    ];
    const preview = buildCsvPreview(rows, MAPPING);
    expect(preview.validCount).toBe(1);
    expect(preview.duplicateCount).toBe(1);
    expect(preview.invalidCount).toBe(1);
    expect(preview.rows[1].duplicateInFile).toBe(true);
  });
});
