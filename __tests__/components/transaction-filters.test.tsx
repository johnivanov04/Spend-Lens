import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/transactions",
  useSearchParams: () => new URLSearchParams(),
}));

import { TransactionFilters } from "@/components/transactions/transaction-filters";

const facets = {
  categories: ["Games"],
  platforms: ["Roblox"],
  children: [{ id: "c1", name: "Alex" }],
};

beforeEach(() => push.mockClear());

describe("TransactionFilters", () => {
  it("renders search + filter controls", () => {
    render(<TransactionFilters values={{}} facets={facets} />);
    expect(
      screen.getByLabelText("Search merchant or description"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByLabelText("Platform")).toBeInTheDocument();
  });

  it("pushes a query string when Apply is clicked", async () => {
    const user = userEvent.setup();
    render(<TransactionFilters values={{}} facets={facets} />);

    await user.type(
      screen.getByLabelText("Search merchant or description"),
      "roblox",
    );
    await user.selectOptions(screen.getByLabelText("Status"), "needs_review");
    await user.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(push).toHaveBeenCalledTimes(1);
    const url = push.mock.calls[0][0] as string;
    expect(url).toContain("q=roblox");
    expect(url).toContain("status=needs_review");
  });
});
