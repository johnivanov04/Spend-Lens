import {
  generateDuplicateKey,
  parseAmount,
  parseTransactionDate,
  type TransactionDraft,
} from "./transaction";
import type { CsvPreview, CsvPreviewRow } from "./csv";

/**
 * Pure PDF *statement-text* parsing. These work on text already extracted from a
 * PDF (extraction itself lives in pdf-extract.ts, server-only). No library, no
 * AI, no network — generic heuristics over text lines, fully unit-testable.
 */

export type PdfStatementFormat = "iso" | "mm/dd/yyyy" | "mm/dd" | "unknown";

export type PdfRowResult = {
  line: string;
  valid: boolean;
  errors: string[];
  draft?: TransactionDraft;
};

// A transaction line starts with a date and ends with a money amount.
const DATE_START =
  /^(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}\/\d{1,2})\s+(.*)$/;
const TRAILING_AMOUNT = /(-?\$?\d[\d,]*\.\d{2}-?)\s*$/;
const HAS_AMOUNT = /-?\$?\d[\d,]*\.\d{2}-?/;
// Lines that are statement metadata, not transactions.
const METADATA =
  /\b(balance|account\s*(no\.?|number|#)|routing|page\s*\d|available|statement\s*period|beginning|ending)\b/i;

/** Infer the statement's year from the text (for MM/DD rows without a year). */
export function inferStatementYear(
  text: string,
  fallback: number = new Date().getFullYear(),
): number {
  const match = text.match(/\b(?:19|20)\d{2}\b/);
  return match ? Number(match[0]) : fallback;
}

/** Guess the dominant date format in the statement. */
export function identifyLikelyPdfStatementFormat(
  text: string,
): PdfStatementFormat {
  const counts = { iso: 0, mdy: 0, md: 0 };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^\d{4}-\d{1,2}-\d{1,2}\b/.test(line)) counts.iso += 1;
    else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(line)) counts.mdy += 1;
    else if (/^\d{1,2}\/\d{1,2}\b/.test(line)) counts.md += 1;
  }
  const max = Math.max(counts.iso, counts.mdy, counts.md);
  if (max === 0) return "unknown";
  if (counts.iso === max) return "iso";
  if (counts.mdy === max) return "mm/dd/yyyy";
  return "mm/dd";
}

/** Candidate transaction lines: start with a date, end with an amount, not metadata. */
export function detectPdfTransactionRows(lines: string[]): string[] {
  return lines
    .map((l) => l.trim())
    .filter(
      (l) =>
        DATE_START.test(l) && HAS_AMOUNT.test(l) && !METADATA.test(l),
    );
}

/** Validate + parse a single candidate line into a transaction draft. */
export function validatePdfTransactionRow(
  line: string,
  year: number = new Date().getFullYear(),
): PdfRowResult {
  const trimmed = line.trim();
  const dateMatch = trimmed.match(DATE_START);
  if (!dateMatch) {
    return { line, valid: false, errors: ["No date at the start of the line"] };
  }

  const dateToken = dateMatch[1];
  const rest = dateMatch[2];

  const amtMatch = rest.match(TRAILING_AMOUNT);
  if (!amtMatch || amtMatch.index === undefined) {
    return { line, valid: false, errors: ["No amount found"] };
  }

  let amountToken = amtMatch[1];
  let trailingNeg = false;
  if (amountToken.endsWith("-")) {
    trailingNeg = true;
    amountToken = amountToken.slice(0, -1);
  }
  let amount = parseAmount(amountToken);
  if (amount === null) {
    return { line, valid: false, errors: [`Invalid amount "${amtMatch[1]}"`] };
  }
  if (trailingNeg) amount = -Math.abs(amount);

  const isoDate = /^\d{1,2}\/\d{1,2}$/.test(dateToken)
    ? parseTransactionDate(`${dateToken}/${year}`)
    : parseTransactionDate(dateToken);
  if (!isoDate) {
    return { line, valid: false, errors: [`Invalid date "${dateToken}"`] };
  }

  const description = rest.slice(0, amtMatch.index).trim();
  if (!description) {
    return { line, valid: false, errors: ["No description"] };
  }

  return {
    line,
    valid: true,
    errors: [],
    draft: {
      merchant: null,
      description,
      amount,
      transaction_date: isoDate,
    },
  };
}

/** Parse a full statement text into validated rows. */
export function parsePdfStatementText(text: string): {
  rows: PdfRowResult[];
  year: number;
  format: PdfStatementFormat;
} {
  const year = inferStatementYear(text);
  const lines = detectPdfTransactionRows(text.split(/\r?\n/));
  return {
    rows: lines.map((line) => validatePdfTransactionRow(line, year)),
    year,
    format: identifyLikelyPdfStatementFormat(text),
  };
}

/** Convert parsed PDF rows into the shared CSV preview shape (with dedup). */
export function convertPdfRowsToTransactionPreview(
  rows: PdfRowResult[],
): CsvPreview {
  const seen = new Set<string>();
  const out: CsvPreviewRow[] = rows.map((r, index) => {
    let duplicateInFile = false;
    if (r.valid && r.draft) {
      const key = generateDuplicateKey({ familyId: "_preview_", ...r.draft });
      if (seen.has(key)) duplicateInFile = true;
      else seen.add(key);
    }
    return {
      index,
      raw: { line: r.line },
      valid: r.valid,
      errors: r.errors,
      draft: r.draft,
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
