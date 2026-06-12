import {
  aiClassificationSchema,
  computeNeedsReview,
  confidenceLabelFor,
  type AiClassification,
  type ChildRef,
  type ClassificationInput,
  type ClassificationResult,
} from "./schema";
import { mockClassify } from "./mock";
import { matchMerchantRule, ruleToResult } from "./merchant-rules";
import {
  anthropicClassify,
  defaultModelFor,
  openaiClassify,
  resolveProviderName,
  type ProviderName,
} from "./providers";

/** A function that returns the raw (unvalidated) model output for an input. */
export type ProviderFn = (input: ClassificationInput) => Promise<unknown>;

const DEFAULT_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("classifier timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function buildProviderFn(
  provider: ProviderName,
  model: string | null,
  env: Record<string, string | undefined>,
): ProviderFn {
  if (provider === "anthropic") {
    return (input) =>
      anthropicClassify(input, {
        model: model ?? "claude-haiku-4-5",
        apiKey: env.ANTHROPIC_API_KEY as string,
      });
  }
  if (provider === "openai") {
    return (input) =>
      openaiClassify(input, {
        model: model ?? "gpt-4o-mini",
        apiKey: env.OPENAI_API_KEY as string,
      });
  }
  return (input) => Promise.resolve(mockClassify(input));
}

function finalize(
  data: AiClassification,
  children: ChildRef[],
  providerName: string,
  modelName: string | null,
  raw: unknown,
): ClassificationResult {
  // Child guardrail: keep an assigned child only if it matches a known child.
  let childId = data.childAssignment.childId;
  let childUncertain = false;
  if (childId && !children.some((c) => c.id === childId)) {
    childId = null;
    childUncertain = true;
  }

  const score = data.confidenceScore;
  const needs_review =
    computeNeedsReview({
      confidenceScore: score,
      kidRelatedLikelihood: data.kidRelatedLikelihood,
      childUncertain,
      invalidOrFallback: false,
    }) || data.needsReview;

  return {
    platform: data.platform,
    merchant_family: data.merchantFamily,
    category: data.category,
    kid_related_likelihood: data.kidRelatedLikelihood,
    confidence_score: score,
    confidence_label: confidenceLabelFor(score),
    child_id: childId,
    explanation: data.explanation,
    needs_review,
    model_provider: providerName,
    model_name: modelName,
    raw_model_output: raw,
  };
}

/** Safe fallback when classification errors, times out, or returns bad JSON. */
export function fallbackResult(
  modelName: string | null,
  raw: unknown,
): ClassificationResult {
  return {
    platform: null,
    merchant_family: null,
    category: null,
    kid_related_likelihood: "unclear",
    confidence_score: 0,
    confidence_label: "unclassified",
    child_id: null,
    explanation:
      "We couldn't classify this automatically. Please review it and set the details.",
    needs_review: true,
    model_provider: "fallback",
    model_name: modelName,
    raw_model_output: raw,
  };
}

/**
 * Classify a transaction. Order: matching merchant rule -> configured provider
 * (validated against the Zod schema) -> safe fallback. Never throws.
 */
export async function classifyTransaction(
  input: ClassificationInput,
  options: {
    provider?: ProviderFn;
    providerName?: ProviderName;
    modelName?: string | null;
    timeoutMs?: number;
    env?: Record<string, string | undefined>;
  } = {},
): Promise<ClassificationResult> {
  // 1. Merchant rule short-circuit (no AI call).
  const rule = matchMerchantRule(
    input.merchantRules,
    input.merchant,
    input.description,
  );
  if (rule) return ruleToResult(rule, input.children);

  // 2. Pick a provider.
  const env = options.env ?? process.env;
  const providerName = options.providerName ?? resolveProviderName(env);
  const modelName =
    options.modelName ?? env.AI_MODEL ?? defaultModelFor(providerName);
  const providerFn =
    options.provider ?? buildProviderFn(providerName, modelName, env);

  // 3. Call + validate, falling back safely on any failure.
  try {
    const raw = await withTimeout(
      providerFn(input),
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    const parsed = aiClassificationSchema.safeParse(raw);
    if (!parsed.success) return fallbackResult(modelName, raw);
    return finalize(parsed.data, input.children, providerName, modelName, raw);
  } catch {
    return fallbackResult(modelName, null);
  }
}
