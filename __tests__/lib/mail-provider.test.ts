import { describe, expect, it } from "vitest";
import { isEmailEnabled, resolveMailProvider } from "@/lib/mail/provider";
import { MockMailProvider } from "@/lib/mail/mock";

describe("resolveMailProvider", () => {
  it("defaults to the mock provider", () => {
    expect(resolveMailProvider({}).name).toBe("mock");
    expect(resolveMailProvider({ MAIL_PROVIDER: "resend" }).name).toBe("mock");
  });

  it("returns the disabled provider when set to none", () => {
    expect(resolveMailProvider({ MAIL_PROVIDER: "none" }).name).toBe("none");
  });
});

describe("MockMailProvider", () => {
  it("returns a mocked success without sending", async () => {
    const result = await new MockMailProvider().send({
      to: "parent@example.com",
      subject: "Weekly summary",
      text: "…",
    });
    expect(result).toMatchObject({ ok: true, provider: "mock", mocked: true });
  });
});

describe("isEmailEnabled", () => {
  it("is only enabled for a real provider with a key", () => {
    expect(isEmailEnabled({})).toBe(false);
    expect(isEmailEnabled({ MAIL_PROVIDER: "resend" })).toBe(false);
    expect(
      isEmailEnabled({ MAIL_PROVIDER: "resend", RESEND_API_KEY: "k" }),
    ).toBe(true);
  });
});
