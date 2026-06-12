import { z } from "zod";

/**
 * AI classification contract. The model must return exactly this shape (camelCase
 * JSON). We validate it with Zod and fall back safely on any mismatch.
 */

export type KidRelatedLikelihood = "yes" | "no" | "unclear";
export type ConfidenceLabel = "high" | "medium" | "low" | "unclassified";

export const aiClassificationSchema = z.object({
  platform: z.string().nullable(),
  merchantFamily: z.string().nullable(),
  category: z.string().nullable(),
  kidRelatedLikelihood: z.enum(["yes", "no", "unclear"]),
  confidenceScore: z.number().min(0).max(1),
  childAssignment: z.object({
    childId: z.string().nullable(),
    childName: z.string().nullable(),
    reason: z.string().nullable(),
  }),
  explanation: z.string().min(1),
  needsReview: z.boolean(),
});

export type AiClassification = z.infer<typeof aiClassificationSchema>;

/** A known child the model is allowed to reference (nickname only). */
export type ChildRef = { id: string; name: string };

/** A parent-specific merchant rule used to short-circuit the AI. */
export type MerchantRule = {
  id?: string;
  normalized_merchant: string;
  platform: string | null;
  merchant_family: string | null;
  category: string | null;
  child_id: string | null;
  kid_related_likelihood: KidRelatedLikelihood | null;
};

/** Everything the classifier needs about one transaction. */
export type ClassificationInput = {
  merchant: string | null;
  description: string | null;
  amount: number;
  transaction_date: string;
  raw_text?: string | null;
  children: ChildRef[];
  merchantRules: MerchantRule[];
};

/** The persisted classification (snake_case to match the DB columns). */
export type ClassificationResult = {
  platform: string | null;
  merchant_family: string | null;
  category: string | null;
  kid_related_likelihood: KidRelatedLikelihood;
  confidence_score: number;
  confidence_label: ConfidenceLabel;
  child_id: string | null;
  explanation: string;
  needs_review: boolean;
  model_provider: string;
  model_name: string | null;
  raw_model_output: unknown;
};

/** Map a 0..1 confidence score to a label. */
export function confidenceLabelFor(score: number): ConfidenceLabel {
  if (score >= 0.9) return "high";
  if (score >= 0.7) return "medium";
  if (score >= 0.4) return "low";
  return "unclassified";
}

/** Whether a classification should be flagged for parent review. */
export function computeNeedsReview(args: {
  confidenceScore: number;
  kidRelatedLikelihood: KidRelatedLikelihood;
  childUncertain: boolean;
  invalidOrFallback: boolean;
}): boolean {
  return (
    args.invalidOrFallback ||
    args.confidenceScore < 0.7 ||
    args.kidRelatedLikelihood === "unclear" ||
    args.childUncertain
  );
}

/** Human-friendly label text for the UI. */
export function confidenceLabelText(label: ConfidenceLabel): string {
  switch (label) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "low":
      return "Low confidence";
    default:
      return "Unclassified";
  }
}
