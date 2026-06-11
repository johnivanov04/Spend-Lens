import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            Spend<span className="text-indigo-600">Lens</span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold text-slate-900">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Your family&apos;s spending data stays private to you.
          </p>
        </div>

        <SignupForm />

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-indigo-600">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
