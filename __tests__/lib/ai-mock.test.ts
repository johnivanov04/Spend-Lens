import { describe, expect, it } from "vitest";
import { mockClassify } from "@/lib/ai/mock";
import type { ClassificationInput } from "@/lib/ai/schema";

function input(over: Partial<ClassificationInput> = {}): ClassificationInput {
  return {
    merchant: null,
    description: null,
    amount: 9.99,
    transaction_date: "2026-06-11",
    raw_text: null,
    children: [],
    merchantRules: [],
    ...over,
  };
}

describe("mockClassify", () => {
  it("classifies a known kid-gaming merchant with high confidence", () => {
    const r = mockClassify(input({ merchant: "ROBLOX.COM" }));
    expect(r.platform).toBe("Roblox");
    expect(r.category).toBe("Games");
    expect(r.kidRelatedLikelihood).toBe("yes");
    expect(r.confidenceScore).toBeGreaterThanOrEqual(0.9);
  });

  it("returns low confidence + needs review for unknown merchants", () => {
    const r = mockClassify(input({ merchant: "SQ *DIGITAL SERVICE" }));
    expect(r.platform).toBeNull();
    expect(r.confidenceScore).toBeLessThan(0.4);
    expect(r.needsReview).toBe(true);
  });

  it("never assigns a child", () => {
    const r = mockClassify(
      input({ merchant: "ROBLOX.COM", children: [{ id: "c1", name: "Alex" }] }),
    );
    expect(r.childAssignment.childId).toBeNull();
  });
});
