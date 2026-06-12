import { extractText, getDocumentProxy } from "unpdf";

/**
 * Extract text from a PDF, server-side and in-memory. The PDF is never stored
 * and never sent to an external service. Returns "" for image-only / scanned
 * PDFs (no extractable text), which the caller turns into a clear error.
 */
export async function extractPdfText(data: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(data);
  const { text } = await extractText(pdf, { mergePages: true });
  const merged = Array.isArray(text) ? text.join("\n") : text;
  return (merged ?? "").trim();
}
