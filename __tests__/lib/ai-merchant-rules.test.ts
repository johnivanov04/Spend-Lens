import { describe, expect, it } from "vitest";
import { matchMerchantRule, ruleToResult } from "@/lib/ai/merchant-rules";
import type { MerchantRule } from "@/lib/ai/schema";

function rule(over: Partial<MerchantRule> = {}): MerchantRule {
  return {
    normalized_merchant: "roblox",
    platform: "Roblox",
    merchant_family: "Roblox",
    category: "Games",
    child_id: null,
    kid_related_likelihood: "yes",
    ...over,
  };
}

describe("matchMerchantRule", () => {
  it("matches a normalized merchant within the transaction text", () => {
    expect(matchMerchantRule([rule()], "ROBLOX.COM", null)?.platform).toBe(
      "Roblox",
    );
  });

  it("returns null when nothing matches", () => {
    expect(matchMerchantRule([rule()], "STEAMGAMES.COM", null)).toBeNull();
    expect(matchMerchantRule([], "ROBLOX.COM", null)).toBeNull();
  });

  it("prefers the most specific (longest) matching rule", () => {
    const rules = [
      rule({ normalized_merchant: "roblox", category: "Games" }),
      rule({ normalized_merchant: "roblox premium", category: "Subscription" }),
    ];
    expect(
      matchMerchantRule(rules, "Roblox Premium Monthly", null)?.category,
    ).toBe("Subscription");
  });
});

describe("ruleToResult", () => {
  it("builds a rule-based classification", () => {
    const result = ruleToResult(rule(), []);
    expect(result.model_provider).toBe("merchant_rule");
    expect(result.confidence_label).toBe("high");
    expect(result.needs_review).toBe(false);
  });

  it("flags review when the rule's kid status is unclear", () => {
    expect(ruleToResult(rule({ kid_related_likelihood: "unclear" }), []).needs_review).toBe(
      true,
    );
  });

  it("drops an assigned child that isn't in the family", () => {
    const result = ruleToResult(rule({ child_id: "c1" }), []);
    expect(result.child_id).toBeNull();
  });
});
