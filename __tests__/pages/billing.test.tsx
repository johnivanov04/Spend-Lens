import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import BillingSettingsPage from "@/app/(app)/settings/billing/page";

describe("Billing settings page", () => {
  it("shows the beta billing placeholder and a pricing link", () => {
    render(<BillingSettingsPage />);
    expect(
      screen.getByRole("heading", { name: "Billing" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Billing is not enabled yet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View pricing" }),
    ).toHaveAttribute("href", "/pricing");
  });
});
