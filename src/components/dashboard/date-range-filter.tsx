"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { DateRangeKey } from "@/lib/analytics";

const RANGES: { key: DateRangeKey; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "all", label: "All time" },
];

export function DateRangeFilter({ active }: { active: DateRangeKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setRange(key: DateRangeKey) {
    const params = new URLSearchParams(searchParams);
    params.set("range", key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div
      role="group"
      aria-label="Date range"
      className="inline-flex rounded-lg border border-slate-200 bg-white p-1"
    >
      {RANGES.map((r) => (
        <button
          key={r.key}
          type="button"
          aria-pressed={active === r.key}
          onClick={() => setRange(r.key)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            active === r.key
              ? "bg-indigo-50 text-indigo-700"
              : "text-slate-600 hover:bg-slate-100",
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
