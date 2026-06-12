import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KidManager } from "@/components/family/kid-manager";
import type { Child } from "@/lib/data/family";
import {
  addChildClient,
  archiveChildClient,
  updateChildClient,
} from "@/lib/data/family-client";

// Mock the Supabase-backed client service. The data layer's real Supabase calls
// are covered separately in __tests__/lib/data-family.test.ts.
vi.mock("@/lib/data/family-client", () => ({
  addChildClient: vi.fn(),
  updateChildClient: vi.fn(),
  archiveChildClient: vi.fn(),
}));

function makeChild(over: Partial<Child> = {}): Child {
  return {
    id: "c1",
    family_id: "fam1",
    name: "Alex",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    archived_at: null,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("KidManager", () => {
  it("shows the empty state and privacy copy when there are no children", () => {
    render(<KidManager familyId="fam1" initialChildren={[]} />);
    expect(
      screen.getByText(/You can add child profiles later/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Use first names or nicknames only/i),
    ).toBeInTheDocument();
  });

  it("validates that a child name is required", async () => {
    const user = userEvent.setup();
    render(<KidManager familyId="fam1" initialChildren={[]} />);

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(
      screen.getByText("Please enter a first name or nickname."),
    ).toBeInTheDocument();
    expect(addChildClient).not.toHaveBeenCalled();
  });

  it("adds a child via the mocked Supabase service", async () => {
    const user = userEvent.setup();
    vi.mocked(addChildClient).mockResolvedValue(
      makeChild({ id: "c2", name: "Sam" }),
    );
    render(<KidManager familyId="fam1" initialChildren={[]} />);

    await user.type(screen.getByLabelText("Add a child"), "Sam");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(addChildClient).toHaveBeenCalledWith("fam1", "Sam");
    expect(await screen.findByText("Sam")).toBeInTheDocument();
  });

  it("edits a child via the mocked Supabase service", async () => {
    const user = userEvent.setup();
    vi.mocked(updateChildClient).mockResolvedValue(
      makeChild({ name: "Alexander" }),
    );
    render(<KidManager familyId="fam1" initialChildren={[makeChild()]} />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const input = screen.getByLabelText("Edit child name");
    await user.clear(input);
    await user.type(input, "Alexander");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(updateChildClient).toHaveBeenCalledWith("c1", "Alexander");
    expect(await screen.findByText("Alexander")).toBeInTheDocument();
  });

  it("archives a child via the mocked Supabase service", async () => {
    const user = userEvent.setup();
    vi.mocked(archiveChildClient).mockResolvedValue(
      makeChild({ archived_at: "2026-02-01T00:00:00Z" }),
    );
    render(<KidManager familyId="fam1" initialChildren={[makeChild()]} />);

    expect(screen.getByText("Alex")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Archive" }));

    expect(archiveChildClient).toHaveBeenCalledWith("c1");
    await waitFor(() =>
      expect(screen.queryByText("Alex")).not.toBeInTheDocument(),
    );
  });
});
