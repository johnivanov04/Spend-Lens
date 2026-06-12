import type { MailMessage, MailProvider, MailResult } from "./provider";

/**
 * Mock mail provider. Never sends anything over the network — it just returns a
 * success result so the rest of the app can be exercised without an email
 * provider configured. This is the default in Phase 6.
 */
export class MockMailProvider implements MailProvider {
  readonly name = "mock";

  async send(_message: MailMessage): Promise<MailResult> {
    return {
      ok: true,
      provider: "mock",
      mocked: true,
      id: `mock-${Date.now()}`,
    };
  }
}
