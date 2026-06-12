import Link from "next/link";
import { Button } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, cn } from "@/lib/utils";
import { isRefund, sourceLabel } from "@/lib/transactions/transaction";
import type { TransactionRow } from "@/lib/data/transactions";

export function DashboardView({
  transactionCount,
  recentTransactions,
}: {
  transactionCount: number;
  recentTransactions: TransactionRow[];
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
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Saved transactions</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {transactionCount}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:col-span-2">
              <p className="text-sm text-slate-500">Spending insights</p>
              <p className="mt-2 text-sm text-slate-600">
                Platform, category, and kid-related summaries appear once
                classification is enabled (coming next).
              </p>
            </div>
          </div>

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
              {recentTransactions.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {t.merchant || t.description || "—"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {t.transaction_date} · {sourceLabel(t.source_type)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isRefund(t.amount) ? "text-amber-700" : "text-slate-900",
                    )}
                  >
                    {formatCurrency(t.amount, t.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
