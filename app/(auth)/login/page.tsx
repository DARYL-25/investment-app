"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) {
      setError(json.error ?? "Something went wrong");
      return;
    }
    router.push(params.get("next") ?? "/dashboard");
    router.refresh();
  };

  return (
    <Card className="shadow-pop">
      <CardBody className="space-y-4 p-6">
        <div>
          <h1 className="text-lg font-semibold text-ink">Welcome back</h1>
          <p className="mt-1 text-xs text-ink-dim">Sign in to your Meridian account</p>
        </div>
        <form onSubmit={submit} className="space-y-3.5">
          <Field label="Email">
            <Input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          {error && <p className="text-xs text-loss">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>
        <div className="flex items-center justify-between text-xs">
          <Link href="/forgot" className="text-ink-dim hover:text-ink-mid">
            Forgot password?
          </Link>
          <Link href="/signup" className="font-medium text-indigo-300 hover:text-indigo-200">
            Create account →
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
