import type { ClassificationInput } from "./schema";

export const SYSTEM_PROMPT = `You classify parent-submitted transaction and receipt data for Spend Lens, a tool that helps parents understand confusing kid-related digital charges (e.g. Apple, Google Play, Roblox, Steam, Xbox, PlayStation, Nintendo, subscriptions).

Be cautious, transparent, and avoid overclaiming. Your job is to explain a charge in plain English, not to make financial, legal, or fraud judgments.

Rules:
- Return ONLY valid JSON matching the requested schema. No prose, no markdown.
- Use "likely"/"possible" language. Only use high confidence when the merchant is unambiguous.
- Set kidRelatedLikelihood to "yes", "no", or "unclear". Use "unclear" when you are not sure.
- Do NOT guess a child. Only set childAssignment.childId when the transaction text, description, or receipt clearly indicates a specific listed child. Otherwise childId and childName must be null.
- Set needsReview to true whenever confidence is below 0.70, the kid-related status is unclear, or a child cannot be confidently assigned.
- Do not invent platforms, product names, child names, or account details.
- Never claim a charge is fraudulent or give refund/legal/financial advice.
- If the merchant is unknown, set platform/category to null, confidence low, and explain what information is missing.`;

const SCHEMA_HINT = `Return JSON with exactly these keys:
{
  "platform": string | null,
  "merchantFamily": string | null,
  "category": string | null,
  "kidRelatedLikelihood": "yes" | "no" | "unclear",
  "confidenceScore": number (0 to 1),
  "childAssignment": { "childId": string | null, "childName": string | null, "reason": string | null },
  "explanation": string,
  "needsReview": boolean
}`;

/** Build the user prompt with only the context the model needs. */
export function buildUserPrompt(input: ClassificationInput): string {
  const children =
    input.children.length > 0
      ? input.children.map((c) => `- ${c.name} (id: ${c.id})`).join("\n")
      : "(none provided)";

  const rules =
    input.merchantRules.length > 0
      ? input.merchantRules
          .map(
            (r) =>
              `- "${r.normalized_merchant}" -> platform: ${r.platform ?? "?"}, category: ${r.category ?? "?"}, kidRelated: ${r.kid_related_likelihood ?? "?"}`,
          )
          .join("\n")
      : "(none)";

  return `Classify this transaction.

Known children (nicknames only — assign one only with clear evidence):
${children}

Family merchant rules (hints from past corrections):
${rules}

Transaction:
- Merchant: ${input.merchant ?? ""}
- Description: ${input.description ?? ""}
- Amount: ${input.amount}
- Date: ${input.transaction_date}
- Raw text / receipt: ${input.raw_text ?? ""}

${SCHEMA_HINT}

Return JSON only.`;
}
