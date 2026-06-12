import { Card } from "@/components/ui";
import { FamilyNameForm } from "@/components/family/family-name-form";
import { KidManager } from "@/components/family/kid-manager";
import type { Child } from "@/lib/data/family";

/**
 * Presentational composition for /settings/family. Kept as a plain (non-async)
 * component so it can be rendered directly in component tests; the route's page
 * does the data fetching and passes the results in.
 */
export function FamilySettingsView({
  familyId,
  familyName,
  children,
}: {
  familyId: string;
  familyName: string;
  children: Child[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your family profile and optional kid profiles.
        </p>
      </div>

      <Card className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-slate-900">Family</h2>
        <FamilyNameForm familyId={familyId} initialName={familyName} />
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-slate-900">
          Children (optional)
        </h2>
        <KidManager familyId={familyId} initialChildren={children} />
      </Card>
    </div>
  );
}
