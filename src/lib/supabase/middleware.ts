import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthRedirect } from "@/lib/auth-routes";

/**
 * Refreshes the Supabase session cookie on every request and enforces route
 * protection. If Supabase env vars are not configured yet, auth handling is
 * skipped so public pages still render during local setup.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return supabaseResponse;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: getUser() must be called to refresh the token. Do not run logic
  // between createServerClient and getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirect = getAuthRedirect(request.nextUrl.pathname, Boolean(user));
  if (redirect) {
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  return supabaseResponse;
}
