import { describe, expect, it } from "vitest";
import { defaultModelFor, resolveProviderName } from "@/lib/ai/providers";

describe("resolveProviderName", () => {
  it("defaults to mock", () => {
    expect(resolveProviderName({})).toBe("mock");
    expect(resolveProviderName({ AI_PROVIDER: "mock" })).toBe("mock");
  });

  it("uses a real provider only when its key is present", () => {
    expect(
      resolveProviderName({ AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "k" }),
    ).toBe("anthropic");
    expect(resolveProviderName({ AI_PROVIDER: "anthropic" })).toBe("mock");
    expect(
      resolveProviderName({ AI_PROVIDER: "openai", OPENAI_API_KEY: "k" }),
    ).toBe("openai");
    expect(resolveProviderName({ AI_PROVIDER: "openai" })).toBe("mock");
  });
});

describe("defaultModelFor", () => {
  it("returns a default model per provider", () => {
    expect(defaultModelFor("anthropic")).toBe("claude-haiku-4-5");
    expect(defaultModelFor("openai")).toBe("gpt-4o-mini");
    expect(defaultModelFor("mock")).toBeNull();
  });
});
