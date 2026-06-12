import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/data/family", () => ({
  getFamilyForUser: vi.fn(),
  listChildren: vi.fn(),
}));
vi.mock("@/lib/data/classifications", () => ({
  listTransactionsWithClassification: vi.fn(),
}));
vi.mock("@/lib/data/weekly-summaries", () => ({
  createWeeklySummaryPreview: vi.fn(),
}));

import { POST } from "@/app/api/summary/weekly/preview/route";
import { createClient } from "@/lib/supabase/server";
import { getFamilyForUser, listChildren } from "@/lib/data/family";
import { listTransactionsWithClassification } from "@/lib/data/classifications";
import { createWeeklySummaryPreview } from "@/lib/data/weekly-summaries";

function mockUser(user: { id: string } | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user } }) },
  } as never);
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/summary/weekly/preview", () => {
  it("rejects an unauthenticated request", async () => {
    mockUser(null);
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("generates + saves a preview from the user's own family data", async () => {
    mockUser({ id: "u1" });
    vi.mocked(getFamilyForUser).mockResolvedValue({ id: "fam1" } as never);
    vi.mocked(listChildren).mockResolvedValue([] as never);
    vi.mocked(listTransactionsWithClassification).mockResolvedValue([] as never);
    vi.mocked(createWeeklySummaryPreview).mockResolvedValue({ id: "w1" } as never);

    const res = await POST();
    expect(res.status).toBe(200);

    // reads only this family's data
    expect(listTransactionsWithClassification).toHaveBeenCalledWith(
      expect.anything(),
      "fam1",
    );
    // saves a safe empty summary when there are no transactions
    expect(createWeeklySummaryPreview).toHaveBeenCalledWith(
      expect.anything(),
      "fam1",
      expect.objectContaining({
        summary_json: expect.objectContaining({ totalTransactions: 0, state: "no_transactions" }),
      }),
    );
    const body = await res.json();
    expect(body.summary.id).toBe("w1");
  });
});
