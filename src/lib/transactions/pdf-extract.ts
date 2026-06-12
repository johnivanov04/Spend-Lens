import { getDocumentProxy } from "unpdf";

type TextItem = { str?: string; transform?: number[] };

/**
 * Extract text from a PDF, server-side and in-memory, reconstructing physical
 * lines from the text items' positions. Bank statements are column tables, so a
 * naive flat extraction collapses every transaction onto one line; grouping
 * items by their Y coordinate rebuilds one line per row.
 *
 * The PDF is never stored, never sent to an external service, and no AI is used.
 * Returns "" for image-only / scanned PDFs (no extractable text), which the
 * caller turns into a clear error.
 */
export async function extractPdfText(data: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(data);
  const lines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const items = (content.items as TextItem[])
      .filter(
        (it): it is { str: string; transform: number[] } =>
          typeof it.str === "string" &&
          it.str.length > 0 &&
          Array.isArray(it.transform),
      )
      .map((it) => ({ x: it.transform[4], y: it.transform[5], s: it.str }));

    // Top-to-bottom (y descending), then left-to-right (x ascending).
    items.sort((a, b) => (Math.abs(a.y - b.y) > 2 ? b.y - a.y : a.x - b.x));

    let current: typeof items = [];
    let lastY: number | null = null;
    for (const it of items) {
      if (lastY !== null && Math.abs(it.y - lastY) > 3) {
        lines.push(joinLine(current));
        current = [];
      }
      current.push(it);
      lastY = it.y;
    }
    if (current.length > 0) lines.push(joinLine(current));
  }

  return lines
    .filter((l) => l.length > 0)
    .join("\n")
    .trim();
}

function joinLine(items: { s: string }[]): string {
  return items
    .map((i) => i.s)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
