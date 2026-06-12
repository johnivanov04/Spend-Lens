import { describe, expect, it } from "vitest";
import {
  aiClassificationSchema,
  computeNeedsReview,
  confidenceLabelFor,
  confidenceLabelText,
} from "@/lib/ai/schema";

const valid = {
  platform: "Roblox",
  merchantFamily: "Roblox",
  category: "Games",
  kidRelatedLikelihood: "yes" as const,
  confidenceScore: 0.95,
  childAssignment: { childId: null, childName: null, reason: null },
  explanation: "Likely a Roblox games charge.",
  needsReview: false,
};

describe("aiClassificationSchema", () => {
  it("accepts a well-formed object", () => {
    expect(aiClassificationSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a bad enum, out-of-range score, or missing fields", () => {
    expect(
      aiClassificationSchema.safeParse({ ...valid, kidRelatedLikelihood: "maybe" })
        .success,
    ).toBe(false);
    expect(
      aiClassificationSchema.safeParse({ ...valid, confidenceScore: 1.5 }).success,
    ).toBe(false);
    expect(aiClassificationSchema.safeParse({ platform: "x" }).success).toBe(false);
  });
});

describe("confidenceLabelFor", () => {
  it("maps scores to labels at the band boundaries", () => {
    expect(confidenceLabelFor(0.95)).toBe("high");
    expect(confidenceLabelFor(0.9)).toBe("high");
    expect(confidenceLabelFor(0.89)).toBe("medium");
    expect(confidenceLabelFor(0.7)).toBe("medium");
    expect(confidenceLabelFor(0.69)).toBe("low");
    expect(confidenceLabelFor(0.4)).toBe("low");
    expect(confidenceLabelFor(0.39)).toBe("unclassified");
    expect(confidenceLabelFor(0)).toBe("unclassified");
  });
});

describe("computeNeedsReview", () => {
  const base = {
    confidenceScore: 0.95,
    kidRelatedLikelihood: "yes" as const,
    childUncertain: false,
    invalidOrFallback: false,
  };
  it("is false only when confident, clear, and certain", () => {
    expect(computeNeedsReview(base)).toBe(false);
  });
  it("is true on low confidence, unclear, uncertain child, or fallback", () => {
    expect(computeNeedsReview({ ...base, confidenceScore: 0.5 })).toBe(true);
    expect(
      computeNeedsReview({ ...base, kidRelatedLikelihood: "unclear" }),
    ).toBe(true);
    expect(computeNeedsReview({ ...base, childUncertain: true })).toBe(true);
    expect(computeNeedsReview({ ...base, invalidOrFallback: true })).toBe(true);
  });
});

describe("confidenceLabelText", () => {
  it("returns readable text", () => {
    expect(confidenceLabelText("high")).toBe("High confidence");
    expect(confidenceLabelText("unclassified")).toBe("Unclassified");
  });
});
