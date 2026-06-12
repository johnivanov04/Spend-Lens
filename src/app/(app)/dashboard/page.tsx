import { requireFamilyContext } from "@/lib/server-context";
import { listChildren } from "@/lib/data/family";
import { listTransactionsWithClassification } from "@/lib/data/classifications";
import {
  filterByDateRange,
  parseDateRange,
  summarizeDashboard,
} from "@/lib/analytics";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { supabase, family } = await requireFamilyContext();
  const sp = await searchParams;
  const range = parseDateRange(sp.range, "30d");

  const [rows, children] = await Promise.all([
    listTransactionsWithClassification(supabase, family.id),
    listChildren(supabase, family.id),
  ]);

  const summary = summarizeDashboard(
    filterByDateRange(rows, range),
    children.map((c) => ({ id: c.id, name: c.name })),
  );

  return (
    <DashboardView
      summary={summary}
      range={range}
      hasChildren={children.length > 0}
    />
  );
}
