import { describe, expect, it } from "vitest";
import { classifyBatch } from "@/lib/ai/batch";

describe("classifyBatch", () => {
  it("continues after a failure and summarizes counts", async () => {
    const summary = await classifyBatch([1, 2, 3], async (n) => {
      if (n === 2) throw new Error("fail");
      return { needs_review: n === 3 };
    });
    expect(summary).toEqual({
      classified_count: 2,
      needs_review_count: 1,
      failed_count: 1,
    });
  });

  it("handles an empty list", async () => {
    const summary = await classifyBatch([], async () => ({ needs_review: false }));
    expect(summary).toEqual({
      classified_count: 0,
      needs_review_count: 0,
      failed_count: 0,
    });
  });
});
