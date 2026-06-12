import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppNav } from "@/components/app-nav";

describe("AppNav", () => {
  it("renders the primary navigation links", () => {
    render(<AppNav email="parent@example.com" />);
    for (const label of [
      "Dashboard",
      "Transactions",
      "Weekly summary",
      "Settings",
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("shows the signed-in email", () => {
    render(<AppNav email="parent@example.com" />);
    expect(screen.getByText("parent@example.com")).toBeInTheDocument();
  });

  it("renders a sign-out control that posts to the signout route", () => {
    const { container } = render(<AppNav email="parent@example.com" />);
    expect(
      screen.getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
    const form = container.querySelector("form");
    expect(form).toHaveAttribute("action", "/auth/signout");
    expect(form).toHaveAttribute("method", "post");
  });
});
