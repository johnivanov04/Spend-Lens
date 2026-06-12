import Link from "next/link";
import { Button } from "@/components/ui";

const FEATURES = [
  {
    title: "Decode cryptic charges",
    body: "Turn lines like APPLE.COM/BILL, ROBLOX.COM, or SQ *DIGITAL SERVICE into a plain-English explanation.",
  },
  {
    title: "See likely kid-related spend",
    body: "Spending is grouped by platform, category, and child — so you can spot patterns at a glance.",
  },
  {
    title: "Stay in control",
    body: "Every classification shows a confidence score. Correct anything that's wrong, and it learns for next time.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            Spend<span className="text-indigo-600">Lens</span>
          </span>
          <div className="flex items-center gap-2">
            <Link href="/pricing">
              <Button variant="ghost" size="sm">
                Pricing
              </Button>
            </Link>
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

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-24 text-center">
          <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            Early access
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Decode confusing kid-related digital spending
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
            Paste a receipt, type a charge, or upload a CSV. Spend Lens explains
            what it likely was, which platform it came from, and whether it&apos;s
            kid-related — all in one calm dashboard.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/signup">
              <Button>Get started free</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary">I already have an account</Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            No bank login required. We never ask for full card numbers.
          </p>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-5xl px-4 pb-24">
          <div className="grid gap-6 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-slate-200 bg-white p-6"
              >
                <h3 className="text-base font-semibold text-slate-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} Spend Lens</span>
          <span>Built for parents, not children.</span>
        </div>
      </footer>
    </div>
  );
}
