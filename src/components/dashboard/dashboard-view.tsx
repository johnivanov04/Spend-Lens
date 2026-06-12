import Link from "next/link";
import { Button } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, cn } from "@/lib/utils";
import { isRefund, sourceLabel } from "@/lib/transactions/transaction";
import { StatusBadge } from "@/components/transactions/classification-badges";
import type { TransactionWithClassification } from "@/lib/data/classifications";

export function DashboardView({
  transactionCount,
  classifiedCount,
  needsReviewCount,
  recent,
  categorySummary,
}: {
  transactionCount: number;
  classifiedCount: number;
  needsReviewCount: number;
  recent: TransactionWithClassification[];
  categorySummary: { category: string; count: number }[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            A calm view of your family&apos;s digital spending.
          </p>
        </div>
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

      {transactionCount === 0 ? (
        <EmptyState
          title="No transactions yet"
          description="Upload a CSV or paste a receipt to start decoding family digital spending."
          actionLabel="Add transactions"
          actionHref="/transactions/new"
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Saved transactions" value={transactionCount} />
            <StatCard label="Classified" value={classifiedCount} />
            <StatCard
              label="Needs review"
              value={needsReviewCount}
              href="/transactions"
            />
          </div>

          {categorySummary.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-base font-semibold text-slate-900">
                By category
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {categorySummary.map((c) => (
                  <li
                    key={c.category}
                    className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                  >
                    {c.category} · {c.count}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Recent transactions
              </h2>
              <Link
                href="/transactions"
                className="text-sm font-medium text-indigo-600"
              >
                View all
              </Link>
            </div>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {recent.map((t) => (
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
  value: number;
  href?: string;
}) {
  const body = (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
