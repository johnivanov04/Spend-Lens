import { normalizeMerchantText } from "@/lib/transactions/transaction";
import type { AiClassification, ClassificationInput, KidRelatedLikelihood } from "./schema";

type MockRule = {
  match: string[];
  platform: string;
  merchantFamily: string;
  category: string;
  kid: KidRelatedLikelihood;
};

// Common digital merchants → deterministic classification. Ordered most-specific first.
const KNOWN: MockRule[] = [
  { match: ["roblox", "robux"], platform: "Roblox", merchantFamily: "Roblox", category: "Games", kid: "yes" },
  { match: ["fortnite", "epic games", "epicgames"], platform: "Epic Games", merchantFamily: "Epic Games", category: "Games", kid: "yes" },
  { match: ["xbox"], platform: "Xbox", merchantFamily: "Microsoft", category: "Games", kid: "yes" },
  { match: ["playstation", "psn"], platform: "PlayStation", merchantFamily: "Sony", category: "Games", kid: "yes" },
  { match: ["nintendo"], platform: "Nintendo", merchantFamily: "Nintendo", category: "Games", kid: "yes" },
  { match: ["steamgames", "steam"], platform: "Steam", merchantFamily: "Valve", category: "Games", kid: "unclear" },
  { match: ["apple com bill", "apple com", "itunes", "apple"], platform: "Apple", merchantFamily: "Apple", category: "App store", kid: "unclear" },
  { match: ["google play", "google"], platform: "Google Play", merchantFamily: "Google", category: "App store", kid: "unclear" },
  { match: ["discord"], platform: "Discord", merchantFamily: "Discord", category: "Subscription", kid: "unclear" },
  { match: ["youtube"], platform: "YouTube", merchantFamily: "Google", category: "Subscription", kid: "unclear" },
  { match: ["spotify"], platform: "Spotify", merchantFamily: "Spotify", category: "Subscription", kid: "unclear" },
  { match: ["netflix"], platform: "Netflix", merchantFamily: "Netflix", category: "Subscription", kid: "no" },
  { match: ["amazon"], platform: "Amazon", merchantFamily: "Amazon", category: "Unknown digital purchase", kid: "unclear" },
];

/**
 * Deterministic mock classifier — no network, no AI key needed. Good enough to
 * classify common gaming/app-store charges usefully so the app works in mock mode.
 * Never assigns a child (no evidence parsing).
 */
export function mockClassify(input: ClassificationInput): AiClassification {
  const text = normalizeMerchantText(
    [input.merchant, input.description, input.raw_text].filter(Boolean).join(" "),
  );

  const hit = text ? KNOWN.find((r) => r.match.some((m) => text.includes(m))) : undefined;

  if (hit) {
    return {
      platform: hit.platform,
      merchantFamily: hit.merchantFamily,
      category: hit.category,
      kidRelatedLikelihood: hit.kid,
      confidenceScore: 0.92,
      childAssignment: { childId: null, childName: null, reason: null },
      explanation: `Likely a ${hit.platform} ${hit.category.toLowerCase()} charge.`,
      needsReview: hit.kid === "unclear",
    };
  }

  return {
    platform: null,
    merchantFamily: null,
    category: null,
    kidRelatedLikelihood: "unclear",
    confidenceScore: 0.3,
    childAssignment: { childId: null, childName: null, reason: null },
    explanation:
      "We couldn't confidently match this merchant. Please review and correct if needed.",
    needsReview: true,
  };
}
