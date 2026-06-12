import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyForUser, listChildren } from "@/lib/data/family";
import { listTransactionsWithClassification } from "@/lib/data/classifications";
import {
  filterByDateRange,
  parseDateRange,
  summarizeDashboard,
} from "@/lib/analytics";

export async function GET(request: Request) {
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

  const range = parseDateRange(
    new URL(request.url).searchParams.get("range") ?? undefined,
    "30d",
  );

  // RLS scopes every read to the authenticated user's own family.
  const [rows, children] = await Promise.all([
    listTransactionsWithClassification(supabase, family.id),
    listChildren(supabase, family.id),
  ]);

  const summary = summarizeDashboard(
    filterByDateRange(rows, range),
    children.map((c) => ({ id: c.id, name: c.name })),
  );

  return NextResponse.json({ range, summary });
}
