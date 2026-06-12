import { MockMailProvider } from "./mock";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

export type MailResult = {
  ok: boolean;
  provider: string;
  mocked: boolean;
  id?: string;
  error?: string;
};

export interface MailProvider {
  readonly name: string;
  send(message: MailMessage): Promise<MailResult>;
}

/** "none" provider — explicitly disabled. send() is a no-op failure. */
class NoneMailProvider implements MailProvider {
  readonly name = "none";
  async send(): Promise<MailResult> {
    return { ok: false, provider: "none", mocked: true, error: "email disabled" };
  }
}

/**
 * Resolve the active mail provider. Defaults to the mock (no key, no send).
 * A real provider is only used when explicitly configured with a key — and even
 * then, Phase 6 never actually triggers a send from the app.
 */
export function resolveMailProvider(
  env: Record<string, string | undefined> = process.env,
): MailProvider {
  const choice = (env.MAIL_PROVIDER || "mock").toLowerCase();
  if (choice === "none") return new NoneMailProvider();
  // "resend" support is intentionally not wired to a real send in Phase 6.
  return new MockMailProvider();
}

/** Whether a real provider is configured (used to label the UI). */
export function isEmailEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const choice = (env.MAIL_PROVIDER || "mock").toLowerCase();
  return choice === "resend" && Boolean(env.RESEND_API_KEY);
}
