import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFamilyForUser, listChildren } from "@/lib/data/family";
import { FamilySettingsView } from "@/components/family/family-settings-view";

export default async function FamilySettingsPage() {
  const supabase = await createClient();
  const family = await getFamilyForUser(supabase);
  // The (app) layout already redirects users without a family to onboarding,
  // but guard here too so this page never renders without one.
  if (!family) redirect("/onboarding");

  const children = await listChildren(supabase, family.id);

  return (
    <FamilySettingsView
      familyId={family.id}
      familyName={family.name}
      children={children}
    />
  );
}
