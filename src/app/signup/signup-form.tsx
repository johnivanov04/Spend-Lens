"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/onboarding`,
        },
      });
      if (error) {
        setError(error.message);
        return;
      }
      if (data.session) {
        // Email confirmation disabled — user is signed in immediately.
        router.push("/onboarding");
        router.refresh();
      } else {
        // Email confirmation required.
        setCheckEmail(true);
      }
    } catch {
      setError(
        "Authentication is not configured yet. Add your Supabase keys to .env.local.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <Card>
        <Alert tone="success">
          Check your email to confirm your account, then log in.
        </Alert>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </Field>
        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </Card>
  );
}
