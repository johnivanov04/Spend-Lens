/**
 * Pure, framework-free transaction helpers. No Supabase, no AI, no network —
 * just deterministic parsing/validation so they're trivially unit-testable and
 * reusable across manual entry, receipt paste, and CSV import.
 */

export type SourceType =
  | "manual"
  | "receipt_paste"
  | "csv_upload"
  | "pdf_upload"
  | "email_forward_later"
  | "bank_feed_later";

/** A validated, normalized transaction ready to persist. */
export type TransactionDraft = {
  merchant: string | null;
  description: string | null;
  amount: number;
  transaction_date: string; // YYYY-MM-DD
  raw_text?: string | null;
};

export type RawTransactionInput = {
  merchant?: string;
  description?: string;
  amount?: string | number;
  transaction_date?: string;
  raw_text?: string;
};

/** Lowercase, strip punctuation, collapse whitespace — for duplicate matching. */
export function normalizeMerchantText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Parse a money string into a number. Handles "$", commas, surrounding spaces,
 * a trailing/leading currency code, a leading "-", and accounting parentheses
 * (e.g. "(5.00)" -> -5). Returns null when there's no parseable number.
 */
export function parseAmount(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;

  let s = raw.trim();
  if (!s) return null;

  let negative = false;
  // Accounting style: (5.00) means -5.00
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  // Strip currency symbols, codes, commas, and spaces.
  s = s.replace(/[$£€]/g, "").replace(/[a-zA-Z]/g, "").replace(/,/g, "").trim();
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1).trim();
  }
  if (s === "" || !/^\d*\.?\d+$/.test(s)) return null;

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/**
 * Parse a date string into YYYY-MM-DD. Supports ISO (YYYY-MM-DD), US slashes
 * (M/D/YYYY or M/D/YY), and Y/M/D slashes. Returns null when invalid.
 */
export function parseTransactionDate(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const s = raw.trim();

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return buildDate(+iso[1], +iso[2], +iso[3]);

  const ymdSlash = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (ymdSlash) return buildDate(+ymdSlash[1], +ymdSlash[2], +ymdSlash[3]);

  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (us) {
    let year = +us[3];
    if (year < 100) year += 2000;
    return buildDate(year, +us[1], +us[2]);
  }

  return null;
}

function buildDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Reject impossible days (e.g. 02/30) via round-trip.
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/**
 * Deterministic duplicate key: same family + date + amount + normalized
 * merchant/description => same key. Used to detect likely duplicate charges.
 */
export function generateDuplicateKey(input: {
  familyId: string;
  transaction_date: string;
  amount: number;
  merchant?: string | null;
  description?: string | null;
}): string {
  const normalized = normalizeMerchantText(input.merchant || input.description || "");
  return [
    input.familyId,
    input.transaction_date,
    input.amount.toFixed(2),
    normalized,
  ].join("|");
}

export type ValidationResult =
  | { valid: true; draft: TransactionDraft; errors: Record<string, never> }
  | { valid: false; errors: Record<string, string> };

/**
 * Validate raw manual/receipt input. Requires a merchant OR description, a
 * numeric amount, and a valid date. Negative amounts (refunds) are allowed.
 */
export function validateTransactionInput(
  input: RawTransactionInput,
): ValidationResult {
  const errors: Record<string, string> = {};

  const merchant = (input.merchant ?? "").trim();
  const description = (input.description ?? "").trim();
  if (!merchant && !description) {
    errors.merchant = "Enter a merchant or description.";
  }

  const amount = parseAmount(input.amount ?? "");
  if (amount === null) {
    errors.amount = "Enter a valid amount.";
  }

  const transaction_date = parseTransactionDate(input.transaction_date ?? "");
  if (!transaction_date) {
    errors.transaction_date = "Enter a valid date.";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    draft: {
      merchant: merchant || null,
      description: description || null,
      amount: amount as number,
      transaction_date: transaction_date as string,
      raw_text: input.raw_text?.trim() || null,
    },
  };
}

/** Whether an amount represents a refund / credit (negative). */
export function isRefund(amount: number): boolean {
  return amount < 0;
}

const SOURCE_LABELS: Record<SourceType, string> = {
  manual: "Manual",
  receipt_paste: "Receipt",
  csv_upload: "CSV",
  pdf_upload: "PDF",
  email_forward_later: "Email",
  bank_feed_later: "Bank",
};

/** Human-friendly label for a transaction's source. */
export function sourceLabel(source: SourceType): string {
  return SOURCE_LABELS[source] ?? source;
}
