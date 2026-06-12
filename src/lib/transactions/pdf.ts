import {
  generateDuplicateKey,
  parseAmount,
  parseTransactionDate,
  type TransactionDraft,
} from "./transaction";
import type { CsvPreview, CsvPreviewRow } from "./csv";

/**
 * Pure PDF *statement-text* parsing. Works on text already extracted (with line
 * structure) from a PDF — extraction lives in pdf-extract.ts (server-only). No
 * library, no AI, no network: generic heuristics over reconstructed lines.
 *
 * Handles two common statement shapes:
 *  - credit-card rows:  "Apr 27  Apr 27  MERCHANT CITY ST  - $12.34"
 *  - bank/checking rows: "4/27  Purchase authorized on 04/25  Merchant  12.34  1,049.34"
 *    (the trailing number is a running balance and is ignored; debit/credit sign
 *    is inferred from a leading minus or deposit keywords).
 */

export type PdfStatementFormat =
  | "iso"
  | "mm/dd/yyyy"
  | "mm/dd"
  | "mmm dd"
  | "unknown";

export type PdfRowResult = {
  line: string;
  valid: boolean;
  errors: string[];
  draft?: TransactionDraft;
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

// A money token: optional leading minus, optional $, digits with .dd, optional trailing minus.
const MONEY_GLOBAL = /(-\s?)?\$?(\d[\d,]*\.\d{2})(-)?/g;
const HAS_AMOUNT = /\d[\d,]*\.\d{2}/;
// Statement metadata lines (not transactions) that may still start with a date
// and contain a number. Kept narrow so real merchants (e.g. "TOTAL WINE") survive;
// most headers are already excluded by the comma-year date check.
const METADATA =
  /\b(balance|account\s*(number|no\b|#)|routing|statement\s*period|billing\s*cycle|minimum\s*payment)\b/i;

/** Match a leading date (ISO, M/D[/YY], or "MMM DD"), not followed by a comma-year. */
function matchLeadingDate(text: string): { token: string; rest: string } | null {
  const iso = text.match(/^(\d{4}-\d{1,2}-\d{1,2})(?![\d-])/);
  if (iso) return { token: iso[1], rest: text.slice(iso[1].length).trimStart() };

  const mon = text.match(/^([A-Za-z]{3})\.?\s+(\d{1,2})(?![,\d])/);
  if (mon) {
    return {
      token: `${mon[1]} ${mon[2]}`,
      rest: text.slice(mon[0].length).trimStart(),
    };
  }

  const num = text.match(/^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)(?![,\d/])/);
  if (num) return { token: num[1], rest: text.slice(num[1].length).trimStart() };

  return null;
}

function parsePdfDate(token: string, year: number): string | null {
  const mon = token.match(/^([A-Za-z]{3})\s+(\d{1,2})$/);
  if (mon) {
    const month = MONTHS[mon[1].toLowerCase()];
    if (!month) return null;
    const mm = String(month).padStart(2, "0");
    const dd = String(Number(mon[2])).padStart(2, "0");
    return parseTransactionDate(`${year}-${mm}-${dd}`);
  }
  if (/^\d{1,2}\/\d{1,2}$/.test(token)) {
    return parseTransactionDate(`${token}/${year}`);
  }
  return parseTransactionDate(token);
}

function cleanDescription(desc: string): string {
  return desc
    .replace(/\bauthorized on \d{1,2}\/\d{1,2}\b/gi, "")
    .replace(/\bcard \d{3,}\b/gi, "")
    .replace(/\bref #\s*\w+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isDepositDescription(desc: string): boolean {
  return /\b(transfer from|zelle from|cashout|deposit|refund|reversal|interest paid|rebate)\b/i.test(
    desc,
  );
}

/** Infer the statement's year (for dates without one). */
export function inferStatementYear(
  text: string,
  fallback: number = new Date().getFullYear(),
): number {
  const match = text.match(/\b(?:19|20)\d{2}\b/);
  return match ? Number(match[0]) : fallback;
}

/** Guess the dominant date format. */
export function identifyLikelyPdfStatementFormat(
  text: string,
): PdfStatementFormat {
  const counts = { iso: 0, mdy: 0, md: 0, mmm: 0 };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^\d{4}-\d{1,2}-\d{1,2}\b/.test(line)) counts.iso += 1;
    else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(line)) counts.mdy += 1;
    else if (/^\d{1,2}\/\d{1,2}\b/.test(line)) counts.md += 1;
    else if (/^[A-Za-z]{3}\.?\s+\d{1,2}(?![,\d])/.test(line)) counts.mmm += 1;
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries[0][1] === 0) return "unknown";
  const key = entries[0][0];
  if (key === "iso") return "iso";
  if (key === "mdy") return "mm/dd/yyyy";
  if (key === "md") return "mm/dd";
  return "mmm dd";
}

/** Candidate transaction lines: start with a date, contain an amount, not metadata. */
export function detectPdfTransactionRows(lines: string[]): string[] {
  return lines
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 0 &&
        !METADATA.test(l) &&
        matchLeadingDate(l) !== null &&
        HAS_AMOUNT.test(l),
    );
}

/** Validate + parse a single candidate line into a transaction draft. */
export function validatePdfTransactionRow(
  line: string,
  year: number = new Date().getFullYear(),
): PdfRowResult {
  const trimmed = line.trim();

  const d1 = matchLeadingDate(trimmed);
  if (!d1) {
    return { line, valid: false, errors: ["No date at the start of the line"] };
  }

  // Optional second leading date (e.g. credit-card "Trans Date  Post Date").
  let rest = d1.rest;
  const d2 = matchLeadingDate(rest);
  if (d2) rest = d2.rest;

  const moneyMatches = [...rest.matchAll(MONEY_GLOBAL)];
  if (moneyMatches.length === 0) {
    return { line, valid: false, errors: ["No amount found"] };
  }

  const first = moneyMatches[0];
  const magnitude = parseAmount(first[2]);
  if (magnitude === null || first.index === undefined) {
    return { line, valid: false, errors: ["Invalid amount"] };
  }

  const isoDate = parsePdfDate(d1.token, year);
  if (!isoDate) {
    return { line, valid: false, errors: [`Invalid date "${d1.token}"`] };
  }

  const description = cleanDescription(rest.slice(0, first.index).trim());
  if (!description) {
    return { line, valid: false, errors: ["No description"] };
  }

  const negative =
    Boolean(first[1]) || Boolean(first[3]) || isDepositDescription(description);
  const amount = negative ? -Math.abs(magnitude) : Math.abs(magnitude);

  return {
    line,
    valid: true,
    errors: [],
    draft: { merchant: null, description, amount, transaction_date: isoDate },
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
