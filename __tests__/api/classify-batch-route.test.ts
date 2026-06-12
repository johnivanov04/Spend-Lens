import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/data/family", () => ({ getFamilyForUser: vi.fn() }));
vi.mock("@/lib/data/classifications", () => ({
  getTransactionsByIds: vi.fn(),
  listUnclassifiedTransactions: vi.fn(),
}));
vi.mock("@/lib/ai/server", () => ({ classifyAndSaveTransaction: vi.fn() }));

import { POST } from "@/app/api/transactions/classify-batch/route";
import { createClient } from "@/lib/supabase/server";
import { getFamilyForUser } from "@/lib/data/family";
import { listUnclassifiedTransactions } from "@/lib/data/classifications";
import { classifyAndSaveTransaction } from "@/lib/ai/server";

function mockUser(user: { id: string } | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user } }) },
  } as never);
}

const req = (body: unknown = {}) =>
  new Request("http://localhost/api/transactions/classify-batch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => vi.clearAllMocks());

describe("POST /api/transactions/classify-batch", () => {
  it("rejects an unauthenticated request", async () => {
    mockUser(null);
    const res = await POST(req());
    expect(res.status).toBe(401);
  });

  it("continues after one item fails and returns a summary", async () => {
    mockUser({ id: "u1" });
    vi.mocked(getFamilyForUser).mockResolvedValue({ id: "fam1" } as never);
    vi.mocked(listUnclassifiedTransactions).mockResolvedValue([
      { id: "t1" },
      { id: "t2" },
      { id: "t3" },
    ] as never);
    vi.mocked(classifyAndSaveTransaction).mockImplementation(
      async (_supabase, _family, transaction: { id: string }) => {
        if (transaction.id === "t2") throw new Error("provider down");
        return { needs_review: transaction.id === "t3" } as never;
      },
    );

    const res = await POST(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      classified_count: 2,
      needs_review_count: 1,
      failed_count: 1,
    });
  });
});
