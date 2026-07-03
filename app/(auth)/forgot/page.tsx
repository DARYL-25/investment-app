"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/reset-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    setLoading(false);
    if (json.ok) {
      setSent(true);
      setDevLink(json.data?.devLink ?? null);
    }
  };

  return (
    <Card className="shadow-pop">
      <CardBody className="space-y-4 p-6">
        <div>
          <h1 className="text-lg font-semibold text-ink">Reset your password</h1>
          <p className="mt-1 text-xs text-ink-dim">
            We&apos;ll create a secure one-hour reset link for your account.
          </p>
        </div>
        {sent ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-mid">
              If an account exists for <span className="text-ink">{email}</span>, a reset link has
              been created.
            </p>
            {devLink && (
              <Link
                href={devLink}
                className="block rounded-xl border border-accent/30 bg-accent-soft/40 px-4 py-3 text-center text-sm font-medium text-indigo-200 hover:bg-accent-soft/60"
              >
                Open reset link (dev mode)
              </Link>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3.5">
            <Field label="Email">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Button type="submit" loading={loading} className="w-full">
              Send reset link
            </Button>
          </form>
        )}
        <p className="text-center text-xs text-ink-dim">
          <Link href="/login" className="hover:text-ink-mid">
            ← Back to sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
