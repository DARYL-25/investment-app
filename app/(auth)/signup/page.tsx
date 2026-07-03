"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", baseCurrency: "USD" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) {
      setError(json.error ?? "Something went wrong");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <Card className="shadow-pop">
      <CardBody className="space-y-4 p-6">
        <div>
          <h1 className="text-lg font-semibold text-ink">Create your account</h1>
          <p className="mt-1 text-xs text-ink-dim">
            Free forever for personal portfolios. No card required.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-3.5">
          <Field label="Name">
            <Input
              required
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Daryl"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Password" hint="Minimum 8 characters">
            <Input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </Field>
          <Field label="Base currency">
            <Select
              value={form.baseCurrency}
              onChange={(e) => setForm({ ...form, baseCurrency: e.target.value })}
            >
              {["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          {error && <p className="text-xs text-loss">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">
            Create account
          </Button>
        </form>
        <p className="text-center text-xs text-ink-dim">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-indigo-300 hover:text-indigo-200">
            Sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
