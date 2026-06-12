import { createClient } from "@/lib/supabase/client";
import {
  addChild,
  archiveChild,
  createFamily,
  updateChild,
  updateFamilyName,
  type Child,
  type Family,
} from "@/lib/data/family";

/**
 * Thin client-side bindings: each wraps a data-layer function with the browser
 * Supabase client. Client components import these so they don't construct the
 * client themselves, which also makes them easy to mock in component tests.
 */

export function createFamilyClient(userId: string, name: string): Promise<Family> {
  return createFamily(createClient(), userId, name);
}

export function updateFamilyNameClient(
  familyId: string,
  name: string,
): Promise<Family> {
  return updateFamilyName(createClient(), familyId, name);
}

export function addChildClient(familyId: string, name: string): Promise<Child> {
  return addChild(createClient(), familyId, name);
}

export function updateChildClient(childId: string, name: string): Promise<Child> {
  return updateChild(createClient(), childId, name);
}

export function archiveChildClient(childId: string): Promise<Child> {
  return archiveChild(createClient(), childId);
}
