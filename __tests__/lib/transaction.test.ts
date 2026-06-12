import { describe, expect, it } from "vitest";
import {
  generateDuplicateKey,
  isRefund,
  normalizeMerchantText,
  parseAmount,
  parseTransactionDate,
  sourceLabel,
  validateTransactionInput,
} from "@/lib/transactions/transaction";

describe("parseAmount", () => {
  it("parses plain and decorated numbers", () => {
    expect(parseAmount("19.99")).toBe(19.99);
    expect(parseAmount("$1,234.56")).toBe(1234.56);
    expect(parseAmount("5")).toBe(5);
    expect(parseAmount("19.99 USD")).toBe(19.99);
    expect(parseAmount(42)).toBe(42);
  });

  it("treats leading minus and accounting parentheses as negative", () => {
    expect(parseAmount("-5")).toBe(-5);
    expect(parseAmount("(5.00)")).toBe(-5);
    expect(parseAmount("-$3.50")).toBe(-3.5);
  });

  it("returns null for non-numeric input", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
  });
});

describe("parseTransactionDate", () => {
  it("parses ISO dates", () => {
    expect(parseTransactionDate("2026-06-11")).toBe("2026-06-11");
    expect(parseTransactionDate("2026-6-1")).toBe("2026-06-01");
  });

  it("parses US slash dates incl. 2-digit years", () => {
    expect(parseTransactionDate("06/11/2026")).toBe("2026-06-11");
    expect(parseTransactionDate("6/1/26")).toBe("2026-06-01");
  });

  it("rejects invalid / impossible dates", () => {
    expect(parseTransactionDate("")).toBeNull();
    expect(parseTransactionDate("not a date")).toBeNull();
    expect(parseTransactionDate("02/30/2026")).toBeNull();
    expect(parseTransactionDate("2026-13-01")).toBeNull();
  });
});

describe("normalizeMerchantText", () => {
  it("lowercases, strips punctuation, and collapses whitespace", () => {
    expect(normalizeMerchantText("APPLE.COM/BILL  866-712")).toBe(
      "apple com bill 866 712",
    );
    expect(normalizeMerchantText(null)).toBe("");
  });
});

describe("generateDuplicateKey", () => {
  it("is stable for the same logical transaction", () => {
    const a = generateDuplicateKey({
      familyId: "fam1",
      transaction_date: "2026-06-11",
      amount: 19.99,
      merchant: "APPLE.COM/BILL",
    });
    const b = generateDuplicateKey({
      familyId: "fam1",
      transaction_date: "2026-06-11",
      amount: 19.99,
      merchant: "apple.com/bill",
    });
    expect(a).toBe(b);
  });

  it("differs when amount, date, family, or merchant differ", () => {
    const base = {
      familyId: "fam1",
      transaction_date: "2026-06-11",
      amount: 19.99,
      merchant: "Roblox",
    };
    expect(generateDuplicateKey(base)).not.toBe(
      generateDuplicateKey({ ...base, amount: 9.99 }),
    );
    expect(generateDuplicateKey(base)).not.toBe(
      generateDuplicateKey({ ...base, familyId: "fam2" }),
    );
    expect(generateDuplicateKey(base)).not.toBe(
      generateDuplicateKey({ ...base, merchant: "Steam" }),
    );
  });
});

describe("validateTransactionInput", () => {
  it("accepts a valid manual transaction", () => {
    const result = validateTransactionInput({
      merchant: "APPLE.COM/BILL",
      amount: "$19.99",
      transaction_date: "2026-06-11",
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.draft.amount).toBe(19.99);
      expect(result.draft.transaction_date).toBe("2026-06-11");
      expect(result.draft.merchant).toBe("APPLE.COM/BILL");
    }
  });

  it("requires a merchant or description", () => {
    const result = validateTransactionInput({
      amount: "5",
      transaction_date: "2026-06-11",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.merchant).toBeTruthy();
  });

  it("flags invalid amount and date", () => {
    const result = validateTransactionInput({
      merchant: "Roblox",
      amount: "abc",
      transaction_date: "nope",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.amount).toBeTruthy();
      expect(result.errors.transaction_date).toBeTruthy();
    }
  });

  it("allows negative amounts (refunds)", () => {
    const result = validateTransactionInput({
      description: "Refund",
      amount: "-9.99",
      transaction_date: "2026-06-11",
    });
    expect(result.valid).toBe(true);
    if (result.valid) expect(isRefund(result.draft.amount)).toBe(true);
  });
});

describe("sourceLabel", () => {
  it("maps source types to friendly labels", () => {
    expect(sourceLabel("manual")).toBe("Manual");
    expect(sourceLabel("receipt_paste")).toBe("Receipt");
    expect(sourceLabel("csv_upload")).toBe("CSV");
  });
});
