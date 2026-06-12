import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppError from "@/app/(app)/error";
import AppLoading from "@/app/(app)/loading";
import NotFound from "@/app/not-found";
import { PrivacyNote } from "@/components/privacy-note";

describe("PrivacyNote", () => {
  it("renders its message", () => {
    render(<PrivacyNote>Use nicknames for kids.</PrivacyNote>);
    expect(screen.getByText("Use nicknames for kids.")).toBeInTheDocument();
  });
});

describe("AppError boundary", () => {
  it("renders a calm message and retries", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<AppError error={new Error("boom")} reset={reset} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText(/Supabase migrations/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalled();
  });
});

describe("AppLoading", () => {
  it("renders a busy skeleton", () => {
    const { container } = render(<AppLoading />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });
});

describe("NotFound", () => {
  it("renders a 404 with a link home", () => {
    render(<NotFound />);
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back home" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
