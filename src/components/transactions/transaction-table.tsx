"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { cn, formatCurrency } from "@/lib/utils";
import { isRefund, sourceLabel } from "@/lib/transactions/transaction";
import { ConfidenceBadge, StatusBadge } from "./classification-badges";
import { ClassifyButton } from "./classify-button";
import { CorrectionForm } from "./correction-form";
import type { TransactionWithClassification } from "@/lib/data/classifications";
import type { ChildRef } from "@/lib/ai/schema";

export function TransactionsTable({
  rows,
  familyId,
  children,
  emptyTitle = "No transactions yet",
  emptyDescription = "Add a transaction manually, paste a receipt, or upload a CSV to get started.",
  emptyActionLabel = "Add a transaction",
  emptyActionHref = "/transactions/new",
}: {
  rows: TransactionWithClassification[];
  familyId: string;
  children: ChildRef[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  emptyActionHref?: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        actionHref={emptyActionHref}
      />
    );
  }

  const childName = (id: string | null) =>
    id ? (children.find((c) => c.id === id)?.name ?? null) : null;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Merchant</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Platform</th>
            <th className="px-4 py-3 font-medium">Confidence</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const c = row.classification;
            const isOpen = expanded === row.id;
            return (
              <Fragment key={row.id}>
                <tr className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-700">
                    {row.transaction_date}
                  </td>
                  <td className="px-4 py-3 text-slate-900">
                    {row.merchant || row.description || "—"}
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {sourceLabel(row.source_type)}
                    </span>
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 font-medium",
                      isRefund(row.amount) ? "text-amber-700" : "text-slate-900",
                    )}
                  >
                    {formatCurrency(row.amount, row.currency)}
                    {isRefund(row.amount) && (
                      <span className="ml-1 text-xs font-normal">(refund)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {c?.category ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {c?.platform ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c ? <ConfidenceBadge label={c.confidence_label} /> : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge classification={c} />
                  </td>
                  <td className="px-4 py-3">
                    {c ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpanded(isOpen ? null : row.id)}
                      >
                        {isOpen ? "Close" : "Details"}
                      </Button>
                    ) : (
                      <ClassifyButton transactionId={row.id} />
                    )}
                  </td>
                </tr>
                {isOpen && c && (
                  <tr className="border-t border-slate-100 bg-slate-50">
                    <td colSpan={8} className="px-4 py-4">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">Why: </span>
                        {c.explanation}
                      </p>
                      {childName(c.child_id) && (
                        <p className="mt-1 text-sm text-slate-600">
                          Assigned to {childName(c.child_id)}
                        </p>
                      )}
                      <div className="mt-4 max-w-xl">
                        <p className="mb-2 text-sm font-medium text-slate-900">
                          Correct this
                        </p>
                        <CorrectionForm
                          transactionId={row.id}
                          familyId={familyId}
                          merchant={row.merchant}
                          description={row.description}
                          classification={c}
                          children={children}
                          onDone={() => setExpanded(null)}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
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
