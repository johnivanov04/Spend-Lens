"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CsvUploader } from "./csv-uploader";
import { PdfUploader } from "./pdf-uploader";

type Tab = "csv" | "pdf";

export function UploadTabs({ familyId }: { familyId: string }) {
  const [tab, setTab] = useState<Tab>("csv");

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Upload type"
        className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"
      >
        <TabButton active={tab === "csv"} onClick={() => setTab("csv")}>
          CSV (preferred)
        </TabButton>
        <TabButton active={tab === "pdf"} onClick={() => setTab("pdf")}>
          PDF statement
        </TabButton>
      </div>

      {tab === "csv" ? (
        <CsvUploader familyId={familyId} />
      ) : (
        <PdfUploader familyId={familyId} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-md px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-600 hover:text-slate-900",
      )}
    >
      {children}
    </button>
  );
}
