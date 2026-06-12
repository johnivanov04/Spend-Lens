import { requireFamilyContext } from "@/lib/server-context";
import {
  countTransactionsForFamily,
  listTransactionsForFamily,
} from "@/lib/data/transactions";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage() {
  const { supabase, family } = await requireFamilyContext();

  const [transactionCount, recentTransactions] = await Promise.all([
    countTransactionsForFamily(supabase, family.id),
    listTransactionsForFamily(supabase, family.id, { limit: 5 }),
  ]);

  return (
    <DashboardView
      transactionCount={transactionCount}
      recentTransactions={recentTransactions}
    />
  );
}
