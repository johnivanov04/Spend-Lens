import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getFamilyForUser, type Family } from "@/lib/data/family";

/**
 * Resolve the authenticated user's family for a server component. The (app)
 * layout already gates on this, but resolving it here gives each page the
 * `family_id` it needs and stays safe if reached directly.
 */
export async function requireFamilyContext(): Promise<{
  supabase: SupabaseClient;
  family: Family;
}> {
  const supabase = await createClient();
  const family = await getFamilyForUser(supabase);
  if (!family) redirect("/onboarding");
  return { supabase, family };
}
