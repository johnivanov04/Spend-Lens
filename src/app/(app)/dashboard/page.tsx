import { requireFamilyContext } from "@/lib/server-context";
import { listTransactionsWithClassification } from "@/lib/data/classifications";
import { classificationCounts, summarizeCategories } from "@/lib/dashboard";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage() {
  const { supabase, family } = await requireFamilyContext();
  const rows = await listTransactionsWithClassification(supabase, family.id);

  const { transactionCount, classifiedCount, needsReviewCount } =
    classificationCounts(rows);

  return (
    <DashboardView
      transactionCount={transactionCount}
      classifiedCount={classifiedCount}
      needsReviewCount={needsReviewCount}
      recent={rows.slice(0, 5)}
      categorySummary={summarizeCategories(rows)}
    />
  );
}
