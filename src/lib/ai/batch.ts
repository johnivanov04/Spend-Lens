export type BatchSummary = {
  classified_count: number;
  needs_review_count: number;
  failed_count: number;
};

/**
 * Classify a list of items one by one. A single failure never aborts the batch;
 * it's counted in failed_count and the rest continue.
 */
export async function classifyBatch<T>(
  items: T[],
  classifyOne: (item: T) => Promise<{ needs_review: boolean }>,
): Promise<BatchSummary> {
  let classified = 0;
  let needsReview = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const result = await classifyOne(item);
      classified += 1;
      if (result.needs_review) needsReview += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    classified_count: classified,
    needs_review_count: needsReview,
    failed_count: failed,
  };
}
