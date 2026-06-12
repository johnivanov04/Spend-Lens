import Link from "next/link";
import { Button } from "@/components/ui";
import { formatCurrency, cn } from "@/lib/utils";
import { isRefund } from "@/lib/transactions/transaction";
import { SpendBarChart } from "@/components/dashboard/spend-bar-chart";
import { RegenerateSummaryButton } from "@/components/summary/regenerate-button";
import type { WeeklySummaryData } from "@/lib/weekly-summary";

export function WeeklySummaryView({
  data,
  text,
  emailEnabled,
}: {
  data: WeeklySummaryData;
  text: string;
  emailEnabled: boolean;
}) {
  const hasTransactions = data.totalTransactions > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Weekly summary
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {data.periodStart} – {data.periodEnd} (last 7 days)
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <RegenerateSummaryButton />
          <Button
            size="sm"
            variant="secondary"
            disabled
            title={
              emailEnabled
                ? "Email sending arrives in a later phase"
                : "Email sending not enabled"
            }
          >
            {emailEnabled ? "Send test email" : "Email sending not enabled"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm leading-6 text-slate-700">{text}</p>
        <Link
          href="/dashboard"
          className="mt-3 inline-block text-sm font-medium text-indigo-600"
        >
          Back to dashboard
        </Link>
      </div>

      {!hasTransactions ? null : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Transactions" value={String(data.totalTransactions)} />
            <StatCard label="Classified" value={String(data.classifiedCount)} />
            <StatCard
              label="Needs review"
              value={String(data.needsReviewCount)}
            />
            <StatCard
              label="Likely kid-related spend"
              value={formatCurrency(data.likelyKidSpend)}
            />
            <StatCard
              label="Unclear kid-related spend"
              value={formatCurrency(data.unclearKidSpend)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SpendBarChart
              title="Top categories"
              data={data.topCategories.map((g) => ({
                label: g.key,
                amount: g.amount,
              }))}
            />
            <SpendBarChart
              title="Top platforms"
              data={data.topPlatforms.map((g) => ({
                label: g.key,
                amount: g.amount,
              }))}
            />
            {data.hasChildren && (
              <SpendBarChart
                title="Spend by child"
                data={data.byChild.map((g) => ({
                  label: g.childName,
                  amount: g.amount,
                }))}
                emptyText="No transactions are assigned to a child this week."
              />
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Needs review
              </h2>
              <Link
                href="/transactions/review"
                className="text-sm font-medium text-indigo-600"
              >
                Open review queue
              </Link>
            </div>
            {data.recentNeedsReview.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-400">
                Nothing needs review this week.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {data.recentNeedsReview.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {t.merchant || "—"}
                      </p>
                      <p className="text-xs text-slate-400">{t.date}</p>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isRefund(t.amount) ? "text-amber-700" : "text-slate-900",
                      )}
                    >
                      {formatCurrency(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
