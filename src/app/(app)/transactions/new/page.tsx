import { requireFamilyContext } from "@/lib/server-context";
import { TransactionInputTabs } from "@/components/transactions/transaction-input-tabs";

export default async function NewTransactionPage() {
  const { family } = await requireFamilyContext();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Add a transaction
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Type a charge in manually, or paste receipt text and we&apos;ll pull
          out the details for you to review.
        </p>
      </div>
      <TransactionInputTabs familyId={family.id} />
    </div>
  );
}
