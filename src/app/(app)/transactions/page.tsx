import { requireFamilyContext } from "@/lib/server-context";
import { listTransactionsForFamily } from "@/lib/data/transactions";
import {
  TransactionListActions,
  TransactionTable,
} from "@/components/transactions/transaction-table";

export default async function TransactionsPage() {
  const { supabase, family } = await requireFamilyContext();
  const transactions = await listTransactionsForFamily(supabase, family.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Transactions</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every transaction you&apos;ve added, newest first.
          </p>
        </div>
        <TransactionListActions />
      </div>
      <TransactionTable transactions={transactions} />
    </div>
  );
}
