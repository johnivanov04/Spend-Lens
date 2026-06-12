import { cn } from "@/lib/utils";
import {
  confidenceLabelText,
  type ConfidenceLabel,
  type KidRelatedLikelihood,
} from "@/lib/ai/schema";
import type { ClassificationRow } from "@/lib/data/classifications";

export function ConfidenceBadge({ label }: { label: string }) {
  const tones: Record<string, string> = {
    high: "bg-emerald-50 text-emerald-700",
    medium: "bg-sky-50 text-sky-700",
    low: "bg-amber-50 text-amber-700",
    unclassified: "bg-slate-100 text-slate-500",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        tones[label] ?? tones.unclassified,
      )}
    >
      {confidenceLabelText(label as ConfidenceLabel)}
    </span>
  );
}

export function KidRelatedBadge({
  likelihood,
}: {
  likelihood: KidRelatedLikelihood;
}) {
  const map = {
    yes: { text: "Likely kid-related", cls: "bg-indigo-50 text-indigo-700" },
    no: { text: "Not kid-related", cls: "bg-slate-100 text-slate-500" },
    unclear: { text: "Kid-related unclear", cls: "bg-amber-50 text-amber-700" },
  } as const;
  const m = map[likelihood];
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", m.cls)}>
      {m.text}
    </span>
  );
}

/** Review/verification status derived from the classification (or its absence). */
export function StatusBadge({
  classification,
}: {
  classification: ClassificationRow | null;
}) {
  let text = "Unclassified";
  let cls = "bg-slate-100 text-slate-500";
  if (classification) {
    if (classification.model_provider === "parent_correction") {
      text = "Parent verified";
      cls = "bg-emerald-50 text-emerald-700";
    } else if (classification.needs_review) {
      text = "Needs review";
      cls = "bg-amber-50 text-amber-700";
    } else {
      text = "Classified";
      cls = "bg-sky-50 text-sky-700";
    }
  }
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", cls)}>
      {text}
    </span>
  );
}
