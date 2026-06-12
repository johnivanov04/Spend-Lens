import type { SupabaseClient } from "@supabase/supabase-js";
import type { TransactionRow } from "@/lib/data/transactions";
import type {
  ClassificationResult,
  KidRelatedLikelihood,
  MerchantRule,
} from "@/lib/ai/schema";

export type ClassificationRow = {
  id: string;
  transaction_id: string;
  family_id: string;
  platform: string | null;
  merchant_family: string | null;
  category: string | null;
  kid_related_likelihood: KidRelatedLikelihood;
  confidence_score: number;
  confidence_label: string;
  child_id: string | null;
  explanation: string;
  needs_review: boolean;
  model_provider: string | null;
  model_name: string | null;
  raw_model_output: unknown;
  created_at: string;
  updated_at: string;
};

export type TransactionWithClassification = TransactionRow & {
  classification: ClassificationRow | null;
};

/** Fetch one transaction owned by the family (RLS-scoped), or null. */
export async function getTransactionForFamily(
  supabase: SupabaseClient,
  familyId: string,
  transactionId: string,
): Promise<TransactionRow | null> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("family_id", familyId)
    .eq("id", transactionId)
    .maybeSingle();
  if (error) throw error;
  return (data as TransactionRow | null) ?? null;
}

/** Fetch the family's transactions for the given ids. */
export async function getTransactionsByIds(
  supabase: SupabaseClient,
  familyId: string,
  ids: string[],
): Promise<TransactionRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("family_id", familyId)
    .in("id", ids);
  if (error) throw error;
  return (data as TransactionRow[]) ?? [];
}

/** Upsert the current classification for a transaction. */
export async function saveClassification(
  supabase: SupabaseClient,
  args: { transaction_id: string; family_id: string; result: ClassificationResult },
): Promise<ClassificationRow> {
  const r = args.result;
  const { data, error } = await supabase
    .from("transaction_classifications")
    .upsert(
      {
        transaction_id: args.transaction_id,
        family_id: args.family_id,
        platform: r.platform,
        merchant_family: r.merchant_family,
        category: r.category,
        kid_related_likelihood: r.kid_related_likelihood,
        confidence_score: r.confidence_score,
        confidence_label: r.confidence_label,
        child_id: r.child_id,
        explanation: r.explanation,
        needs_review: r.needs_review,
        model_provider: r.model_provider,
        model_name: r.model_name,
        raw_model_output: r.raw_model_output ?? null,
      },
      { onConflict: "transaction_id" },
    )
    .select()
    .single();
  if (error) throw error;
  return data as ClassificationRow;
}

/** List the family's merchant rules (used to short-circuit the AI). */
export async function listMerchantRules(
  supabase: SupabaseClient,
  familyId: string,
): Promise<MerchantRule[]> {
  const { data, error } = await supabase
    .from("merchant_rules")
    .select("*")
    .eq("family_id", familyId);
  if (error) throw error;
  return (data as MerchantRule[]) ?? [];
}

/** Create or update a family merchant rule (keyed on normalized_merchant). */
export async function upsertMerchantRule(
  supabase: SupabaseClient,
  familyId: string,
  rule: {
    normalized_merchant: string;
    platform: string | null;
    merchant_family: string | null;
    category: string | null;
    child_id: string | null;
    kid_related_likelihood: KidRelatedLikelihood | null;
  },
): Promise<MerchantRule> {
  const { data, error } = await supabase
    .from("merchant_rules")
    .upsert(
      { family_id: familyId, ...rule },
      { onConflict: "family_id,normalized_merchant" },
    )
    .select()
    .single();
  if (error) throw error;
  return data as MerchantRule;
}

type EmbeddedRow = TransactionRow & {
  transaction_classifications: ClassificationRow | ClassificationRow[] | null;
};

/** List the family's transactions with their classification embedded. */
export async function listTransactionsWithClassification(
  supabase: SupabaseClient,
  familyId: string,
  { limit }: { limit?: number } = {},
): Promise<TransactionWithClassification[]> {
  let query = supabase
    .from("transactions")
    .select("*, transaction_classifications(*)")
    .eq("family_id", familyId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;

  return ((data as EmbeddedRow[] | null) ?? []).map((row) => {
    const { transaction_classifications, ...txn } = row;
    const classification = Array.isArray(transaction_classifications)
      ? (transaction_classifications[0] ?? null)
      : (transaction_classifications ?? null);
    return { ...(txn as TransactionRow), classification };
  });
}

/** Transactions with no classification yet (for batch classify). */
export async function listUnclassifiedTransactions(
  supabase: SupabaseClient,
  familyId: string,
  limit: number,
): Promise<TransactionRow[]> {
  const all = await listTransactionsWithClassification(supabase, familyId);
  return all
    .filter((t) => !t.classification)
    .slice(0, limit)
    .map(({ classification: _classification, ...txn }) => txn as TransactionRow);
}

/** Counts for the dashboard. */
export async function classificationStats(
  supabase: SupabaseClient,
  familyId: string,
): Promise<{ classified: number; needsReview: number }> {
  const classifiedQuery = await supabase
    .from("transaction_classifications")
    .select("*", { count: "exact", head: true })
    .eq("family_id", familyId);
  if (classifiedQuery.error) throw classifiedQuery.error;

  const needsReviewQuery = await supabase
    .from("transaction_classifications")
    .select("*", { count: "exact", head: true })
    .eq("family_id", familyId)
    .eq("needs_review", true);
  if (needsReviewQuery.error) throw needsReviewQuery.error;

  return {
    classified: classifiedQuery.count ?? 0,
    needsReview: needsReviewQuery.count ?? 0,
  };
}

/** Save a parent correction as the authoritative classification (overrides AI). */
export async function saveCorrection(
  supabase: SupabaseClient,
  args: {
    transaction_id: string;
    family_id: string;
    platform: string | null;
    category: string | null;
    kid_related_likelihood: KidRelatedLikelihood;
    child_id: string | null;
  },
): Promise<ClassificationRow> {
  const result: ClassificationResult = {
    platform: args.platform,
    merchant_family: null,
    category: args.category,
    kid_related_likelihood: args.kid_related_likelihood,
    confidence_score: 1,
    confidence_label: "high",
    child_id: args.child_id,
    explanation: "Set by you.",
    needs_review: false,
    model_provider: "parent_correction",
    model_name: null,
    raw_model_output: null,
  };
  return saveClassification(supabase, {
    transaction_id: args.transaction_id,
    family_id: args.family_id,
    result,
  });
}
