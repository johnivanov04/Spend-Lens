import Link from "next/link";
import { Button, Card } from "@/components/ui";

export default function BillingSettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Billing</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your plan and payment details will live here.
        </p>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
          Billing is not enabled yet. Spend Lens is currently in{" "}
          <span className="font-medium text-slate-800">free beta</span> — there
          is nothing to pay and no card on file.
        </div>
        <p className="text-sm text-slate-500">
          See what pricing will look like after beta.
        </p>
        <div>
          <Link href="/pricing">
            <Button variant="secondary" size="sm">
              View pricing
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
