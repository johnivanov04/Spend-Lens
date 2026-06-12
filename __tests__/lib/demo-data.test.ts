import { describe, expect, it } from "vitest";
import { sampleTransactions } from "@/lib/demo-data";
import { validateTransactionInput } from "@/lib/transactions/transaction";

describe("sampleTransactions", () => {
  const today = new Date("2026-06-11T12:00:00Z");

  it("returns a varied set of valid demo transactions", () => {
    const rows = sampleTransactions(today);
    expect(rows.length).toBeGreaterThanOrEqual(8);
    for (const r of rows) {
      const result = validateTransactionInput({
        merchant: r.merchant,
        amount: String(r.amount),
        transaction_date: r.transaction_date,
      });
      expect(result.valid).toBe(true);
    }
  });

  it("includes a refund (negative amount) and dates within the last 7 days", () => {
    const rows = sampleTransactions(today);
    expect(rows.some((r) => r.amount < 0)).toBe(true);
    for (const r of rows) {
      expect(r.transaction_date >= "2026-06-05").toBe(true);
      expect(r.transaction_date <= "2026-06-11").toBe(true);
    }
  });
});
