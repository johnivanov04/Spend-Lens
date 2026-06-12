import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PricingPage from "@/app/pricing/page";

describe("Pricing page", () => {
  it("shows beta status and the planned price", () => {
    render(<PricingPage />);
    expect(
      screen.getByRole("heading", { name: /Simple pricing for early access/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Free during beta/i)).toBeInTheDocument();
    expect(screen.getByText(/\$10–\$20/)).toBeInTheDocument();
  });

  it("has an early-access CTA and no fake checkout", () => {
    render(<PricingPage />);
    expect(
      screen.getByRole("link", { name: "Start with the free beta" }),
    ).toHaveAttribute("href", "/signup");
    expect(screen.getByText(/No checkout yet/i)).toBeInTheDocument();
  });

  it("sets honest expectations and shows privacy copy", () => {
    render(<PricingPage />);
    expect(
      screen.getByText(
        /prevent spending, connect to your bank, or catch everything/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/never ask for bank logins or full card numbers/i),
    ).toBeInTheDocument();
  });
});
