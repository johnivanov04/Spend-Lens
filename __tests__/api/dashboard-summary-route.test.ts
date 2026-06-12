import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/data/family", () => ({
  getFamilyForUser: vi.fn(),
  listChildren: vi.fn(),
}));
vi.mock("@/lib/data/classifications", () => ({
  listTransactionsWithClassification: vi.fn(),
}));

import { GET } from "@/app/api/dashboard/summary/route";
import { createClient } from "@/lib/supabase/server";
import { getFamilyForUser, listChildren } from "@/lib/data/family";
import { listTransactionsWithClassification } from "@/lib/data/classifications";

function mockUser(user: { id: string } | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user } }) },
  } as never);
}

const today = new Date().toISOString().slice(0, 10);

function row(id: string, date: string) {
  return {
    id,
    family_id: "fam1",
    source_type: "manual",
    merchant: "M",
    description: null,
    amount: 10,
    currency: "USD",
    transaction_date: date,
    raw_text: null,
    source_file_name: null,
    duplicate_key: null,
    created_at: `${date}T00:00:00Z`,
    updated_at: `${date}T00:00:00Z`,
    classification: null,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/dashboard/summary", () => {
  it("rejects an unauthenticated request", async () => {
    mockUser(null);
    const res = await GET(new Request("http://localhost/api/dashboard/summary"));
    expect(res.status).toBe(401);
  });

  it("returns a summary scoped to the user's own family", async () => {
    mockUser({ id: "u1" });
    vi.mocked(getFamilyForUser).mockResolvedValue({ id: "fam1" } as never);
    vi.mocked(listChildren).mockResolvedValue([] as never);
    vi.mocked(listTransactionsWithClassification).mockResolvedValue([
      row("a", today),
      row("b", "2000-01-01"),
    ] as never);

    const res = await GET(
      new Request("http://localhost/api/dashboard/summary?range=all"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary.totalTransactions).toBe(2);
    expect(listTransactionsWithClassification).toHaveBeenCalledWith(
      expect.anything(),
      "fam1",
    );
  });

  it("applies the date-range filter to the summary", async () => {
    mockUser({ id: "u1" });
    vi.mocked(getFamilyForUser).mockResolvedValue({ id: "fam1" } as never);
    vi.mocked(listChildren).mockResolvedValue([] as never);
    vi.mocked(listTransactionsWithClassification).mockResolvedValue([
      row("a", today),
      row("b", "2000-01-01"),
    ] as never);

    const res = await GET(
      new Request("http://localhost/api/dashboard/summary?range=7d"),
    );
    const body = await res.json();
    expect(body.summary.totalTransactions).toBe(1);
  });
});
