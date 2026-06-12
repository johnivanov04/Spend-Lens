import Link from "next/link";
import { Button } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { cn, formatCurrency } from "@/lib/utils";
import { isRefund, sourceLabel } from "@/lib/transactions/transaction";
import type { TransactionRow } from "@/lib/data/transactions";

export function TransactionTable({
  transactions,
}: {
  transactions: TransactionRow[];
}) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        title="No transactions yet"
        description="Add a transaction manually, paste a receipt, or upload a CSV to get started."
        actionLabel="Add a transaction"
        actionHref="/transactions/new"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Merchant</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Source</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Added</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id} className="border-t border-slate-100">
              <td className="px-4 py-3 text-slate-700">{t.transaction_date}</td>
              <td className="px-4 py-3 text-slate-900">{t.merchant || "—"}</td>
              <td className="px-4 py-3 text-slate-500">{t.description || "—"}</td>
              <td
                className={cn(
                  "px-4 py-3 font-medium",
                  isRefund(t.amount) ? "text-amber-700" : "text-slate-900",
                )}
              >
                {formatCurrency(t.amount, t.currency)}
                {isRefund(t.amount) && (
                  <span className="ml-1 text-xs font-normal">(refund)</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {sourceLabel(t.source_type)}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                  Unclassified
                </span>
              </td>
              <td className="px-4 py-3 text-slate-400">
                {t.created_at.slice(0, 10)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TransactionListActions() {
  return (
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
  );
}
