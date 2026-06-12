import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyForUser } from "@/lib/data/family";
import {
  getTransactionsByIds,
  listUnclassifiedTransactions,
} from "@/lib/data/classifications";
import { classifyAndSaveTransaction } from "@/lib/ai/server";
import { classifyBatch } from "@/lib/ai/batch";

const MAX_BATCH = 50;

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const family = await getFamilyForUser(supabase);
  if (!family) {
    return NextResponse.json({ error: "No family" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const ids: unknown = body?.transactionIds;

  const targets =
    Array.isArray(ids) && ids.length > 0
      ? await getTransactionsByIds(supabase, family.id, ids.slice(0, MAX_BATCH))
      : await listUnclassifiedTransactions(supabase, family.id, MAX_BATCH);

  const summary = await classifyBatch(targets, (transaction) =>
    classifyAndSaveTransaction(supabase, family, transaction),
  );

  return NextResponse.json(summary);
}
