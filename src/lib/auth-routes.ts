/**
 * Pure, framework-free route-protection rules. Kept separate from the Supabase
 * middleware (which imports `next/server`) so the logic is easy to unit test.
 */

/** Route prefixes that require an authenticated session. */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/transactions",
  "/settings",
  "/onboarding",
  "/summary",
];

/** Auth pages a signed-in user should be bounced away from. */
export const AUTH_PAGES = ["/login", "/signup"];

/** Whether a path requires authentication. */
export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Decide where (if anywhere) to redirect based on path + auth state.
 *
 * - Unauthenticated user on a protected route -> /login (carrying `next`).
 * - Authenticated user on an auth page -> /dashboard.
 * - Otherwise -> null (no redirect).
 */
export function getAuthRedirect(
  pathname: string,
  hasUser: boolean,
): string | null {
  if (!hasUser && isProtectedRoute(pathname)) {
    return `/login?next=${encodeURIComponent(pathname)}`;
  }
  if (hasUser && AUTH_PAGES.includes(pathname)) {
    return "/dashboard";
  }
  return null;
}
