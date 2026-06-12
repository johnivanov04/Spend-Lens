import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Alert, Button } from "@/components/ui";

describe("Button", () => {
  it("renders its children as a button", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("can be disabled", () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("applies the secondary variant styles", () => {
    render(<Button variant="secondary">Cancel</Button>);
    expect(screen.getByRole("button", { name: "Cancel" }).className).toContain(
      "border",
    );
  });
});

describe("Alert", () => {
  it("uses role=alert for errors", () => {
    render(<Alert tone="error">Something went wrong</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("uses role=status for non-error tones", () => {
    render(<Alert tone="success">Saved</Alert>);
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });
});
