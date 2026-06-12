import Link from "next/link";
import { Button } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, cn } from "@/lib/utils";
import { isRefund, sourceLabel } from "@/lib/transactions/transaction";
import { StatusBadge } from "@/components/transactions/classification-badges";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { SpendBarChart } from "@/components/dashboard/spend-bar-chart";
import type { DashboardSummary, DateRangeKey } from "@/lib/analytics";
import type { TransactionWithClassification } from "@/lib/data/classifications";

export function DashboardView({
  summary,
  range,
  hasChildren,
}: {
  summary: DashboardSummary;
  range: DateRangeKey;
  hasChildren: boolean;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            A calm view of your family&apos;s likely kid-related digital spending.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <DateRangeFilter active={range} />
          <div className="flex gap-2">
            <Link href="/transactions/new">
              <Button size="sm">Add transaction</Button>
            </Link>
            <Link href="/transactions/upload">
              <Button size="sm" variant="secondary">
                Upload CSV
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {summary.totalTransactions === 0 ? (
        <EmptyState
          title="No transactions in this range"
          description="Add transactions or widen the date range to see your spending summary."
          actionLabel="Add transactions"
          actionHref="/transactions/new"
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Transactions" value={String(summary.totalTransactions)} />
            <StatCard label="Classified" value={String(summary.classifiedCount)} />
            <StatCard
              label="Needs review"
              value={String(summary.needsReviewCount)}
              href="/transactions/review"
            />
            <StatCard
              label="Likely kid-related spend"
              value={formatCurrency(summary.likelyKidSpend)}
            />
            <StatCard
              label="Unclear kid-related spend"
              value={formatCurrency(summary.unclearKidSpend)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SpendBarChart
              title="Spend by category"
              data={summary.byCategory.map((g) => ({
                label: g.key,
                amount: g.amount,
              }))}
            />
            <SpendBarChart
              title="Spend by platform"
              data={summary.byPlatform.map((g) => ({
                label: g.key,
                amount: g.amount,
              }))}
            />
            {hasChildren && (
              <SpendBarChart
                title="Spend by child"
                data={summary.byChild.map((g) => ({
                  label: g.childName,
                  amount: g.amount,
                }))}
                emptyText="No transactions are assigned to a child yet."
              />
            )}
            <SpendBarChart
              title="Spend by kid-related likelihood"
              data={[
                { label: "Likely kid-related", amount: summary.byKidLikelihood.yes },
                { label: "Unclear", amount: summary.byKidLikelihood.unclear },
                { label: "Not kid-related", amount: summary.byKidLikelihood.no },
              ].filter((d) => d.amount !== 0)}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <RecentList
              title="Needs review"
              href="/transactions/review"
              rows={summary.recentNeedsReview}
              emptyText="Nothing needs review right now."
            />
            <RecentList
              title="Recently classified"
              href="/transactions"
              rows={summary.recentClassified}
              emptyText="No classified transactions yet."
            />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function RecentList({
  title,
  href,
  rows,
  emptyText,
}: {
  title: string;
  href: string;
  rows: TransactionWithClassification[];
  emptyText: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <Link href={href} className="text-sm font-medium text-indigo-600">
          View all
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-400">
          {emptyText}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {rows.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {t.merchant || t.description || "—"}
                </p>
                <p className="text-xs text-slate-400">
                  {t.transaction_date} · {sourceLabel(t.source_type)}
                  {t.classification?.category
                    ? ` · ${t.classification.category}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge classification={t.classification} />
                <span
                  className={cn(
                    "text-sm font-medium",
                    isRefund(t.amount) ? "text-amber-700" : "text-slate-900",
                  )}
                >
                  {formatCurrency(t.amount, t.currency)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
