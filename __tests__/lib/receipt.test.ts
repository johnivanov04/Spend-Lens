import { describe, expect, it } from "vitest";
import { extractReceiptPreview } from "@/lib/transactions/receipt";

describe("extractReceiptPreview", () => {
  it("extracts merchant, total, and date from a typical receipt", () => {
    const text = [
      "Roblox",
      "Order date: 06/11/2026",
      "Robux 10,000",
      "Subtotal: $49.99",
      "Total: $54.99",
    ].join("\n");

    const preview = extractReceiptPreview(text);
    expect(preview.merchant).toBe("Roblox");
    expect(preview.transaction_date).toBe("2026-06-11");
    expect(preview.amount).toBe(54.99); // prefers the "Total" line, not subtotal
  });

  it("falls back to the largest amount when there is no total line", () => {
    const text = "Apple\n2026-06-11\nApp purchase 4.99\nTax 0.50";
    const preview = extractReceiptPreview(text);
    expect(preview.merchant).toBe("Apple");
    expect(preview.amount).toBe(4.99);
  });

  it("returns nulls gracefully for unhelpful text", () => {
    const preview = extractReceiptPreview("???");
    expect(preview.amount).toBeNull();
    expect(preview.transaction_date).toBeNull();
  });
});
