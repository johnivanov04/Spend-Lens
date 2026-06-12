"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { KidManager } from "@/components/family/kid-manager";
import { validateFamilyName } from "@/lib/validation";
import { createFamilyClient } from "@/lib/data/family-client";
import type { Family } from "@/lib/data/family";

export function OnboardingFlow({ userId }: { userId: string }) {
  const router = useRouter();
  const [family, setFamily] = useState<Family | null>(null);

  // Step 1 state
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreateFamily(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateFamilyName(name);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const created = await createFamilyClient(userId, name);
      setFamily(created);
    } catch {
      setError("Could not create your family. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleContinue() {
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            Spend<span className="text-indigo-600">Lens</span>
          </span>
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-indigo-600">
            {family ? "Step 2 of 3 · Add children" : "Step 1 of 3 · Create your family"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            {family ? `Welcome, ${family.name}` : "Welcome to Spend Lens"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {family
              ? "Add your kids now, or skip and do it later."
              : "Let's set up your family profile."}
          </p>
        </div>

        {!family ? (
          <Card className="flex flex-col gap-4">
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-800">Your privacy</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>Spend Lens is for parents, not children.</li>
                <li>We never ask for a bank login or full card numbers.</li>
                <li>Use nicknames for kids — full legal names aren&apos;t needed.</li>
                <li>AI classifications are suggestions you can correct anytime.</li>
                <li>Your data is private to you and you can delete it anytime.</li>
              </ul>
            </div>

            <form onSubmit={handleCreateFamily} className="flex flex-col gap-3">
              <Field label="Family name" htmlFor="family-name">
                <Input
                  id="family-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. The Garcia Family"
                  autoFocus
                />
              </Field>
              {error && <Alert tone="error">{error}</Alert>}
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Creating…" : "Create family"}
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="flex flex-col gap-5">
            <KidManager familyId={family.id} initialChildren={[]} />
            <Button onClick={handleContinue} className="w-full">
              Continue to dashboard
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
