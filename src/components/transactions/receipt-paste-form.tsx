"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { PrivacyNote } from "@/components/privacy-note";
import { extractReceiptPreview } from "@/lib/transactions/receipt";
import { validateTransactionInput } from "@/lib/transactions/transaction";
import { createReceiptTransactionClient } from "@/lib/data/transactions-client";

export function ReceiptPasteForm({ familyId }: { familyId: string }) {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [previewReady, setPreviewReady] = useState(false);
  const [extractNote, setExtractNote] = useState<string | null>(null);

  // Editable preview fields
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function handleExtract() {
    setExtractNote(null);
    if (rawText.trim().length < 3) {
      setExtractNote("Paste a bit more receipt text to extract details.");
      return;
    }
    const preview = extractReceiptPreview(rawText);
    setMerchant(preview.merchant ?? "");
    setDescription(preview.description ?? "");
    setAmount(preview.amount !== null ? String(preview.amount) : "");
    setTransactionDate(preview.transaction_date ?? "");
    setPreviewReady(true);
    if (preview.amount === null || preview.transaction_date === null) {
      setExtractNote(
        "We couldn't confidently read every field — please review and fill in anything missing.",
      );
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const result = validateTransactionInput({
      merchant,
      description,
      amount,
      transaction_date: transactionDate,
      raw_text: rawText,
    });
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await createReceiptTransactionClient(familyId, result.draft);
      router.push("/transactions");
      router.refresh();
    } catch {
      setSubmitError("Could not save the transaction. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Receipt text" htmlFor="receipt-text">
        <Textarea
          id="receipt-text"
          rows={6}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste the text of an order confirmation or receipt here."
        />
      </Field>
      <div>
        <Button type="button" variant="secondary" onClick={handleExtract}>
          Extract preview
        </Button>
      </div>
      <PrivacyNote>
        Extraction is a suggestion you can edit before saving. Paste only what
        you&apos;re comfortable storing.
      </PrivacyNote>

      {extractNote && <Alert tone="info">{extractNote}</Alert>}

      {previewReady && (
        <form
          onSubmit={handleSave}
          className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4"
        >
          <h3 className="text-sm font-semibold text-slate-900">
            Preview — review and edit before saving
          </h3>
          {submitError && <Alert tone="error">{submitError}</Alert>}

          <Field label="Merchant" htmlFor="receipt-merchant">
            <Input
              id="receipt-merchant"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
          </Field>
          <Field label="Description" htmlFor="receipt-description">
            <Input
              id="receipt-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          {errors.merchant && <Alert tone="error">{errors.merchant}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount" htmlFor="receipt-amount">
              <Input
                id="receipt-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Date" htmlFor="receipt-date">
              <Input
                id="receipt-date"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </Field>
          </div>
          {errors.amount && <Alert tone="error">{errors.amount}</Alert>}
          {errors.transaction_date && (
            <Alert tone="error">{errors.transaction_date}</Alert>
          )}

          <div>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save transaction"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
