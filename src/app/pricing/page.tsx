import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui";
import { PrivacyNote } from "@/components/privacy-note";

export const metadata: Metadata = {
  title: "Pricing — Spend Lens",
  description: "Early-access pricing for Spend Lens. Free during beta.",
};

const INCLUDED = [
  "Decode confusing charges with plain-English explanations",
  "Manual entry, receipt paste, and CSV upload",
  "AI classification with confidence labels you can correct",
  "Dashboard, review queue, and a weekly summary",
];

export default function PricingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            Spend<span className="text-indigo-600">Lens</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Sign up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
        <div className="text-center">
          <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            Free during beta
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Simple pricing for early access
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-600">
            Spend Lens is in beta and free while we learn what&apos;s useful.
            After beta, we expect simple per-family pricing.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold text-slate-900">
              $10–$20
            </span>
            <span className="text-slate-500">/ month per family (planned)</span>
          </div>
          <p className="mt-1 text-sm font-medium text-emerald-700">
            $0 during the free beta
          </p>

          <ul className="mt-6 flex flex-col gap-2 text-sm text-slate-700">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span aria-hidden className="mt-0.5 text-indigo-600">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="sm:flex-1">
              <Button className="w-full">Start with the free beta</Button>
            </Link>
            <Link href="/login" className="sm:flex-1">
              <Button variant="secondary" className="w-full">
                Log in
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            No credit card required. No checkout yet — billing turns on after
            beta.
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900">
            What to expect
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Spend Lens helps you understand and review kid-related digital
            charges. It does <span className="font-medium">not</span> prevent
            spending, connect to your bank, or catch everything. AI labels are
            cautious suggestions you can correct at any time.
          </p>
          <div className="mt-4 flex flex-col gap-1.5">
            <PrivacyNote>
              We never ask for bank logins or full card numbers.
            </PrivacyNote>
            <PrivacyNote>
              Use nicknames for kids — Spend Lens doesn&apos;t need full legal
              names.
            </PrivacyNote>
            <PrivacyNote>
              Your data is private to your account and you can delete it anytime.
            </PrivacyNote>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} Spend Lens · Beta</span>
          <Link href="/" className="hover:text-slate-600">
            Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
