import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import LoginPage from "@/app/login/page";

describe("Login page", () => {
  it("renders the welcome heading", () => {
    render(<LoginPage />);
    expect(
      screen.getByRole("heading", { name: "Welcome back" }),
    ).toBeInTheDocument();
  });

  it("renders email and password fields and a submit button", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
  });

  it("links to the signup page", () => {
    render(<LoginPage />);
    const link = screen.getByRole("link", { name: "Sign up" });
    expect(link).toHaveAttribute("href", "/signup");
  });
});
