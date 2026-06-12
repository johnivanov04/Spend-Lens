"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input, Label, Select, Textarea } from "@/components/ui";
import {
  createMerchantRuleClient,
  saveCorrectionClient,
} from "@/lib/data/classifications-client";
import type { ChildRef, KidRelatedLikelihood } from "@/lib/ai/schema";
import type { ClassificationRow } from "@/lib/data/classifications";

export function CorrectionForm({
  transactionId,
  familyId,
  merchant,
  description,
  classification,
  children,
  onDone,
}: {
  transactionId: string;
  familyId: string;
  merchant: string | null;
  description: string | null;
  classification: ClassificationRow | null;
  children: ChildRef[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const [platform, setPlatform] = useState(classification?.platform ?? "");
  const [merchantFamily, setMerchantFamily] = useState(
    classification?.merchant_family ?? "",
  );
  const [category, setCategory] = useState(classification?.category ?? "");
  const [kidRelated, setKidRelated] = useState<KidRelatedLikelihood>(
    classification?.kid_related_likelihood ?? "unclear",
  );
  const [childId, setChildId] = useState(classification?.child_id ?? "");
  const [note, setNote] = useState(
    classification?.model_provider === "parent_correction"
      ? (classification?.explanation ?? "")
      : "",
  );
  const [stillNeedsReview, setStillNeedsReview] = useState(false);
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      await saveCorrectionClient({
        transaction_id: transactionId,
        family_id: familyId,
        platform: platform.trim() || null,
        merchant_family: merchantFamily.trim() || null,
        category: category.trim() || null,
        kid_related_likelihood: kidRelated,
        child_id: childId || null,
        explanation: note.trim() || null,
        needs_review: stillNeedsReview,
      });
      if (remember) {
        await createMerchantRuleClient(familyId, {
          merchant,
          description,
          platform: platform.trim() || null,
          category: category.trim() || null,
          kid_related_likelihood: kidRelated,
          child_id: childId || null,
        });
      }
      router.refresh();
      onDone?.();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {error && <Alert tone="error">Couldn&apos;t save. Please try again.</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Platform" htmlFor={`platform-${transactionId}`}>
          <Input
            id={`platform-${transactionId}`}
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            placeholder="e.g. Roblox"
          />
        </Field>
        <Field label="Merchant family" htmlFor={`merchant-family-${transactionId}`}>
          <Input
            id={`merchant-family-${transactionId}`}
            value={merchantFamily}
            onChange={(e) => setMerchantFamily(e.target.value)}
            placeholder="e.g. Roblox Corporation"
          />
        </Field>
        <Field label="Category" htmlFor={`category-${transactionId}`}>
          <Input
            id={`category-${transactionId}`}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Games"
          />
        </Field>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`kid-${transactionId}`}>Kid-related</Label>
          <Select
            id={`kid-${transactionId}`}
            value={kidRelated}
            onChange={(e) =>
              setKidRelated(e.target.value as KidRelatedLikelihood)
            }
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="unclear">Unclear</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`child-${transactionId}`}>Child</Label>
          <Select
            id={`child-${transactionId}`}
            value={childId}
            onChange={(e) => setChildId(e.target.value)}
          >
            <option value="">— none —</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Field label="Note (optional)" htmlFor={`note-${transactionId}`}>
        <Textarea
          id={`note-${transactionId}`}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="A plain-English note about this charge."
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        Remember this for similar charges
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={stillNeedsReview}
          onChange={(e) => setStillNeedsReview(e.target.checked)}
        />
        Keep this flagged for review
      </label>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Saving…" : "Save correction"}
        </Button>
        {onDone && (
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
