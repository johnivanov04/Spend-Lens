import { requireFamilyContext } from "@/lib/server-context";
import { CsvUploader } from "@/components/transactions/csv-uploader";

export default async function UploadTransactionsPage() {
  const { family } = await requireFamilyContext();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Upload a CSV
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Import transactions from a bank or card statement export. We&apos;ll
          preview valid, invalid, and duplicate rows before anything is saved.
        </p>
      </div>
      <CsvUploader familyId={family.id} />
    </div>
  );
}
