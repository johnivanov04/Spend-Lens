import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/data/family", () => ({ getFamilyForUser: vi.fn() }));
vi.mock("@/lib/transactions/pdf-extract", () => ({ extractPdfText: vi.fn() }));

import { POST } from "@/app/api/transactions/parse-pdf/route";
import { createClient } from "@/lib/supabase/server";
import { getFamilyForUser } from "@/lib/data/family";
import { extractPdfText } from "@/lib/transactions/pdf-extract";

function mockUser(user: { id: string } | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user } }) },
  } as never);
}

// Avoid undici/jsdom FormData round-trip: hand the route a real FormData directly.
function pdfRequest() {
  const fd = new FormData();
  fd.append(
    "file",
    new File([new Uint8Array([1, 2, 3])], "statement.pdf", {
      type: "application/pdf",
    }),
  );
  return { formData: async () => fd } as unknown as Request;
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/transactions/parse-pdf", () => {
  it("rejects an unauthenticated request", async () => {
    mockUser(null);
    const res = await POST({ formData: async () => new FormData() } as never);
    expect(res.status).toBe(401);
  });

  it("returns the scanned/image-only message for PDFs with no text", async () => {
    mockUser({ id: "u1" });
    vi.mocked(getFamilyForUser).mockResolvedValue({ id: "fam1" } as never);
    vi.mocked(extractPdfText).mockResolvedValue("");

    const res = await POST(pdfRequest());
    const body = await res.json();
    expect(body.message).toMatch(/scanned or image-only/i);
    expect(body.preview).toBeUndefined();
  });

  it("returns a preview for a text PDF, scoped to the user's family", async () => {
    mockUser({ id: "u1" });
    vi.mocked(getFamilyForUser).mockResolvedValue({ id: "fam1" } as never);
    vi.mocked(extractPdfText).mockResolvedValue(
      "06/11/2026 ROBLOX.COM 9.99\n06/12/2026 NETFLIX.COM 15.49",
    );

    const res = await POST(pdfRequest());
    const body = await res.json();
    expect(body.preview.validCount).toBe(2);
    expect(body.rowCount).toBe(2);
    expect(getFamilyForUser).toHaveBeenCalled();
  });
});
