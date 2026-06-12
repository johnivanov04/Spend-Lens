import { describe, expect, it } from "vitest";
import {
  CHILD_NAME_MAX,
  FAMILY_NAME_MAX,
  validateChildName,
  validateFamilyName,
} from "@/lib/validation";

describe("validateFamilyName", () => {
  it("accepts a normal name", () => {
    expect(validateFamilyName("The Garcia Family")).toBeNull();
  });

  it("rejects empty / whitespace-only input", () => {
    expect(validateFamilyName("")).toBe("Please enter a family name.");
    expect(validateFamilyName("   ")).toBe("Please enter a family name.");
  });

  it("rejects names over the max length", () => {
    expect(validateFamilyName("a".repeat(FAMILY_NAME_MAX + 1))).toMatch(
      /60 characters or fewer/,
    );
  });

  it("accepts a name exactly at the max length", () => {
    expect(validateFamilyName("a".repeat(FAMILY_NAME_MAX))).toBeNull();
  });
});

describe("validateChildName", () => {
  it("accepts a first name or nickname", () => {
    expect(validateChildName("Alex")).toBeNull();
  });

  it("rejects empty / whitespace-only input", () => {
    expect(validateChildName("")).toBe(
      "Please enter a first name or nickname.",
    );
    expect(validateChildName("  ")).toBe(
      "Please enter a first name or nickname.",
    );
  });

  it("rejects names over the max length", () => {
    expect(validateChildName("a".repeat(CHILD_NAME_MAX + 1))).toMatch(
      /40 characters or fewer/,
    );
  });
});
