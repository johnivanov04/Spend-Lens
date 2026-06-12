import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFamilyForUser } from "@/lib/data/family";
import { extractPdfText } from "@/lib/transactions/pdf-extract";
import {
  convertPdfRowsToTransactionPreview,
  parsePdfStatementText,
} from "@/lib/transactions/pdf";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const SCANNED_MESSAGE =
  "This PDF appears to be scanned or image-only. Spend Lens can't read it yet. Try exporting a CSV or downloading a digital statement.";

/**
 * Parse a text-based PDF bank statement into a transaction preview. The PDF is
 * read in-memory and discarded — it is never stored, never sent to an external
 * service, and no AI is used. Authenticated + family-scoped.
 */
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

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
    return NextResponse.json({ error: "Please upload a .pdf file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File is larger than 5 MB. Please upload a smaller statement." },
      { status: 400 },
    );
  }

  let text: string;
  try {
    text = await extractPdfText(new Uint8Array(await file.arrayBuffer()));
  } catch {
    return NextResponse.json({ message: SCANNED_MESSAGE });
  }
  if (!text) {
    return NextResponse.json({ message: SCANNED_MESSAGE });
  }

  const { rows, format } = parsePdfStatementText(text);
  const preview = convertPdfRowsToTransactionPreview(rows);
  if (preview.rows.length === 0) {
    return NextResponse.json({
      message:
        "We couldn't find transaction rows in that PDF. It may use a layout we don't recognize yet — try a CSV export from your bank.",
    });
  }

  return NextResponse.json({ preview, format, rowCount: rows.length });
}
