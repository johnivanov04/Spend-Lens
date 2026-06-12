import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addChild,
  archiveChild,
  createFamily,
  getFamilyForUser,
  listChildren,
  updateChild,
  updateFamilyName,
  type Child,
  type Family,
} from "@/lib/data/family";

const family: Family = {
  id: "fam1",
  owner_user_id: "u1",
  name: "Garcia",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const child: Child = {
  id: "c1",
  family_id: "fam1",
  name: "Alex",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  archived_at: null,
};

const asClient = (from: unknown) => ({ from }) as unknown as SupabaseClient;

describe("getFamilyForUser", () => {
  it("returns the family scoped by RLS", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: family, error: null });
    const limit = vi.fn(() => ({ maybeSingle }));
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));

    const result = await getFamilyForUser(asClient(from));

    expect(from).toHaveBeenCalledWith("families");
    expect(result).toEqual(family);
  });

  it("returns null when the user has no family", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const limit = vi.fn(() => ({ maybeSingle }));
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));

    expect(await getFamilyForUser(asClient(from))).toBeNull();
  });

  it("throws when Supabase returns an error", async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "boom" } });
    const limit = vi.fn(() => ({ maybeSingle }));
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));

    await expect(getFamilyForUser(asClient(from))).rejects.toBeTruthy();
  });
});

describe("createFamily", () => {
  it("inserts an owned, trimmed family", async () => {
    const single = vi.fn().mockResolvedValue({ data: family, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));

    const result = await createFamily(asClient(from), "u1", "  Garcia  ");

    expect(from).toHaveBeenCalledWith("families");
    expect(insert).toHaveBeenCalledWith({ owner_user_id: "u1", name: "Garcia" });
    expect(result).toEqual(family);
  });
});

describe("updateFamilyName", () => {
  it("updates the name of the given family", async () => {
    const single = vi.fn().mockResolvedValue({ data: family, error: null });
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));

    await updateFamilyName(asClient(from), "fam1", "Garcia Household");

    expect(update).toHaveBeenCalledWith({ name: "Garcia Household" });
    expect(eq).toHaveBeenCalledWith("id", "fam1");
  });
});

describe("listChildren", () => {
  it("excludes archived children by default", async () => {
    const order = vi.fn().mockResolvedValue({ data: [child], error: null });
    const is = vi.fn(() => ({ order }));
    const eq = vi.fn(() => ({ is, order }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    const result = await listChildren(asClient(from), "fam1");

    expect(from).toHaveBeenCalledWith("children");
    expect(eq).toHaveBeenCalledWith("family_id", "fam1");
    expect(is).toHaveBeenCalledWith("archived_at", null);
    expect(result).toEqual([child]);
  });

  it("includes archived children when asked", async () => {
    const order = vi.fn().mockResolvedValue({ data: [child], error: null });
    const is = vi.fn(() => ({ order }));
    const eq = vi.fn(() => ({ is, order }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    await listChildren(asClient(from), "fam1", { includeArchived: true });

    expect(is).not.toHaveBeenCalled();
  });
});

describe("addChild", () => {
  it("inserts a trimmed child for the family", async () => {
    const single = vi.fn().mockResolvedValue({ data: child, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));

    const result = await addChild(asClient(from), "fam1", "  Alex ");

    expect(insert).toHaveBeenCalledWith({ family_id: "fam1", name: "Alex" });
    expect(result).toEqual(child);
  });
});

describe("updateChild", () => {
  it("renames the given child", async () => {
    const single = vi.fn().mockResolvedValue({ data: child, error: null });
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));

    await updateChild(asClient(from), "c1", "Alexander");

    expect(update).toHaveBeenCalledWith({ name: "Alexander" });
    expect(eq).toHaveBeenCalledWith("id", "c1");
  });
});

describe("archiveChild", () => {
  it("soft-deletes by stamping archived_at", async () => {
    const single = vi.fn().mockResolvedValue({ data: child, error: null });
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));

    await archiveChild(asClient(from), "c1");

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ archived_at: expect.any(String) }),
    );
    expect(eq).toHaveBeenCalledWith("id", "c1");
  });
});
