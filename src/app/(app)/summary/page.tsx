import { requireFamilyContext } from "@/lib/server-context";
import { listChildren } from "@/lib/data/family";
import { listTransactionsWithClassification } from "@/lib/data/classifications";
import { generateWeeklySummary } from "@/lib/weekly-summary";
import { isEmailEnabled } from "@/lib/mail/provider";
import { WeeklySummaryView } from "@/components/summary/weekly-summary-view";

export default async function SummaryPage() {
  const { supabase, family } = await requireFamilyContext();

  const [rows, children] = await Promise.all([
    listTransactionsWithClassification(supabase, family.id),
    listChildren(supabase, family.id),
  ]);

  const result = generateWeeklySummary(
    rows,
    children.map((c) => ({ id: c.id, name: c.name })),
  );

  return (
    <WeeklySummaryView
      data={result.summary_json}
      text={result.summary_text}
      emailEnabled={isEmailEnabled()}
    />
  );
}
