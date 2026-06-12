"use client";

import { useEffect } from "react";
import { Button, Card } from "@/components/ui";

/**
 * Error boundary for the authenticated area. Catches errors thrown by server
 * pages (e.g. a database query failing because migrations haven't been applied)
 * and shows a calm, recoverable message instead of crashing.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the console for local debugging; never logs sensitive data.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-12">
      <Card className="flex flex-col gap-4 text-center">
        <h1 className="text-lg font-semibold text-slate-900">
          Something went wrong
        </h1>
        <p className="text-sm text-slate-600">
          We couldn&apos;t load this page. If you just set up Spend Lens, make
          sure your Supabase migrations have been run. Otherwise, please try
          again.
        </p>
        <div className="flex justify-center gap-2">
          <Button size="sm" onClick={reset}>
            Try again
          </Button>
        </div>
      </Card>
    </div>
  );
}
