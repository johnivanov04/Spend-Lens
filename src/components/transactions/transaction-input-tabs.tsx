"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui";
import { ManualTransactionForm } from "./manual-transaction-form";
import { ReceiptPasteForm } from "./receipt-paste-form";

type Tab = "manual" | "receipt";

export function TransactionInputTabs({ familyId }: { familyId: string }) {
  const [tab, setTab] = useState<Tab>("manual");

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Add a transaction"
        className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"
      >
        <TabButton active={tab === "manual"} onClick={() => setTab("manual")}>
          Manual entry
        </TabButton>
        <TabButton active={tab === "receipt"} onClick={() => setTab("receipt")}>
          Paste receipt
        </TabButton>
      </div>

      <Card>
        {tab === "manual" ? (
          <ManualTransactionForm familyId={familyId} />
        ) : (
          <ReceiptPasteForm familyId={familyId} />
        )}
      </Card>
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
