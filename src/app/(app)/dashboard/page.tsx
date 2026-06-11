import { EmptyState } from "@/components/empty-state";
import { formatCurrency } from "@/lib/utils";

const SUMMARY_CARDS = [
  { label: "Likely kid-related spend", value: formatCurrency(0) },
  { label: "Needs review", value: "0" },
  { label: "Top platform", value: "—" },
  { label: "Last import", value: "—" },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          A calm view of likely kid-related digital spending.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUMMARY_CARDS.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <EmptyState
        title="No transactions yet"
        description="Upload a CSV or paste a receipt to start decoding family digital spending."
        actionLabel="Add transactions"
        actionHref="/transactions"
      />
    </div>
  );
}
