import { describe, expect, it, vi } from "vitest";
import { classifyTransaction } from "@/lib/ai/classifier";
import type { ClassificationInput } from "@/lib/ai/schema";

function input(over: Partial<ClassificationInput> = {}): ClassificationInput {
  return {
    merchant: "Roblox",
    description: null,
    amount: 49.99,
    transaction_date: "2026-06-11",
    raw_text: null,
    children: [],
    merchantRules: [],
    ...over,
  };
}

const validOutput = {
  platform: "Roblox",
  merchantFamily: "Roblox",
  category: "Games",
  kidRelatedLikelihood: "yes",
  confidenceScore: 0.95,
  childAssignment: { childId: null, childName: null, reason: null },
  explanation: "Likely a Roblox games charge.",
  needsReview: false,
};

describe("classifyTransaction", () => {
  it("validates a good provider response and derives label + needs_review", async () => {
    const result = await classifyTransaction(input(), {
      provider: () => Promise.resolve(validOutput),
      providerName: "anthropic",
    });
    expect(result.platform).toBe("Roblox");
    expect(result.confidence_label).toBe("high");
    expect(result.needs_review).toBe(false);
    expect(result.model_provider).toBe("anthropic");
  });

  it("falls back safely when the provider returns invalid JSON", async () => {
    const result = await classifyTransaction(input(), {
      provider: () => Promise.resolve({ nonsense: true }),
    });
    expect(result.model_provider).toBe("fallback");
    expect(result.needs_review).toBe(true);
    expect(result.confidence_label).toBe("unclassified");
    expect(result.platform).toBeNull();
  });

  it("falls back when the provider throws", async () => {
    const result = await classifyTransaction(input(), {
      provider: () => Promise.reject(new Error("boom")),
    });
    expect(result.model_provider).toBe("fallback");
    expect(result.needs_review).toBe(true);
  });

  it("falls back when the provider times out", async () => {
    const result = await classifyTransaction(input(), {
      provider: () => new Promise(() => {}), // never resolves
      timeoutMs: 10,
    });
    expect(result.model_provider).toBe("fallback");
  });

  it("strips an unknown child and flags review (child guardrail)", async () => {
    const result = await classifyTransaction(
      input({ children: [{ id: "c1", name: "Alex" }] }),
      {
        provider: () =>
          Promise.resolve({
            ...validOutput,
            childAssignment: {
              childId: "not-a-real-child",
              childName: "Ghost",
              reason: "guess",
            },
          }),
      },
    );
    expect(result.child_id).toBeNull();
    expect(result.needs_review).toBe(true);
  });

  it("keeps a valid assigned child", async () => {
    const result = await classifyTransaction(
      input({ children: [{ id: "c1", name: "Alex" }] }),
      {
        provider: () =>
          Promise.resolve({
            ...validOutput,
            childAssignment: { childId: "c1", childName: "Alex", reason: "named on receipt" },
          }),
      },
    );
    expect(result.child_id).toBe("c1");
  });

  it("uses a matching merchant rule without calling the provider", async () => {
    const provider = vi.fn();
    const result = await classifyTransaction(
      input({
        merchant: "ROBLOX.COM",
        merchantRules: [
          {
            normalized_merchant: "roblox",
            platform: "Roblox",
            merchant_family: "Roblox",
            category: "Games",
            child_id: null,
            kid_related_likelihood: "yes",
          },
        ],
      }),
      { provider },
    );
    expect(result.model_provider).toBe("merchant_rule");
    expect(result.platform).toBe("Roblox");
    expect(provider).not.toHaveBeenCalled();
  });
});
