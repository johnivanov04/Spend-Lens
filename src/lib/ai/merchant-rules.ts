import { normalizeMerchantText } from "@/lib/transactions/transaction";
import {
  confidenceLabelFor,
  type ChildRef,
  type ClassificationResult,
  type MerchantRule,
} from "./schema";

/**
 * Find the most specific family merchant rule matching a transaction's
 * normalized merchant/description text. Pure + unit-testable.
 */
export function matchMerchantRule(
  rules: MerchantRule[],
  merchant: string | null,
  description: string | null,
): MerchantRule | null {
  const text = normalizeMerchantText(
    [merchant, description].filter(Boolean).join(" "),
  );
  if (!text) return null;

  const matches = rules.filter(
    (r) =>
      r.normalized_merchant.length > 0 &&
      (text.includes(r.normalized_merchant) ||
        r.normalized_merchant.includes(text)),
  );
  if (matches.length === 0) return null;

  // Prefer the longest (most specific) matching pattern.
  return matches.sort(
    (a, b) => b.normalized_merchant.length - a.normalized_merchant.length,
  )[0];
}

/** Build a classification result from a matched merchant rule. */
export function ruleToResult(
  rule: MerchantRule,
  children: ChildRef[],
): ClassificationResult {
  const score = 0.95;
  const kid = rule.kid_related_likelihood ?? "unclear";
  const childId =
    rule.child_id && children.some((c) => c.id === rule.child_id)
      ? rule.child_id
      : null;

  return {
    platform: rule.platform,
    merchant_family: rule.merchant_family,
    category: rule.category,
    kid_related_likelihood: kid,
    confidence_score: score,
    confidence_label: confidenceLabelFor(score),
    child_id: childId,
    explanation: "Matched a rule you saved for this merchant.",
    needs_review: kid === "unclear",
    model_provider: "merchant_rule",
    model_name: null,
    raw_model_output: null,
  };
}
