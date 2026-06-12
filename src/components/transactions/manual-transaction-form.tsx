"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import {
  isRefund,
  parseAmount,
  validateTransactionInput,
} from "@/lib/transactions/transaction";
import { createManualTransactionClient } from "@/lib/data/transactions-client";

const today = () => new Date().toISOString().slice(0, 10);

export function ManualTransactionForm({ familyId }: { familyId: string }) {
  const router = useRouter();
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(today());
  const [rawText, setRawText] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsedAmount = parseAmount(amount);
  const showRefundHint = parsedAmount !== null && isRefund(parsedAmount);

  async function onSubmit(e: React.FormEvent) {
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
      await createManualTransactionClient(familyId, result.draft);
      router.push("/transactions");
      router.refresh();
    } catch {
      setSubmitError("Could not save the transaction. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {submitError && <Alert tone="error">{submitError}</Alert>}

      <Field label="Merchant" htmlFor="merchant">
        <Input
          id="merchant"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="e.g. APPLE.COM/BILL"
        />
      </Field>

      <Field label="Description" htmlFor="description">
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. APPLE.COM/BILL 866-712-7753 CA"
        />
      </Field>
      {errors.merchant && <Alert tone="error">{errors.merchant}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount" htmlFor="amount">
          <Input
            id="amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="19.99"
          />
        </Field>
        <Field label="Date" htmlFor="transaction-date">
          <Input
            id="transaction-date"
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
          />
        </Field>
      </div>
      {showRefundHint && (
        <p className="text-xs font-medium text-amber-700">
          Negative amount — this will be recorded as a refund/credit.
        </p>
      )}
      {errors.amount && <Alert tone="error">{errors.amount}</Alert>}
      {errors.transaction_date && (
        <Alert tone="error">{errors.transaction_date}</Alert>
      )}

      <Field label="Raw text (optional)" htmlFor="raw-text">
        <Textarea
          id="raw-text"
          rows={3}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste the original statement line or note, if you have it."
        />
      </Field>

      <div>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save transaction"}
        </Button>
      </div>
    </form>
  );
}
