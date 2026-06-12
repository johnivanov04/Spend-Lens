import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/data/family", () => ({ getFamilyForUser: vi.fn() }));
vi.mock("@/lib/data/classifications", () => ({ getTransactionForFamily: vi.fn() }));
vi.mock("@/lib/ai/server", () => ({ classifyAndSaveTransaction: vi.fn() }));

import { POST } from "@/app/api/transactions/[id]/classify/route";
import { createClient } from "@/lib/supabase/server";
import { getFamilyForUser } from "@/lib/data/family";
import { getTransactionForFamily } from "@/lib/data/classifications";
import { classifyAndSaveTransaction } from "@/lib/ai/server";

function mockUser(user: { id: string } | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user } }) },
  } as never);
}

const req = () =>
  new Request("http://localhost/api/transactions/t1/classify", {
    method: "POST",
  });
const ctx = { params: Promise.resolve({ id: "t1" }) };

beforeEach(() => vi.clearAllMocks());

describe("POST /api/transactions/[id]/classify", () => {
  it("rejects an unauthenticated request", async () => {
    mockUser(null);
    const res = await POST(req(), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 404 for a transaction not in the user's family", async () => {
    mockUser({ id: "u1" });
    vi.mocked(getFamilyForUser).mockResolvedValue({ id: "fam1" } as never);
    vi.mocked(getTransactionForFamily).mockResolvedValue(null);
    const res = await POST(req(), ctx);
    expect(res.status).toBe(404);
  });

  it("classifies and returns the saved classification", async () => {
    mockUser({ id: "u1" });
    vi.mocked(getFamilyForUser).mockResolvedValue({ id: "fam1" } as never);
    vi.mocked(getTransactionForFamily).mockResolvedValue({ id: "t1" } as never);
    vi.mocked(classifyAndSaveTransaction).mockResolvedValue({
      id: "c1",
      needs_review: true,
    } as never);

    const res = await POST(req(), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.classification.id).toBe("c1");
    expect(classifyAndSaveTransaction).toHaveBeenCalled();
  });
});
