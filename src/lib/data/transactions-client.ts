import { createClient } from "@/lib/supabase/client";
import {
  createManualTransaction,
  createReceiptTransaction,
  importCsvTransactions,
  importPdfTransactions,
  type CsvImportSummary,
  type ImportParams,
  type TransactionRow,
} from "@/lib/data/transactions";
import type { TransactionDraft } from "@/lib/transactions/transaction";

/**
 * Browser-client bindings for the transaction data layer. Client components
 * import these so they never construct the Supabase client themselves, which
 * also makes them easy to mock in component tests.
 */

export function createManualTransactionClient(
  familyId: string,
  draft: TransactionDraft,
): Promise<TransactionRow> {
  return createManualTransaction(createClient(), familyId, draft);
}

export function createReceiptTransactionClient(
  familyId: string,
  draft: TransactionDraft,
): Promise<TransactionRow> {
  return createReceiptTransaction(createClient(), familyId, draft);
}

export function importCsvTransactionsClient(
  familyId: string,
  params: ImportParams,
): Promise<CsvImportSummary> {
  return importCsvTransactions(createClient(), familyId, params);
}

export function importPdfTransactionsClient(
  familyId: string,
  params: ImportParams,
): Promise<CsvImportSummary> {
  return importPdfTransactions(createClient(), familyId, params);
}
