import Papa from "papaparse";
import {
  generateDuplicateKey,
  parseAmount,
  parseTransactionDate,
  type TransactionDraft,
} from "./transaction";

/** Which CSV header maps to each field we need. */
export type CsvColumnMapping = {
  date: string | null;
  merchant: string | null;
  description: string | null;
  amount: string | null;
};

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

/** Parse CSV text into headers + row objects using PapaParse. */
export function parseCsvRows(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  const headers = (result.meta.fields ?? []).filter((h) => h.length > 0);
  const rows = (result.data ?? []).filter(
    (r) => r && Object.values(r).some((v) => (v ?? "").toString().trim() !== ""),
  );
  return { headers, rows };
}

const PATTERNS = {
  date: /(^|[^a-z])(date|posted|time)([^a-z]|$)/i,
  amount: /(^|[^a-z])(amount|debit|credit|value|total|price|charge)([^a-z]|$)/i,
  merchant: /(^|[^a-z])(merchant|payee|vendor|store|name)([^a-z]|$)/i,
  description: /(^|[^a-z])(description|details|memo|narration|note|reference)([^a-z]|$)/i,
};

/**
 * Auto-detect the date/merchant/description/amount columns from headers.
 * `confident` is true when we found a date, an amount, and at least one of
 * merchant/description — otherwise the UI should show the column mapper.
 */
export function detectCsvColumns(headers: string[]): {
  mapping: CsvColumnMapping;
  confident: boolean;
} {
  const find = (re: RegExp) => headers.find((h) => re.test(h)) ?? null;
  const mapping: CsvColumnMapping = {
    date: find(PATTERNS.date),
    amount: find(PATTERNS.amount),
    merchant: find(PATTERNS.merchant),
    description: find(PATTERNS.description),
  };
  const confident = Boolean(
    mapping.date && mapping.amount && (mapping.merchant || mapping.description),
  );
  return { mapping, confident };
}

export type CsvRowResult = {
  valid: boolean;
  errors: string[];
  draft?: TransactionDraft;
};

/** Validate a single CSV row against the column mapping, with specific reasons. */
export function validateCsvRow(
  row: Record<string, string>,
  mapping: CsvColumnMapping,
): CsvRowResult {
  const errors: string[] = [];

  const dateRaw = (mapping.date ? row[mapping.date] : "") ?? "";
  const amountRaw = (mapping.amount ? row[mapping.amount] : "") ?? "";
  const merchant = ((mapping.merchant ? row[mapping.merchant] : "") ?? "").trim();
  const description = (
    (mapping.description ? row[mapping.description] : "") ?? ""
  ).trim();

  const transaction_date = parseTransactionDate(dateRaw);
  if (!dateRaw.toString().trim()) errors.push("Missing date");
  else if (!transaction_date) errors.push(`Invalid date "${dateRaw}"`);

  const amount = parseAmount(amountRaw);
  if (!amountRaw.toString().trim()) errors.push("Missing amount");
  else if (amount === null) errors.push(`Invalid amount "${amountRaw}"`);

  if (!merchant && !description) errors.push("Missing merchant/description");

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    errors: [],
    draft: {
      merchant: merchant || null,
      description: description || null,
      amount: amount as number,
      transaction_date: transaction_date as string,
    },
  };
}

export type CsvPreviewRow = {
  index: number;
  raw: Record<string, string>;
  valid: boolean;
  errors: string[];
  draft?: TransactionDraft;
  duplicateInFile: boolean;
};

export type CsvPreview = {
  rows: CsvPreviewRow[];
  validCount: number; // valid AND not a within-file duplicate
  invalidCount: number;
  duplicateCount: number; // within-file duplicates
};

/**
 * Build a preview: validate every row and flag within-file duplicates. Existing
 * database duplicates are detected at import time (see importCsvTransactions).
 */
export function buildCsvPreview(
  rows: Record<string, string>[],
  mapping: CsvColumnMapping,
): CsvPreview {
  const seen = new Set<string>();
  const out: CsvPreviewRow[] = rows.map((raw, index) => {
    const result = validateCsvRow(raw, mapping);
    let duplicateInFile = false;
    if (result.valid && result.draft) {
      const key = generateDuplicateKey({ familyId: "_preview_", ...result.draft });
      if (seen.has(key)) duplicateInFile = true;
      else seen.add(key);
    }
    return {
      index,
      raw,
      valid: result.valid,
      errors: result.errors,
      draft: result.draft,
      duplicateInFile,
    };
  });

  return {
    rows: out,
    validCount: out.filter((r) => r.valid && !r.duplicateInFile).length,
    invalidCount: out.filter((r) => !r.valid).length,
    duplicateCount: out.filter((r) => r.duplicateInFile).length,
  };
}
