import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FamilyNameForm } from "@/components/family/family-name-form";
import { updateFamilyNameClient } from "@/lib/data/family-client";

vi.mock("@/lib/data/family-client", () => ({
  updateFamilyNameClient: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FamilyNameForm", () => {
  it("renders with the current family name", () => {
    render(<FamilyNameForm familyId="fam1" initialName="Garcia" />);
    expect(screen.getByLabelText("Family name")).toHaveValue("Garcia");
  });

  it("blocks saving an empty name", async () => {
    const user = userEvent.setup();
    render(<FamilyNameForm familyId="fam1" initialName="Garcia" />);

    await user.clear(screen.getByLabelText("Family name"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Please enter a family name.")).toBeInTheDocument();
    expect(updateFamilyNameClient).not.toHaveBeenCalled();
  });

  it("saves a valid name via the mocked Supabase service", async () => {
    const user = userEvent.setup();
    vi.mocked(updateFamilyNameClient).mockResolvedValue({
      id: "fam1",
      owner_user_id: "u1",
      name: "Garcia Household",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
    });
    render(<FamilyNameForm familyId="fam1" initialName="Garcia" />);

    const input = screen.getByLabelText("Family name");
    await user.clear(input);
    await user.type(input, "Garcia Household");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(updateFamilyNameClient).toHaveBeenCalledWith(
      "fam1",
      "Garcia Household",
    );
    expect(await screen.findByText("Family name saved.")).toBeInTheDocument();
  });
});
