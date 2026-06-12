"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

/** Persists the current week's preview via the API route, then refreshes. */
export function RegenerateSummaryButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  async function onClick() {
    setBusy(true);
    setError(false);
    setSaved(false);
    try {
      const res = await fetch("/api/summary/weekly/preview", { method: "POST" });
      if (!res.ok) throw new Error("preview failed");
      setSaved(true);
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
        {busy ? "Generating…" : "Regenerate preview"}
      </Button>
      {saved && <span className="text-xs text-emerald-700">Preview saved.</span>}
      {error && (
        <span className="text-xs text-red-700">Couldn&apos;t save preview.</span>
      )}
    </div>
  );
}
