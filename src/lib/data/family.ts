import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Data-access layer for families + children. Every function takes a Supabase
 * client (browser or server) so it works on either side and is unit-testable
 * with a mocked client. Row Level Security scopes all reads/writes to the
 * authenticated user's own family.
 */

export type Family = {
  id: string;
  owner_user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type Child = {
  id: string;
  family_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

/** The current user's family, or null if they haven't created one yet. */
export async function getFamilyForUser(
  supabase: SupabaseClient,
): Promise<Family | null> {
  const { data, error } = await supabase
    .from("families")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Family | null) ?? null;
}

/** Create the family owned by `userId`. */
export async function createFamily(
  supabase: SupabaseClient,
  userId: string,
  name: string,
): Promise<Family> {
  const { data, error } = await supabase
    .from("families")
    .insert({ owner_user_id: userId, name: name.trim() })
    .select()
    .single();
  if (error) throw error;
  return data as Family;
}

/** Rename a family. */
export async function updateFamilyName(
  supabase: SupabaseClient,
  familyId: string,
  name: string,
): Promise<Family> {
  const { data, error } = await supabase
    .from("families")
    .update({ name: name.trim() })
    .eq("id", familyId)
    .select()
    .single();
  if (error) throw error;
  return data as Family;
}

/** List a family's children. Archived children are excluded by default. */
export async function listChildren(
  supabase: SupabaseClient,
  familyId: string,
  { includeArchived = false }: { includeArchived?: boolean } = {},
): Promise<Child[]> {
  let query = supabase
    .from("children")
    .select("*")
    .eq("family_id", familyId);
  if (!includeArchived) {
    query = query.is("archived_at", null);
  }
  const { data, error } = await query.order("created_at", { ascending: true });
  if (error) throw error;
  return (data as Child[]) ?? [];
}

/** Add a child (first name / nickname only). */
export async function addChild(
  supabase: SupabaseClient,
  familyId: string,
  name: string,
): Promise<Child> {
  const { data, error } = await supabase
    .from("children")
    .insert({ family_id: familyId, name: name.trim() })
    .select()
    .single();
  if (error) throw error;
  return data as Child;
}

/** Rename a child. */
export async function updateChild(
  supabase: SupabaseClient,
  childId: string,
  name: string,
): Promise<Child> {
  const { data, error } = await supabase
    .from("children")
    .update({ name: name.trim() })
    .eq("id", childId)
    .select()
    .single();
  if (error) throw error;
  return data as Child;
}

/** Soft-delete (archive) a child by stamping archived_at. */
export async function archiveChild(
  supabase: SupabaseClient,
  childId: string,
): Promise<Child> {
  const { data, error } = await supabase
    .from("children")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", childId)
    .select()
    .single();
  if (error) throw error;
  return data as Child;
}
