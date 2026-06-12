import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyForUser } from "@/lib/data/family";
import { getTransactionForFamily } from "@/lib/data/classifications";
import { classifyAndSaveTransaction } from "@/lib/ai/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  const transaction = await getTransactionForFamily(supabase, family.id, id);
  if (!transaction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const classification = await classifyAndSaveTransaction(
    supabase,
    family,
    transaction,
  );
  return NextResponse.json({ classification });
}
