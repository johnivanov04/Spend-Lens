import { createClient } from "@/lib/supabase/client";
import {
  saveCorrection,
  upsertMerchantRule,
  type ClassificationRow,
} from "@/lib/data/classifications";
import { normalizeMerchantText } from "@/lib/transactions/transaction";
import type { KidRelatedLikelihood, MerchantRule } from "@/lib/ai/schema";

/**
 * Browser bindings for parent corrections. Corrections don't call the AI, so
 * they use the RLS-guarded browser client directly (same pattern as Phase 2/3).
 */

export function saveCorrectionClient(args: {
  transaction_id: string;
  family_id: string;
  platform: string | null;
  category: string | null;
  kid_related_likelihood: KidRelatedLikelihood;
  child_id: string | null;
}): Promise<ClassificationRow> {
  return saveCorrection(createClient(), args);
}

export function createMerchantRuleClient(
  familyId: string,
  input: {
    merchant: string | null;
    description: string | null;
    platform: string | null;
    category: string | null;
    kid_related_likelihood: KidRelatedLikelihood;
    child_id: string | null;
  },
): Promise<MerchantRule> {
  const normalized = normalizeMerchantText(
    [input.merchant, input.description].filter(Boolean).join(" "),
  );
  return upsertMerchantRule(createClient(), familyId, {
    normalized_merchant: normalized,
    platform: input.platform,
    merchant_family: null,
    category: input.category,
    child_id: input.child_id,
    kid_related_likelihood: input.kid_related_likelihood,
  });
}
