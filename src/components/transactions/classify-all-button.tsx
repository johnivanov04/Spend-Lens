"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@/components/ui";

type Summary = {
  classified_count: number;
  needs_review_count: number;
  failed_count: number;
};

/** Classifies all unclassified transactions via the batch route, then refreshes. */
export function ClassifyAllButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState(false);

  async function onClick() {
    setBusy(true);
    setError(false);
    setSummary(null);
    try {
      const res = await fetch("/api/transactions/classify-batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("batch failed");
      const data = (await res.json()) as Summary;
      setSummary(data);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={onClick} disabled={busy}>
        {busy ? "Classifying…" : "Classify all unclassified"}
      </Button>
      {summary && (
        <p className="text-xs text-slate-500">
          Classified {summary.classified_count} · {summary.needs_review_count}{" "}
          need review · {summary.failed_count} failed
        </p>
      )}
      {error && (
        <Alert tone="error">Couldn&apos;t classify. Please try again.</Alert>
      )}
    </div>
  );
}
