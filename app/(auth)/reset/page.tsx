"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/reset-confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) {
      setError(json.error ?? "Something went wrong");
      return;
    }
    router.push("/login");
  };

  return (
    <Card className="shadow-pop">
      <CardBody className="space-y-4 p-6">
        <div>
          <h1 className="text-lg font-semibold text-ink">Choose a new password</h1>
        </div>
        <form onSubmit={submit} className="space-y-3.5">
          <Field label="New password" hint="Minimum 8 characters">
            <Input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          {error && <p className="text-xs text-loss">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">
            Reset password
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

export default function ResetPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
