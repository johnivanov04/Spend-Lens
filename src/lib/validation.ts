/**
 * Pure, framework-free input validators. Returning a user-facing message (or
 * null when valid) keeps them trivially unit-testable and reusable across the
 * onboarding and settings forms.
 */

export const FAMILY_NAME_MAX = 60;
export const CHILD_NAME_MAX = 40;

/** Validate a family name. Returns an error message, or null if valid. */
export function validateFamilyName(raw: string): string | null {
  const name = raw.trim();
  if (!name) return "Please enter a family name.";
  if (name.length > FAMILY_NAME_MAX) {
    return `Family name must be ${FAMILY_NAME_MAX} characters or fewer.`;
  }
  return null;
}

/** Validate a child's first name / nickname. Returns an error message, or null. */
export function validateChildName(raw: string): string | null {
  const name = raw.trim();
  if (!name) return "Please enter a first name or nickname.";
  if (name.length > CHILD_NAME_MAX) {
    return `Name must be ${CHILD_NAME_MAX} characters or fewer.`;
  }
  return null;
}
