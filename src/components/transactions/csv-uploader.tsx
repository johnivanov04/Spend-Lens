"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Button, Card } from "@/components/ui";
import { ColumnMapper } from "./column-mapper";
import { CsvPreviewTable } from "./csv-preview-table";
import {
  buildCsvPreview,
  detectCsvColumns,
  parseCsvRows,
  type CsvColumnMapping,
  type ParsedCsv,
} from "@/lib/transactions/csv";
import { importCsvTransactionsClient } from "@/lib/data/transactions-client";
import type { CsvImportSummary } from "@/lib/data/transactions";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_ROWS = 500;
const EMPTY_MAPPING: CsvColumnMapping = {
  date: null,
  merchant: null,
  description: null,
  amount: null,
};

export function CsvUploader({ familyId }: { familyId: string }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<CsvColumnMapping>(EMPTY_MAPPING);
  const [showMapper, setShowMapper] = useState(false);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<CsvImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const preview = parsed ? buildCsvPreview(parsed.rows, mapping) : null;

  function reset() {
    setFileError(null);
    setParsed(null);
    setSummary(null);
    setImportError(null);
    setMapping(EMPTY_MAPPING);
    setShowMapper(false);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    reset();
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      setFileError("Please upload a .csv file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError("File is larger than 2 MB. Please upload a smaller file.");
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      setFileError("Could not read that file.");
      return;
    }

    const p = parseCsvRows(text);
    if (p.rows.length === 0) {
      setFileError("No data rows were found in that file.");
      return;
    }
    if (p.rows.length > MAX_ROWS) {
      setFileError(
        `File has ${p.rows.length} rows; the limit is ${MAX_ROWS}. Please split it.`,
      );
      return;
    }

    const { mapping: detected, confident } = detectCsvColumns(p.headers);
    setParsed(p);
    setMapping(detected);
    setShowMapper(!confident);
  }

  async function onImport() {
    if (!preview || !parsed) return;
    setImporting(true);
    setImportError(null);
    try {
      const drafts = preview.rows
        .filter((r) => r.valid && r.draft)
        .map((r) => r.draft!);
      const result = await importCsvTransactionsClient(familyId, {
        fileName,
        rowCount: parsed.rows.length,
        drafts,
        failedCount: preview.invalidCount,
      });
      setSummary(result);
    } catch {
      setImportError("Could not import the file. Please try again.");
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
          <li>Failed (invalid rows): {summary.failed}</li>
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
        <label
          htmlFor="csv-file"
          className="text-sm font-medium text-slate-700"
        >
          CSV file
        </label>
        <input
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
        />
        <p className="text-xs text-slate-500">
          Up to 2 MB and 500 rows. We&apos;ll detect the date, amount, and
          merchant/description columns automatically.
        </p>
        {fileError && <Alert tone="error">{fileError}</Alert>}
      </Card>

      {parsed && preview && (
        <Card className="flex flex-col gap-4">
          {showMapper ? (
            <ColumnMapper
              headers={parsed.headers}
              mapping={mapping}
              onChange={setMapping}
            />
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Columns detected automatically.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMapper(true)}
              >
                Change column mapping
              </Button>
            </div>
          )}

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
