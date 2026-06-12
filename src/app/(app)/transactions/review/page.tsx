import { requireFamilyContext } from "@/lib/server-context";
import { listChildren } from "@/lib/data/family";
import { listTransactionsWithClassification } from "@/lib/data/classifications";
import {
  facetsFromRows,
  filterTransactions,
  getReviewQueue,
  parseTransactionQuery,
  sortTransactions,
} from "@/lib/analytics";
import { TransactionsTable } from "@/components/transactions/transaction-table";
import { TransactionFilters as FiltersBar } from "@/components/transactions/transaction-filters";

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { supabase, family } = await requireFamilyContext();
  const sp = await searchParams;
  const { filters, sort, dir } = parseTransactionQuery(sp);

  const [allRows, children] = await Promise.all([
    listTransactionsWithClassification(supabase, family.id),
    listChildren(supabase, family.id),
  ]);

  const queue = getReviewQueue(allRows);
  const visible = sortTransactions(filterTransactions(queue, filters), sort, dir);
  const facets = facetsFromRows(allRows);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Review queue</h1>
        <p className="mt-1 text-sm text-slate-500">
          Transactions that are unclassified, low-confidence, unclear, or flagged
          for review. Open <span className="font-medium">Details</span> to correct
          one.
        </p>
      </div>

      <FiltersBar
        values={{
          q: sp.q,
          status: sp.status,
          category: sp.category,
          platform: sp.platform,
          child: sp.child,
          confidence: sp.confidence,
          source: sp.source,
          sort: sp.sort,
          dir: sp.dir,
        }}
        facets={{
          categories: facets.categories,
          platforms: facets.platforms,
          children: children.map((c) => ({ id: c.id, name: c.name })),
        }}
      />

      <TransactionsTable
        rows={visible}
        familyId={family.id}
        children={children.map((c) => ({ id: c.id, name: c.name }))}
        emptyTitle="You're all caught up"
        emptyDescription="Nothing needs review right now."
        emptyActionLabel="View all transactions"
        emptyActionHref="/transactions"
      />
    </div>
  );
}
