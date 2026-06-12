import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FamilySettingsView } from "@/components/family/family-settings-view";

// The view composes client components that call the Supabase-backed service;
// stub it so the view renders without a real client.
vi.mock("@/lib/data/family-client", () => ({
  updateFamilyNameClient: vi.fn(),
  addChildClient: vi.fn(),
  updateChildClient: vi.fn(),
  archiveChildClient: vi.fn(),
}));

describe("FamilySettingsView", () => {
  it("renders the family and children sections", () => {
    render(
      <FamilySettingsView familyId="fam1" familyName="Garcia" children={[]} />,
    );

    expect(
      screen.getByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Family" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Children (optional)" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Family name")).toHaveValue("Garcia");
    expect(
      screen.getByText(/You can add child profiles later/i),
    ).toBeInTheDocument();
  });
});
