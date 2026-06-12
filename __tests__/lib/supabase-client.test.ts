import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Verifies the browser Supabase client is wired correctly: with env vars present
 * it constructs without throwing and exposes `auth`. No real network calls are
 * made (createBrowserClient does not hit the network on construction).
 */
describe("supabase browser client", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("creates a client without crashing when env vars are mocked", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const client = createClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(typeof client.from).toBe("function");
  });
});
