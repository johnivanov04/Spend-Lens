import type { TransactionWithClassification } from "@/lib/data/classifications";
import type { ChildRef, KidRelatedLikelihood } from "@/lib/ai/schema";
import type { SourceType } from "@/lib/transactions/transaction";

/**
 * Pure, framework-free analytics over transactions + their classifications.
 * No Supabase, no network — everything operates on arrays so it's fully
 * unit-testable. The dashboard page and the /api/dashboard/summary route both
 * fetch the family's rows once and run these.
 */

export type DateRangeKey = "7d" | "30d" | "90d" | "all";

export type SpendGroup = { key: string; amount: number; count: number };
export type ChildSpendGroup = {
  childId: string;
  childName: string;
  amount: number;
  count: number;
};

export type TransactionFilters = {
  search?: string;
  category?: string | null;
  platform?: string | null;
  childId?: string | null;
  confidenceLabel?: string | null;
  kidRelated?: KidRelatedLikelihood | null;
  needsReview?: boolean | null;
  sourceType?: SourceType | null;
  status?: "classified" | "unclassified" | "needs_review" | "parent_verified" | null;
};

export type SortKey = "date" | "amount" | "confidence" | "created_at";
export type SortDir = "asc" | "desc";

export type DashboardSummary = {
  totalTransactions: number;
  classifiedCount: number;
  needsReviewCount: number;
  likelyKidSpend: number;
  unclearKidSpend: number;
  byCategory: SpendGroup[];
  byPlatform: SpendGroup[];
  byChild: ChildSpendGroup[];
  byKidLikelihood: { yes: number; no: number; unclear: number };
  recentNeedsReview: TransactionWithClassification[];
  recentClassified: TransactionWithClassification[];
};

// --- Date range -----------------------------------------------------------

/** Inclusive start date (YYYY-MM-DD) for a range key, or null for "all". */
export function dateRangeStart(
  key: DateRangeKey,
  now: Date = new Date(),
): string | null {
  if (key === "all") return null;
  const days = key === "7d" ? 7 : key === "30d" ? 30 : 90;
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start.toISOString().slice(0, 10);
}

/** Filter rows to those whose transaction_date is on/after the range start. */
export function filterByDateRange(
  rows: TransactionWithClassification[],
  key: DateRangeKey,
  now: Date = new Date(),
): TransactionWithClassification[] {
  const start = dateRangeStart(key, now);
  if (!start) return rows;
  return rows.filter((r) => r.transaction_date >= start);
}

// --- Filtering + sorting --------------------------------------------------

export function filterTransactions(
  rows: TransactionWithClassification[],
  filters: TransactionFilters,
): TransactionWithClassification[] {
  const search = filters.search?.trim().toLowerCase();
  return rows.filter((r) => {
    const c = r.classification;

    if (search) {
      const hay = `${r.merchant ?? ""} ${r.description ?? ""}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (filters.category && c?.category !== filters.category) return false;
    if (filters.platform && c?.platform !== filters.platform) return false;
    if (filters.childId && c?.child_id !== filters.childId) return false;
    if (filters.confidenceLabel && c?.confidence_label !== filters.confidenceLabel)
      return false;
    if (filters.kidRelated && c?.kid_related_likelihood !== filters.kidRelated)
      return false;
    if (
      filters.needsReview !== null &&
      filters.needsReview !== undefined &&
      Boolean(c?.needs_review) !== filters.needsReview
    )
      return false;
    if (filters.sourceType && r.source_type !== filters.sourceType) return false;

    if (filters.status) {
      if (filters.status === "unclassified" && c) return false;
      if (filters.status === "classified" && !c) return false;
      if (filters.status === "needs_review" && !c?.needs_review) return false;
      if (
        filters.status === "parent_verified" &&
        c?.model_provider !== "parent_correction"
      )
        return false;
    }
    return true;
  });
}

export function sortTransactions(
  rows: TransactionWithClassification[],
  key: SortKey,
  dir: SortDir = "desc",
): TransactionWithClassification[] {
  const factor = dir === "asc" ? 1 : -1;
  const value = (r: TransactionWithClassification): number | string => {
    switch (key) {
      case "amount":
        return r.amount;
      case "confidence":
        return r.classification?.confidence_score ?? -1;
      case "created_at":
        return r.created_at;
      default:
        return r.transaction_date;
    }
  };
  return [...rows].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (va < vb) return -1 * factor;
    if (va > vb) return 1 * factor;
    return 0;
  });
}

// --- Grouping -------------------------------------------------------------

function groupBy(
  rows: TransactionWithClassification[],
  pick: (c: NonNullable<TransactionWithClassification["classification"]>) => string | null,
): SpendGroup[] {
  const map = new Map<string, SpendGroup>();
  for (const r of rows) {
    if (!r.classification) continue;
    const key = pick(r.classification);
    if (!key) continue;
    const g = map.get(key) ?? { key, amount: 0, count: 0 };
    g.amount += r.amount;
    g.count += 1;
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

export function groupSpendByCategory(
  rows: TransactionWithClassification[],
): SpendGroup[] {
  return groupBy(rows, (c) => c.category);
}

export function groupSpendByPlatform(
  rows: TransactionWithClassification[],
): SpendGroup[] {
  return groupBy(rows, (c) => c.platform);
}

export function groupSpendByChild(
  rows: TransactionWithClassification[],
  children: ChildRef[],
): ChildSpendGroup[] {
  const names = new Map(children.map((c) => [c.id, c.name]));
  const map = new Map<string, ChildSpendGroup>();
  for (const r of rows) {
    const childId = r.classification?.child_id;
    if (!childId) continue;
    const g =
      map.get(childId) ??
      ({
        childId,
        childName: names.get(childId) ?? "Unknown",
        amount: 0,
        count: 0,
      } as ChildSpendGroup);
    g.amount += r.amount;
    g.count += 1;
    map.set(childId, g);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

export function groupSpendByKidLikelihood(
  rows: TransactionWithClassification[],
): { yes: number; no: number; unclear: number } {
  const totals = { yes: 0, no: 0, unclear: 0 };
  for (const r of rows) {
    const k = r.classification?.kid_related_likelihood;
    if (k) totals[k] += r.amount;
  }
  return totals;
}

export function calculateNeedsReviewCounts(
  rows: TransactionWithClassification[],
): { total: number; byCategory: SpendGroup[]; byPlatform: SpendGroup[] } {
  const needsReview = rows.filter((r) => r.classification?.needs_review);
  return {
    total: needsReview.length,
    byCategory: groupSpendByCategory(needsReview),
    byPlatform: groupSpendByPlatform(needsReview),
  };
}

// --- Review queue ---------------------------------------------------------

/** Transactions that warrant parent attention. */
export function getReviewQueue(
  rows: TransactionWithClassification[],
): TransactionWithClassification[] {
  return rows.filter((r) => {
    const c = r.classification;
    if (!c) return true; // unclassified
    if (c.needs_review) return true;
    if (c.confidence_label === "low" || c.confidence_label === "unclassified")
      return true;
    if (c.kid_related_likelihood === "unclear") return true;
    return false;
  });
}

// --- Query parsing (URL searchParams -> typed query) ----------------------

const RANGE_KEYS: DateRangeKey[] = ["7d", "30d", "90d", "all"];
const SORT_KEYS: SortKey[] = ["date", "amount", "confidence", "created_at"];
const STATUSES = ["classified", "unclassified", "needs_review", "parent_verified"];

export function parseDateRange(
  value: string | undefined,
  fallback: DateRangeKey = "all",
): DateRangeKey {
  return RANGE_KEYS.includes(value as DateRangeKey)
    ? (value as DateRangeKey)
    : fallback;
}

/** Parse a page's searchParams into a typed filter/sort query. Pure + testable. */
export function parseTransactionQuery(sp: Record<string, string | undefined>): {
  range: DateRangeKey;
  filters: TransactionFilters;
  sort: SortKey;
  dir: SortDir;
} {
  return {
    range: parseDateRange(sp.range, "all"),
    sort: SORT_KEYS.includes(sp.sort as SortKey) ? (sp.sort as SortKey) : "date",
    dir: sp.dir === "asc" ? "asc" : "desc",
    filters: {
      search: sp.q || undefined,
      category: sp.category || null,
      platform: sp.platform || null,
      childId: sp.child || null,
      confidenceLabel: sp.confidence || null,
      sourceType: (sp.source as SourceType) || null,
      status: (STATUSES.includes(sp.status ?? "")
        ? sp.status
        : null) as TransactionFilters["status"],
    },
  };
}

/** Distinct categories + platforms present in the rows (for filter dropdowns). */
export function facetsFromRows(rows: TransactionWithClassification[]): {
  categories: string[];
  platforms: string[];
} {
  const categories = new Set<string>();
  const platforms = new Set<string>();
  for (const r of rows) {
    if (r.classification?.category) categories.add(r.classification.category);
    if (r.classification?.platform) platforms.add(r.classification.platform);
  }
  return {
    categories: [...categories].sort(),
    platforms: [...platforms].sort(),
  };
}

// --- Dashboard summary ----------------------------------------------------

export function summarizeDashboard(
  rows: TransactionWithClassification[],
  children: ChildRef[] = [],
): DashboardSummary {
  const classified = rows.filter((r) => r.classification);
  const needsReview = rows.filter((r) => r.classification?.needs_review);
  const byKidLikelihood = groupSpendByKidLikelihood(rows);

  const recentNeedsReview = getReviewQueue(rows).slice(0, 5);
  const recentClassified = classified
    .filter((r) => !r.classification?.needs_review)
    .slice(0, 5);

  return {
    totalTransactions: rows.length,
    classifiedCount: classified.length,
    needsReviewCount: needsReview.length,
    likelyKidSpend: byKidLikelihood.yes,
    unclearKidSpend: byKidLikelihood.unclear,
    byCategory: groupSpendByCategory(rows),
    byPlatform: groupSpendByPlatform(rows),
    byChild: groupSpendByChild(rows, children),
    byKidLikelihood,
    recentNeedsReview,
    recentClassified,
  };
}
