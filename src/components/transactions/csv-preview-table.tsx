import { cn, formatCurrency } from "@/lib/utils";
import type { CsvPreview } from "@/lib/transactions/csv";

const MAX_VISIBLE = 100;

export function CsvPreviewTable({ preview }: { preview: CsvPreview }) {
  const visible = preview.rows.slice(0, MAX_VISIBLE);
  const hidden = preview.rows.length - visible.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 text-sm">
        <Pill tone="ok">{preview.validCount} valid</Pill>
        <Pill tone="warn">{preview.duplicateCount} duplicate</Pill>
        <Pill tone="bad">{preview.invalidCount} invalid</Pill>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Merchant / Description</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.index} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-400">{row.index + 1}</td>
                <td className="px-3 py-2">{row.draft?.transaction_date ?? "—"}</td>
                <td className="px-3 py-2">
                  {row.draft?.merchant || row.draft?.description || "—"}
                </td>
                <td className="px-3 py-2">
                  {row.draft ? formatCurrency(row.draft.amount) : "—"}
                </td>
                <td className="px-3 py-2">
                  {!row.valid ? (
                    <span className="text-red-700">
                      Invalid — {row.errors.join("; ")}
                    </span>
                  ) : row.duplicateInFile ? (
                    <span className="text-amber-700">Duplicate in file</span>
                  ) : (
                    <span className="text-emerald-700">Valid</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hidden > 0 && (
        <p className="text-xs text-slate-500">…and {hidden} more rows.</p>
      )}
    </div>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "bad";
  children: React.ReactNode;
}) {
  const tones = {
    ok: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    bad: "bg-red-50 text-red-700",
  } as const;
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
