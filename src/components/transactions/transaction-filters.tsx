"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Select } from "@/components/ui";
import type { ChildRef } from "@/lib/ai/schema";

export type FilterValues = {
  q?: string;
  status?: string;
  category?: string;
  platform?: string;
  child?: string;
  confidence?: string;
  source?: string;
  sort?: string;
  dir?: string;
};

export type FilterFacets = {
  categories: string[];
  platforms: string[];
  children: ChildRef[];
};

export function TransactionFilters({
  values,
  facets,
}: {
  values: FilterValues;
  facets: FilterFacets;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<FilterValues>(values);

  function update(key: keyof FilterValues, value: string) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    const keys: (keyof FilterValues)[] = [
      "q",
      "status",
      "category",
      "platform",
      "child",
      "confidence",
      "source",
      "sort",
      "dir",
    ];
    for (const key of keys) {
      const value = (state[key] ?? "").trim();
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function clear() {
    const params = new URLSearchParams(searchParams);
    for (const key of [
      "q",
      "status",
      "category",
      "platform",
      "child",
      "confidence",
      "source",
      "sort",
      "dir",
    ]) {
      params.delete(key);
    }
    setState({});
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <form
      onSubmit={apply}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className="flex flex-wrap gap-3">
        <Input
          aria-label="Search merchant or description"
          placeholder="Search merchant or description"
          value={state.q ?? ""}
          onChange={(e) => update("q", e.target.value)}
          className="max-w-xs"
        />
        <FilterSelect
          label="Status"
          value={state.status ?? ""}
          onChange={(v) => update("status", v)}
          options={[
            ["", "All statuses"],
            ["unclassified", "Unclassified"],
            ["classified", "Classified"],
            ["needs_review", "Needs review"],
            ["parent_verified", "Parent verified"],
          ]}
        />
        <FilterSelect
          label="Category"
          value={state.category ?? ""}
          onChange={(v) => update("category", v)}
          options={[["", "All categories"], ...facets.categories.map((c) => [c, c] as [string, string])]}
        />
        <FilterSelect
          label="Platform"
          value={state.platform ?? ""}
          onChange={(v) => update("platform", v)}
          options={[["", "All platforms"], ...facets.platforms.map((p) => [p, p] as [string, string])]}
        />
        <FilterSelect
          label="Child"
          value={state.child ?? ""}
          onChange={(v) => update("child", v)}
          options={[["", "All children"], ...facets.children.map((c) => [c.id, c.name] as [string, string])]}
        />
        <FilterSelect
          label="Confidence"
          value={state.confidence ?? ""}
          onChange={(v) => update("confidence", v)}
          options={[
            ["", "Any confidence"],
            ["high", "High"],
            ["medium", "Medium"],
            ["low", "Low"],
            ["unclassified", "Unclassified"],
          ]}
        />
        <FilterSelect
          label="Source"
          value={state.source ?? ""}
          onChange={(v) => update("source", v)}
          options={[
            ["", "Any source"],
            ["manual", "Manual"],
            ["receipt_paste", "Receipt"],
            ["csv_upload", "CSV"],
          ]}
        />
        <FilterSelect
          label="Sort by"
          value={state.sort ?? ""}
          onChange={(v) => update("sort", v)}
          options={[
            ["", "Date"],
            ["amount", "Amount"],
            ["confidence", "Confidence"],
            ["created_at", "Recently added"],
          ]}
        />
        <FilterSelect
          label="Order"
          value={state.dir ?? ""}
          onChange={(v) => update("dir", v)}
          options={[
            ["", "Newest / highest first"],
            ["asc", "Oldest / lowest first"],
          ]}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Apply filters
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={clear}>
          Clear
        </Button>
      </div>
    </form>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <Select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="max-w-[12rem]"
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </Select>
  );
}
