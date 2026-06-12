"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input } from "@/components/ui";
import { validateFamilyName } from "@/lib/validation";
import { updateFamilyNameClient } from "@/lib/data/family-client";

export function FamilyNameForm({
  familyId,
  initialName,
}: {
  familyId: string;
  initialName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const validationError = validateFamilyName(name);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const updated = await updateFamilyNameClient(familyId, name);
      setName(updated.name);
      setSaved(true);
      router.refresh();
    } catch {
      setError("Could not save your family name. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Field label="Family name" htmlFor="family-name">
        <Input
          id="family-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
        />
      </Field>
      {error && <Alert tone="error">{error}</Alert>}
      {saved && <Alert tone="success">Family name saved.</Alert>}
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
