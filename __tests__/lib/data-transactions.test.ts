import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  countTransactionsForFamily,
  createCsvImport,
  createManualTransaction,
  createReceiptTransaction,
  getExistingDuplicateKeys,
  importCsvTransactions,
  listTransactionsForFamily,
} from "@/lib/data/transactions";
import type { TransactionDraft } from "@/lib/transactions/transaction";

const asClient = (from: unknown) => ({ from }) as unknown as SupabaseClient;

const draft: TransactionDraft = {
  merchant: "Roblox",
  description: null,
  amount: 49.99,
  transaction_date: "2026-06-11",
  raw_text: null,
};

const row = { id: "t1", ...draft, family_id: "fam1", source_type: "manual" };

describe("createManualTransaction", () => {
  it("inserts a manual transaction with a duplicate key", async () => {
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));

    const result = await createManualTransaction(asClient(from), "fam1", draft);

    expect(from).toHaveBeenCalledWith("transactions");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        family_id: "fam1",
        source_type: "manual",
        amount: 49.99,
        transaction_date: "2026-06-11",
        duplicate_key: expect.any(String),
      }),
    );
    expect(result).toEqual(row);
  });
});

describe("createReceiptTransaction", () => {
  it("inserts with source_type receipt_paste", async () => {
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));

    await createReceiptTransaction(asClient(from), "fam1", draft);

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ source_type: "receipt_paste" }),
    );
  });
});

describe("listTransactionsForFamily", () => {
  it("queries by family, newest first", async () => {
    const result = { data: [row], error: null };
    const query: Record<string, unknown> = {};
    query.eq = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.limit = vi.fn(() => query);
    (query as { then: unknown }).then = (res: (v: unknown) => unknown) =>
      Promise.resolve(result).then(res);
    const select = vi.fn(() => query);
    const from = vi.fn(() => ({ select }));

    const out = await listTransactionsForFamily(asClient(from), "fam1");

    expect(from).toHaveBeenCalledWith("transactions");
    expect(query.eq).toHaveBeenCalledWith("family_id", "fam1");
    expect(query.order).toHaveBeenCalledWith("transaction_date", {
      ascending: false,
    });
    expect(out).toEqual([row]);
  });
});

describe("countTransactionsForFamily", () => {
  it("returns the exact count", async () => {
    const eq = vi.fn().mockResolvedValue({ count: 7, error: null });
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    const n = await countTransactionsForFamily(asClient(from), "fam1");

    expect(select).toHaveBeenCalledWith("*", { count: "exact", head: true });
    expect(n).toBe(7);
  });
});

describe("getExistingDuplicateKeys", () => {
  it("returns a set of non-null keys", async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [{ duplicate_key: "k1" }, { duplicate_key: null }, { duplicate_key: "k2" }],
      error: null,
    });
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    const keys = await getExistingDuplicateKeys(asClient(from), "fam1");

    expect(keys).toEqual(new Set(["k1", "k2"]));
  });
});

describe("createCsvImport", () => {
  it("records the import summary", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "imp1" }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));

    await createCsvImport(asClient(from), "fam1", {
      fileName: "statement.csv",
      rowCount: 10,
      createdCount: 7,
      skippedCount: 2,
      failedCount: 1,
      status: "imported",
    });

    expect(from).toHaveBeenCalledWith("csv_imports");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        family_id: "fam1",
        file_name: "statement.csv",
        created_count: 7,
        skipped_count: 2,
        failed_count: 1,
        status: "imported",
      }),
    );
  });
});

describe("importCsvTransactions", () => {
  it("skips existing + in-batch duplicates, inserts the rest, records the import", async () => {
    const inserted: Record<string, unknown>[] = [];
    // One key already exists in the DB (the Roblox charge).
    const existing = [{ duplicate_key: "fam1|2026-06-11|49.99|roblox" }];

    const from = vi.fn((table: string) => {
      if (table === "transactions") {
        return {
          // getExistingDuplicateKeys: .select('duplicate_key').eq(...)
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: existing, error: null }),
          })),
          // insert(rows).select('id')
          insert: vi.fn((rows: Record<string, unknown>[]) => {
            inserted.push(...rows);
            return {
              select: vi.fn().mockResolvedValue({
                data: rows.map((_, i) => ({ id: `new-${i}` })),
                error: null,
              }),
            };
          }),
        };
      }
      // csv_imports insert().select().single()
      return {
        insert: vi.fn((rowData: Record<string, unknown>) => ({
          select: vi.fn(() => ({
            single: vi
              .fn()
              .mockResolvedValue({ data: { id: "imp1", ...rowData }, error: null }),
          })),
        })),
      };
    });

    const drafts: TransactionDraft[] = [
      { merchant: "Roblox", description: null, amount: 49.99, transaction_date: "2026-06-11" }, // existing dup
      { merchant: "Steam", description: null, amount: 9.99, transaction_date: "2026-06-11" }, // new
      { merchant: "Steam", description: null, amount: 9.99, transaction_date: "2026-06-11" }, // in-batch dup
    ];

    const summary = await importCsvTransactions(asClient(from), "fam1", {
      fileName: "statement.csv",
      rowCount: 4,
      drafts,
      failedCount: 1,
    });

    expect(summary.created).toBe(1);
    expect(summary.skipped).toBe(2);
    expect(summary.failed).toBe(1);
    expect(summary.importId).toBe("imp1");
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      source_type: "csv_upload",
      source_file_name: "statement.csv",
      merchant: "Steam",
    });
  });
});
