import Link from "next/link";
import { Button, Card } from "@/components/ui";

export default function OnboardingPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            Spend<span className="text-indigo-600">Lens</span>
          </span>
          <h1 className="mt-6 text-2xl font-semibold text-slate-900">
            Welcome to Spend Lens
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Let&apos;s get your family set up.
          </p>
        </div>

        <Card className="flex flex-col gap-4">
          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-800">Your privacy</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Spend Lens is for parents, not children.</li>
              <li>We never ask for a bank login or full card numbers.</li>
              <li>Your data is private to you and you can delete it anytime.</li>
            </ul>
          </div>

          <p className="text-sm text-slate-500">
            Family profile and kid setup arrives next. For now, head to your
            dashboard.
          </p>

          <Link href="/dashboard">
            <Button className="w-full">Continue to dashboard</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
