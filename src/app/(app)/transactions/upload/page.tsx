import { requireFamilyContext } from "@/lib/server-context";
import { UploadTabs } from "@/components/transactions/upload-tabs";
import { PrivacyNote } from "@/components/privacy-note";

export default async function UploadTransactionsPage() {
  const { family } = await requireFamilyContext();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Upload a statement</h1>
        <p className="mt-1 text-sm text-slate-500">
          Import transactions from a bank or card statement. <span className="font-medium text-slate-700">CSV is preferred</span> when
          your bank offers it. PDF works for downloaded digital statements — not
          scanned images. We preview valid, invalid, and duplicate rows before
          anything is saved.
        </p>
        <PrivacyNote className="mt-2">
          Spend Lens only imports transaction rows — never balances or account
          numbers — and doesn&apos;t store the uploaded file. Only upload data
          you&apos;re comfortable storing; you can delete transactions anytime.
        </PrivacyNote>
      </div>
      <UploadTabs familyId={family.id} />
    </div>
  );
}
