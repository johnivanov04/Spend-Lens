import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CorrectionForm } from "@/components/transactions/correction-form";
import {
  createMerchantRuleClient,
  saveCorrectionClient,
} from "@/lib/data/classifications-client";

vi.mock("@/lib/data/classifications-client", () => ({
  saveCorrectionClient: vi.fn(),
  createMerchantRuleClient: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

function renderForm() {
  render(
    <CorrectionForm
      transactionId="t1"
      familyId="fam1"
      merchant="Roblox"
      description={null}
      classification={null}
      children={[{ id: "c1", name: "Alex" }]}
    />,
  );
}

describe("CorrectionForm", () => {
  it("renders the expanded correction fields", () => {
    renderForm();
    expect(screen.getByLabelText("Platform")).toBeInTheDocument();
    expect(screen.getByLabelText("Merchant family")).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByLabelText("Kid-related")).toBeInTheDocument();
    expect(screen.getByLabelText("Child")).toBeInTheDocument();
    expect(screen.getByLabelText("Note (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText(/Keep this flagged for review/)).toBeInTheDocument();
  });

  it("saves the correction with the extended fields + a merchant rule", async () => {
    const user = userEvent.setup();
    vi.mocked(saveCorrectionClient).mockResolvedValue({} as never);
    vi.mocked(createMerchantRuleClient).mockResolvedValue({} as never);
    renderForm();

    await user.type(screen.getByLabelText("Platform"), "Roblox");
    await user.type(screen.getByLabelText("Merchant family"), "Roblox Corp");
    await user.type(screen.getByLabelText("Category"), "Games");
    await user.selectOptions(screen.getByLabelText("Kid-related"), "yes");
    await user.selectOptions(screen.getByLabelText("Child"), "c1");
    await user.type(screen.getByLabelText("Note (optional)"), "My son's account");
    await user.click(screen.getByLabelText(/Remember this/));
    await user.click(screen.getByRole("button", { name: "Save correction" }));

    expect(saveCorrectionClient).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction_id: "t1",
        family_id: "fam1",
        platform: "Roblox",
        merchant_family: "Roblox Corp",
        category: "Games",
        kid_related_likelihood: "yes",
        child_id: "c1",
        explanation: "My son's account",
        needs_review: false,
      }),
    );
    expect(createMerchantRuleClient).toHaveBeenCalled();
  });
});
