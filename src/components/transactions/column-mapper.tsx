"use client";

import { Label, Select } from "@/components/ui";
import type { CsvColumnMapping } from "@/lib/transactions/csv";

const FIELDS: { key: keyof CsvColumnMapping; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "amount", label: "Amount" },
  { key: "merchant", label: "Merchant" },
  { key: "description", label: "Description" },
];

export function ColumnMapper({
  headers,
  mapping,
  onChange,
}: {
  headers: string[];
  mapping: CsvColumnMapping;
  onChange: (mapping: CsvColumnMapping) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-sm font-medium text-slate-900">Map your columns</p>
      <p className="mt-1 text-xs text-slate-500">
        We need a date, an amount, and a merchant or description. Match each to a
        column from your file.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-1.5">
            <Label htmlFor={`map-${field.key}`}>{field.label}</Label>
            <Select
              id={`map-${field.key}`}
              aria-label={`Map ${field.label} column`}
              value={mapping[field.key] ?? ""}
              onChange={(e) =>
                onChange({ ...mapping, [field.key]: e.target.value || null })
              }
            >
              <option value="">— none —</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
