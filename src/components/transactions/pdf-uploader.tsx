"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Button, Card } from "@/components/ui";
import { PrivacyNote } from "@/components/privacy-note";
import { CsvPreviewTable } from "./csv-preview-table";
import { importPdfTransactionsClient } from "@/lib/data/transactions-client";
import type { CsvPreview } from "@/lib/transactions/csv";
import type { CsvImportSummary } from "@/lib/data/transactions";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export function PdfUploader({ familyId }: { familyId: string }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<CsvImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function reset() {
    setFileError(null);
    setPreview(null);
    setSummary(null);
    setImportError(null);
    setRowCount(0);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    reset();
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      setFileError("Please upload a .pdf file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError("File is larger than 5 MB. Please upload a smaller statement.");
      return;
    }

    setParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/transactions/parse-pdf", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setFileError(data?.error ?? "Could not read that file.");
        return;
      }
      const data = await res.json();
      if (data.message) {
        setFileError(data.message);
        return;
      }
      setPreview(data.preview);
      setRowCount(data.rowCount ?? data.preview.rows.length);
    } catch {
      setFileError("Could not read that file.");
    } finally {
      setParsing(false);
    }
  }

  async function onImport() {
    if (!preview) return;
    setImporting(true);
    setImportError(null);
    try {
      const drafts = preview.rows
        .filter((r) => r.valid && r.draft)
        .map((r) => r.draft!);
      const result = await importPdfTransactionsClient(familyId, {
        fileName,
        rowCount,
        drafts,
        failedCount: preview.invalidCount,
      });
      setSummary(result);
    } catch {
      setImportError("Could not import the statement. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  if (summary) {
    return (
      <Card className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-slate-900">Import complete</h2>
        <ul className="text-sm text-slate-700">
          <li>Imported: {summary.created}</li>
          <li>Skipped (duplicates): {summary.skipped}</li>
          <li>Failed (unrecognized rows): {summary.failed}</li>
        </ul>
        <div className="flex gap-2">
          <Link href="/transactions">
            <Button>View transactions</Button>
          </Link>
          <Button variant="secondary" onClick={reset}>
            Upload another file
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <label htmlFor="pdf-file" className="text-sm font-medium text-slate-700">
          PDF statement
        </label>
        <input
          id="pdf-file"
          type="file"
          accept=".pdf,application/pdf"
          onChange={onFile}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
        />
        <p className="text-xs text-slate-500">
          Works best for digital statements you downloaded (not scanned images).
          Up to 5 MB. We only read transaction rows — not balances or account
          numbers.
        </p>
        <PrivacyNote>
          We read the PDF in memory to pull out transaction rows and never store
          the file itself. Only the rows you import are saved.
        </PrivacyNote>
        {parsing && (
          <p className="text-sm text-slate-500">Reading statement…</p>
        )}
        {fileError && <Alert tone="error">{fileError}</Alert>}
      </Card>

      {preview && (
        <Card className="flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            Review the detected rows before importing. Anything we couldn&apos;t
            read confidently is marked invalid and skipped.
          </p>
          <CsvPreviewTable preview={preview} />
          {importError && <Alert tone="error">{importError}</Alert>}
          <div>
            <Button
              onClick={onImport}
              disabled={importing || preview.validCount === 0}
            >
              {importing
                ? "Importing…"
                : `Import ${preview.validCount} transaction${preview.validCount === 1 ? "" : "s"}`}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
