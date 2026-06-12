import { requireFamilyContext } from "@/lib/server-context";
import { listChildren } from "@/lib/data/family";
import { listTransactionsWithClassification } from "@/lib/data/classifications";
import {
  TransactionListActions,
  TransactionsTable,
} from "@/components/transactions/transaction-table";
import { ClassifyAllButton } from "@/components/transactions/classify-all-button";

export default async function TransactionsPage() {
  const { supabase, family } = await requireFamilyContext();
  const [rows, children] = await Promise.all([
    listTransactionsWithClassification(supabase, family.id),
    listChildren(supabase, family.id),
  ]);
  const hasUnclassified = rows.some((r) => !r.classification);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Transactions</h1>
          <p className="mt-1 text-sm text-slate-500">
            Classify charges, then review and correct anything that looks off.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {hasUnclassified && <ClassifyAllButton />}
          <TransactionListActions />
        </div>
      </div>
      <TransactionsTable
        rows={rows}
        familyId={family.id}
        children={children.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
