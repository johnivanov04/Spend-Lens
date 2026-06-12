import { describe, expect, it } from "vitest";
import {
  AUTH_PAGES,
  getAuthRedirect,
  isProtectedRoute,
  PROTECTED_PREFIXES,
} from "@/lib/auth-routes";

describe("isProtectedRoute", () => {
  it("treats each protected prefix and its children as protected", () => {
    for (const prefix of PROTECTED_PREFIXES) {
      expect(isProtectedRoute(prefix)).toBe(true);
      expect(isProtectedRoute(`${prefix}/anything`)).toBe(true);
    }
  });

  it("does not protect public routes", () => {
    expect(isProtectedRoute("/")).toBe(false);
    expect(isProtectedRoute("/login")).toBe(false);
    expect(isProtectedRoute("/signup")).toBe(false);
    expect(isProtectedRoute("/pricing")).toBe(false);
  });

  it("does not protect lookalike prefixes", () => {
    expect(isProtectedRoute("/dashboards")).toBe(false);
    expect(isProtectedRoute("/settings-help")).toBe(false);
  });
});

describe("getAuthRedirect", () => {
  it("sends an unauthenticated user from a protected route to login with next", () => {
    expect(getAuthRedirect("/dashboard", false)).toBe(
      "/login?next=%2Fdashboard",
    );
    expect(getAuthRedirect("/transactions/new", false)).toBe(
      "/login?next=%2Ftransactions%2Fnew",
    );
  });

  it("sends an authenticated user away from auth pages to the dashboard", () => {
    for (const page of AUTH_PAGES) {
      expect(getAuthRedirect(page, true)).toBe("/dashboard");
    }
  });

  it("does not redirect an authenticated user on a protected route", () => {
    expect(getAuthRedirect("/dashboard", true)).toBeNull();
  });

  it("does not redirect an unauthenticated user on a public route", () => {
    expect(getAuthRedirect("/", false)).toBeNull();
    expect(getAuthRedirect("/login", false)).toBeNull();
  });
});
