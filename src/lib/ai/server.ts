import type { SupabaseClient } from "@supabase/supabase-js";
import { listChildren, type Family } from "@/lib/data/family";
import {
  listMerchantRules,
  saveClassification,
  type ClassificationRow,
} from "@/lib/data/classifications";
import type { TransactionRow } from "@/lib/data/transactions";
import { classifyTransaction } from "@/lib/ai/classifier";

/**
 * Server-only: load a transaction's context (children + merchant rules), run the
 * configured classifier (mock by default; real provider keys are read here,
 * never in the browser), and persist the result.
 */
export async function classifyAndSaveTransaction(
  supabase: SupabaseClient,
  family: Family,
  transaction: TransactionRow,
): Promise<ClassificationRow> {
  const [children, merchantRules] = await Promise.all([
    listChildren(supabase, family.id),
    listMerchantRules(supabase, family.id),
  ]);

  const result = await classifyTransaction({
    merchant: transaction.merchant,
    description: transaction.description,
    amount: transaction.amount,
    transaction_date: transaction.transaction_date,
    raw_text: transaction.raw_text,
    children: children.map((c) => ({ id: c.id, name: c.name })),
    merchantRules,
  });

  return saveClassification(supabase, {
    transaction_id: transaction.id,
    family_id: family.id,
    result,
  });
}
