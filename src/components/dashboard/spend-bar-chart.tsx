import { formatCurrency } from "@/lib/utils";

export type BarDatum = { label: string; amount: number; count?: number };

/** A simple, dependency-free horizontal bar chart (CSS bars). */
export function SpendBarChart({
  title,
  data,
  emptyText = "No data in this range yet.",
}: {
  title: string;
  data: BarDatum[];
  emptyText?: string;
}) {
  const max = Math.max(0, ...data.map((d) => Math.abs(d.amount)));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {data.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">{emptyText}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {data.map((d) => (
            <li key={d.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{d.label}</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(d.amount)}
                </span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-indigo-500"
                  style={{
                    width: `${max > 0 ? Math.round((Math.abs(d.amount) / max) * 100) : 0}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
