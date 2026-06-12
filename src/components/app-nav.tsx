"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/transactions/review", label: "Review" },
  { href: "/summary", label: "Weekly summary" },
  { href: "/settings/family", label: "Settings" },
];

export function AppNav({ email }: { email: string }) {
  const pathname = usePathname();
  // Highlight the most specific matching link (so /transactions/review doesn't
  // also light up /transactions).
  const activeHref = LINKS.filter(
    (l) => pathname === l.href || pathname.startsWith(`${l.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              Spend<span className="text-indigo-600">Lens</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* Scrollable on small screens so every link stays reachable. */}
        <nav
          aria-label="Main"
          className="-mx-1 flex gap-1 overflow-x-auto pb-2"
        >
          {LINKS.map((link) => {
            const active = link.href === activeHref;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
