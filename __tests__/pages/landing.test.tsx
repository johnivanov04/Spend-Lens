import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("Landing page", () => {
  it("renders the hero headline", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", {
        name: "Decode confusing kid-related digital spending",
      }),
    ).toBeInTheDocument();
  });

  it("links to signup and login", () => {
    render(<Home />);
    const signupLinks = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href") === "/signup");
    const loginLinks = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href") === "/login");
    expect(signupLinks.length).toBeGreaterThan(0);
    expect(loginLinks.length).toBeGreaterThan(0);
  });

  it("reassures parents about privacy", () => {
    render(<Home />);
    expect(
      screen.getByText(/never ask for full card numbers/i),
    ).toBeInTheDocument();
  });
});
