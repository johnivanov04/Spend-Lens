import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingFlow } from "@/app/onboarding/onboarding-flow";
import { createFamilyClient } from "@/lib/data/family-client";

vi.mock("@/lib/data/family-client", () => ({
  createFamilyClient: vi.fn(),
  addChildClient: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OnboardingFlow", () => {
  it("renders step 1 (create family)", () => {
    render(<OnboardingFlow userId="u1" />);
    expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Family name")).toBeInTheDocument();
    expect(
      screen.getByText(/Spend Lens is for parents, not children/i),
    ).toBeInTheDocument();
  });

  it("validates the family name", async () => {
    const user = userEvent.setup();
    render(<OnboardingFlow userId="u1" />);

    await user.click(screen.getByRole("button", { name: "Create family" }));

    expect(screen.getByText("Please enter a family name.")).toBeInTheDocument();
    expect(createFamilyClient).not.toHaveBeenCalled();
  });

  it("creates the family and advances to step 2 (add children)", async () => {
    const user = userEvent.setup();
    vi.mocked(createFamilyClient).mockResolvedValue({
      id: "fam1",
      owner_user_id: "u1",
      name: "Garcia",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });
    render(<OnboardingFlow userId="u1" />);

    await user.type(screen.getByLabelText("Family name"), "Garcia");
    await user.click(screen.getByRole("button", { name: "Create family" }));

    expect(createFamilyClient).toHaveBeenCalledWith("u1", "Garcia");
    expect(await screen.findByText(/Step 2 of 3/i)).toBeInTheDocument();
    // Kid profile form is available on step 2.
    expect(screen.getByLabelText("Add a child")).toBeInTheDocument();
    expect(
      screen.getByText(/You can add child profiles later/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue to dashboard" }),
    ).toBeInTheDocument();
  });
});
