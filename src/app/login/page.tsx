import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
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
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Log in to review your family&apos;s spending.
          </p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-indigo-600">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
