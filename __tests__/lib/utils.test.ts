import { afterEach, describe, expect, it, vi } from "vitest";
import { cn, formatCurrency, isSupabaseConfigured } from "@/lib/utils";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "", "b")).toBe("a b");
  });

  it("returns an empty string when nothing is truthy", () => {
    expect(cn(false, undefined, null)).toBe("");
  });
});

describe("formatCurrency", () => {
  it("formats zero as USD", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats decimals and thousands", () => {
    expect(formatCurrency(127.45)).toBe("$127.45");
    expect(formatCurrency(1000)).toBe("$1,000.00");
  });

  it("formats refunds / negative amounts with a sign", () => {
    expect(formatCurrency(-9.99)).toBe("-$9.99");
  });
});

describe("isSupabaseConfigured", () => {
  it("is true when both public env vars are present", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    expect(isSupabaseConfigured()).toBe(true);
  });

  it("is false when env vars are missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(isSupabaseConfigured()).toBe(false);
  });
});
