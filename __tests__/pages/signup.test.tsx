import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SignupPage from "@/app/signup/page";

describe("Signup page", () => {
  it("renders the create-account heading", () => {
    render(<SignupPage />);
    expect(
      screen.getByRole("heading", { name: "Create your account" }),
    ).toBeInTheDocument();
  });

  it("renders email and password fields and a submit button", () => {
    render(<SignupPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeInTheDocument();
  });

  it("links to the login page", () => {
    render(<SignupPage />);
    const link = screen.getByRole("link", { name: "Log in" });
    expect(link).toHaveAttribute("href", "/login");
  });
});
