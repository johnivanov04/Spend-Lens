/**
 * Temporary placeholder for sections that ship in later build phases. Keeps the
 * app fully navigable during Phase 1 without dead links.
 */
export function SectionPlaceholder({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <div>
          <p className="text-sm font-medium text-slate-700">Coming in {phase}</p>
          <p className="mt-1 text-sm text-slate-500">
            This section is part of the planned build and isn&apos;t wired up yet.
          </p>
        </div>
      </div>
    </div>
  );
}
