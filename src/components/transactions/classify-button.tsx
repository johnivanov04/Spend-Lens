"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

/** Classifies a single transaction via the server route, then refreshes. */
export function ClassifyButton({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function onClick() {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/transactions/${transactionId}/classify`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("classify failed");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="secondary" onClick={onClick} disabled={busy}>
      {busy ? "Classifying…" : error ? "Retry" : "Classify"}
    </Button>
  );
}
