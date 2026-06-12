import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateDuplicateKey,
  type SourceType,
  type TransactionDraft,
} from "@/lib/transactions/transaction";

/**
 * Data-access layer for transactions + CSV imports. Functions take a Supabase
 * client (browser or server) so they're unit-testable with a mock. RLS scopes
 * every read/write to the authenticated user's own family. No AI here — Phase 3
 * only ingests and stores; classification is Phase 4.
 */

export type TransactionRow = {
  id: string;
  family_id: string;
  source_type: SourceType;
  merchant: string | null;
  description: string | null;
  amount: number;
  currency: string;
  transaction_date: string;
  raw_text: string | null;
  source_file_name: string | null;
  duplicate_key: string | null;
  created_at: string;
  updated_at: string;
};

export type CsvImportRow = {
  id: string;
  family_id: string;
  file_name: string | null;
  row_count: number | null;
  created_count: number | null;
  skipped_count: number | null;
  failed_count: number | null;
  status: string | null;
  created_at: string;
};

export type CsvImportSummary = {
  importId: string;
  rowCount: number;
  created: number;
  skipped: number;
  failed: number;
};

function draftToRow(
  familyId: string,
  draft: TransactionDraft,
  sourceType: SourceType,
  extra: Record<string, unknown> = {},
) {
  return {
    family_id: familyId,
    source_type: sourceType,
    merchant: draft.merchant ?? null,
    description: draft.description ?? null,
    amount: draft.amount,
    transaction_date: draft.transaction_date,
    raw_text: draft.raw_text ?? null,
    duplicate_key: generateDuplicateKey({
      familyId,
      transaction_date: draft.transaction_date,
      amount: draft.amount,
      merchant: draft.merchant,
      description: draft.description,
    }),
    ...extra,
  };
}

/** Insert a manually-entered transaction. */
export async function createManualTransaction(
  supabase: SupabaseClient,
  familyId: string,
  draft: TransactionDraft,
): Promise<TransactionRow> {
  const { data, error } = await supabase
    .from("transactions")
    .insert(draftToRow(familyId, draft, "manual"))
    .select()
    .single();
  if (error) throw error;
  return data as TransactionRow;
}

/** Insert a transaction extracted from pasted receipt text. */
export async function createReceiptTransaction(
  supabase: SupabaseClient,
  familyId: string,
  draft: TransactionDraft,
): Promise<TransactionRow> {
  const { data, error } = await supabase
    .from("transactions")
    .insert(draftToRow(familyId, draft, "receipt_paste"))
    .select()
    .single();
  if (error) throw error;
  return data as TransactionRow;
}

/** List a family's transactions, newest first. */
export async function listTransactionsForFamily(
  supabase: SupabaseClient,
  familyId: string,
  { limit }: { limit?: number } = {},
): Promise<TransactionRow[]> {
  let query = supabase
    .from("transactions")
    .select("*")
    .eq("family_id", familyId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data as TransactionRow[]) ?? [];
}

/** Count a family's transactions. */
export async function countTransactionsForFamily(
  supabase: SupabaseClient,
  familyId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("family_id", familyId);
  if (error) throw error;
  return count ?? 0;
}

/** Existing duplicate keys for a family (used to skip dupes on import). */
export async function getExistingDuplicateKeys(
  supabase: SupabaseClient,
  familyId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("transactions")
    .select("duplicate_key")
    .eq("family_id", familyId);
  if (error) throw error;
  return new Set(
    (data ?? [])
      .map((r: { duplicate_key: string | null }) => r.duplicate_key)
      .filter((k: string | null): k is string => Boolean(k)),
  );
}

/** Record a CSV upload session. */
export async function createCsvImport(
  supabase: SupabaseClient,
  familyId: string,
  summary: {
    fileName: string | null;
    rowCount: number;
    createdCount: number;
    skippedCount: number;
    failedCount: number;
    status: string;
  },
): Promise<CsvImportRow> {
  const { data, error } = await supabase
    .from("csv_imports")
    .insert({
      family_id: familyId,
      file_name: summary.fileName,
      row_count: summary.rowCount,
      created_count: summary.createdCount,
      skipped_count: summary.skippedCount,
      failed_count: summary.failedCount,
      status: summary.status,
    })
    .select()
    .single();
  if (error) throw error;
  return data as CsvImportRow;
}

export type ImportParams = {
  fileName: string | null;
  rowCount: number;
  drafts: TransactionDraft[];
  failedCount: number;
};

/**
 * Import validated rows from a file upload (CSV or PDF): skip rows whose
 * duplicate_key already exists in the family or repeats within the batch, insert
 * the rest with the given source type, and record an import summary row.
 */
export async function importTransactions(
  supabase: SupabaseClient,
  familyId: string,
  params: ImportParams & { sourceType: SourceType },
): Promise<CsvImportSummary> {
  const existing = await getExistingDuplicateKeys(supabase, familyId);
  const seen = new Set<string>();
  const toInsert: ReturnType<typeof draftToRow>[] = [];
  let skipped = 0;

  for (const draft of params.drafts) {
    const key = generateDuplicateKey({
      familyId,
      transaction_date: draft.transaction_date,
      amount: draft.amount,
      merchant: draft.merchant,
      description: draft.description,
    });
    if (existing.has(key) || seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    toInsert.push(
      draftToRow(familyId, draft, params.sourceType, {
        source_file_name: params.fileName,
      }),
    );
  }

  let created = 0;
  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from("transactions")
      .insert(toInsert)
      .select("id");
    if (error) throw error;
    created = data?.length ?? toInsert.length;
  }

  const importRow = await createCsvImport(supabase, familyId, {
    fileName: params.fileName,
    rowCount: params.rowCount,
    createdCount: created,
    skippedCount: skipped,
    failedCount: params.failedCount,
    status: "imported",
  });

  return {
    importId: importRow.id,
    rowCount: params.rowCount,
    created,
    skipped,
    failed: params.failedCount,
  };
}

/** Import rows parsed from a CSV upload. */
export function importCsvTransactions(
  supabase: SupabaseClient,
  familyId: string,
  params: ImportParams,
): Promise<CsvImportSummary> {
  return importTransactions(supabase, familyId, {
    sourceType: "csv_upload",
    ...params,
  });
}

/** Import rows parsed from a PDF statement upload. */
export function importPdfTransactions(
  supabase: SupabaseClient,
  familyId: string,
  params: ImportParams,
): Promise<CsvImportSummary> {
  return importTransactions(supabase, familyId, {
    sourceType: "pdf_upload",
    ...params,
  });
}
