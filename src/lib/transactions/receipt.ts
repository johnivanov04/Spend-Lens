import { parseAmount, parseTransactionDate } from "./transaction";

export type ReceiptPreview = {
  merchant: string | null;
  amount: number | null;
  transaction_date: string | null;
  description: string | null;
};

const DATE_RX =
  /\b(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}\/\d{1,2}\/\d{1,2})\b/;
const MONEY_RX = /(?:[$£€]\s?)?(\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+\.\d{2})/g;

/**
 * Deterministic, no-AI receipt extraction. Heuristics only:
 * - merchant: the first non-empty line
 * - amount: the money figure on a "total" line, else the largest money figure
 * - date: the first date-looking token
 * - description: the second meaningful line, if any
 *
 * Any field may come back null; the UI lets the parent edit before saving.
 */
export function extractReceiptPreview(text: string): ReceiptPreview {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const merchant = lines[0] ?? null;

  // Date: first matching token across the whole text.
  const dateMatch = text.match(DATE_RX);
  const transaction_date = dateMatch ? parseTransactionDate(dateMatch[1]) : null;

  // Amount: prefer a line mentioning "total" (but not "subtotal").
  let amount: number | null = null;
  const totalLine = lines.find(
    (l) => /total/i.test(l) && !/subtotal/i.test(l),
  );
  if (totalLine) {
    amount = largestMoney(totalLine);
  }
  if (amount === null) {
    amount = largestMoney(text);
  }

  // Description: first non-merchant line that isn't purely the total/date.
  const description =
    lines.slice(1).find((l) => l !== totalLine && !DATE_RX.test(l)) ?? null;

  return { merchant, amount, transaction_date, description };
}

function largestMoney(text: string): number | null {
  const values: number[] = [];
  for (const m of text.matchAll(MONEY_RX)) {
    const n = parseAmount(m[1]);
    if (n !== null) values.push(n);
  }
  if (values.length === 0) return null;
  return values.reduce((max, n) => (Math.abs(n) > Math.abs(max) ? n : max));
}
