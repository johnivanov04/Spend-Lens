import type { TransactionWithClassification } from "@/lib/data/classifications";

/** Counts derived from transactions + their classifications. Pure + testable. */
export function classificationCounts(rows: TransactionWithClassification[]): {
  transactionCount: number;
  classifiedCount: number;
  needsReviewCount: number;
} {
  return {
    transactionCount: rows.length,
    classifiedCount: rows.filter((r) => r.classification).length,
    needsReviewCount: rows.filter((r) => r.classification?.needs_review).length,
  };
}

/** Simple count of classified transactions per category, highest first. */
export function summarizeCategories(
  rows: TransactionWithClassification[],
): { category: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const category = row.classification?.category;
    if (!category) continue;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}
