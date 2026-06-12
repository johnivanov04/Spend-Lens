import {
  dateRangeStart,
  filterByDateRange,
  summarizeDashboard,
  type SpendGroup,
  type ChildSpendGroup,
} from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils";
import type { TransactionWithClassification } from "@/lib/data/classifications";
import type { ChildRef } from "@/lib/ai/schema";

/**
 * Pure weekly-summary generation. Reuses the Phase 5 analytics layer over the
 * last 7 days. No Supabase, no email, no AI — fully unit-testable.
 */

export type WeeklySummaryState =
  | "no_transactions"
  | "none_classified"
  | "no_kid_spend"
  | "ok";

export type WeeklySummaryData = {
  periodStart: string;
  periodEnd: string;
  totalTransactions: number;
  classifiedCount: number;
  needsReviewCount: number;
  lowConfidenceCount: number;
  likelyKidSpend: number;
  unclearKidSpend: number;
  topCategories: SpendGroup[];
  topPlatforms: SpendGroup[];
  byChild: ChildSpendGroup[];
  hasChildren: boolean;
  recentNeedsReview: {
    id: string;
    merchant: string | null;
    amount: number;
    date: string;
  }[];
  state: WeeklySummaryState;
};

export type WeeklySummaryResult = {
  period_start: string;
  period_end: string;
  summary_json: WeeklySummaryData;
  summary_text: string;
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d}`;
}

/** The inclusive last-7-days window ending on `now`. */
export function getWeeklyDateRange(now: Date = new Date()): {
  period_start: string;
  period_end: string;
} {
  return {
    period_start: dateRangeStart("7d", now) as string,
    period_end: now.toISOString().slice(0, 10),
  };
}

/** Primary headline state for the week. */
export function getWeeklySummaryState(s: {
  totalTransactions: number;
  classifiedCount: number;
  likelyKidSpend: number;
  unclearKidSpend: number;
}): WeeklySummaryState {
  if (s.totalTransactions === 0) return "no_transactions";
  if (s.classifiedCount === 0) return "none_classified";
  if (s.likelyKidSpend === 0 && s.unclearKidSpend === 0) return "no_kid_spend";
  return "ok";
}

/** Summarize the last 7 days into a serializable data object. */
export function summarizeLastSevenDays(
  rows: TransactionWithClassification[],
  children: ChildRef[],
  now: Date = new Date(),
): WeeklySummaryData {
  const { period_start, period_end } = getWeeklyDateRange(now);
  const inRange = filterByDateRange(rows, "7d", now);
  const summary = summarizeDashboard(inRange, children);

  const lowConfidenceCount = inRange.filter(
    (r) =>
      r.classification &&
      (r.classification.confidence_label === "low" ||
        r.classification.confidence_label === "unclassified"),
  ).length;

  return {
    periodStart: period_start,
    periodEnd: period_end,
    totalTransactions: summary.totalTransactions,
    classifiedCount: summary.classifiedCount,
    needsReviewCount: summary.needsReviewCount,
    lowConfidenceCount,
    likelyKidSpend: summary.likelyKidSpend,
    unclearKidSpend: summary.unclearKidSpend,
    topCategories: summary.byCategory.slice(0, 5),
    topPlatforms: summary.byPlatform.slice(0, 5),
    byChild: summary.byChild,
    hasChildren: children.length > 0,
    recentNeedsReview: summary.recentNeedsReview.map((r) => ({
      id: r.id,
      merchant: r.merchant,
      amount: r.amount,
      date: r.transaction_date,
    })),
    state: getWeeklySummaryState(summary),
  };
}

/** Build named UI sections from the summary data. */
export function buildWeeklySummarySections(data: WeeklySummaryData): {
  likelyKidSpend: number;
  unclearKidSpend: number;
  needsReview: WeeklySummaryData["recentNeedsReview"];
  topCategories: SpendGroup[];
  topPlatforms: SpendGroup[];
  childBreakdown: ChildSpendGroup[];
} {
  return {
    likelyKidSpend: data.likelyKidSpend,
    unclearKidSpend: data.unclearKidSpend,
    needsReview: data.recentNeedsReview,
    topCategories: data.topCategories,
    topPlatforms: data.topPlatforms,
    childBreakdown: data.byChild,
  };
}

/** Plain-English, conservative summary text. */
export function formatWeeklySummaryText(data: WeeklySummaryData): string {
  const range = `${shortDate(data.periodStart)}–${shortDate(data.periodEnd)}`;
  const reviewSentence =
    data.needsReviewCount > 0
      ? ` ${data.needsReviewCount} transaction${data.needsReviewCount === 1 ? "" : "s"} need review.`
      : "";

  switch (data.state) {
    case "no_transactions":
      return `No transactions in the last 7 days (${range}). Add transactions to see your weekly summary.`;
    case "none_classified":
      return `You have ${data.totalTransactions} transaction${data.totalTransactions === 1 ? "" : "s"} from the last 7 days (${range}), but none are classified yet. Classify them to see likely kid-related spending.`;
    case "no_kid_spend":
      return `In the last 7 days (${range}) you had ${data.totalTransactions} transaction${data.totalTransactions === 1 ? "" : "s"}, ${data.classifiedCount} classified. None look likely kid-related so far.${reviewSentence}`;
    default: {
      const unclear =
        data.unclearKidSpend !== 0
          ? `, with another ${formatCurrency(data.unclearKidSpend)} that's unclear and may be kid-related`
          : "";
      const cats =
        data.topCategories.length > 0
          ? ` Top categories: ${data.topCategories.map((c) => c.key).slice(0, 3).join(", ")}.`
          : "";
      return `In the last 7 days (${range}) you had ${data.totalTransactions} transaction${data.totalTransactions === 1 ? "" : "s"}. Likely kid-related spend was ${formatCurrency(data.likelyKidSpend)}${unclear}.${cats}${reviewSentence}`;
    }
  }
}

/** Generate the full weekly summary (data + text + period). */
export function generateWeeklySummary(
  rows: TransactionWithClassification[],
  children: ChildRef[],
  now: Date = new Date(),
): WeeklySummaryResult {
  const data = summarizeLastSevenDays(rows, children, now);
  return {
    period_start: data.periodStart,
    period_end: data.periodEnd,
    summary_json: data,
    summary_text: formatWeeklySummaryText(data),
  };
}
