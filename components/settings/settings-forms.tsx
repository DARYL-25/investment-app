"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";

export function ProfileForm({
  initialName,
  initialCurrency,
}: {
  initialName: string;
  initialCurrency: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [baseCurrency, setBaseCurrency] = useState(initialCurrency);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    setSaved(false);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, baseCurrency }),
    });
    setLoading(false);
    if ((await res.json()).ok) {
      setSaved(true);
      router.refresh();
    }
  };

  return (
    <Card>
      <CardHeader title="Profile" subtitle="Display name and reporting currency" />
      <CardBody className="max-w-md space-y-3.5">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Base currency" hint="Used to consolidate multi-currency portfolios on the dashboard.">
          <Select value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)}>
            {["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <div className="flex items-center gap-3">
          <Button onClick={save} loading={loading} disabled={!name.trim()}>
            Save changes
          </Button>
          {saved && <span className="text-xs text-gain">Saved ✓</span>}
        </div>
      </CardBody>
    </Card>
  );
}

export function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const json = await res.json();
    setLoading(false);
    if (json.ok) {
      setMsg({ ok: true, text: "Password updated." });
      setCurrent("");
      setNext("");
    } else {
      setMsg({ ok: false, text: json.error ?? "Failed to update password" });
    }
  };

  return (
    <Card>
      <CardHeader title="Password" subtitle="Change your account password" />
      <CardBody className="max-w-md space-y-3.5">
        <Field label="Current password">
          <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </Field>
        <Field label="New password" hint="Minimum 8 characters">
          <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        </Field>
        <div className="flex items-center gap-3">
          <Button onClick={save} loading={loading} disabled={!current || next.length < 8}>
            Update password
          </Button>
          {msg && <span className={`text-xs ${msg.ok ? "text-gain" : "text-loss"}`}>{msg.text}</span>}
        </div>
      </CardBody>
    </Card>
  );
}
