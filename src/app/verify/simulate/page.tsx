"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SERVICES, isServiceId } from "@/lib/services";

/**
 * Stand-in for the Reclaim verification flow.
 *
 * In production the user would be on chatgpt.com with Reclaim's extension or
 * app attesting the response. Here they just pick an outcome, which is what
 * makes the rest of the pipeline testable without a Reclaim provider.
 */
export default function SimulatePage() {
  return (
    <Suspense fallback={null}>
      <Simulator />
    </Suspense>
  );
}

function Simulator() {
  const params = useSearchParams();
  const sessionId = params.get("session") ?? "";
  const serviceParam = params.get("service") ?? "";
  const serviceId = isServiceId(serviceParam) ? serviceParam : null;
  const service = SERVICES.find((s) => s.id === serviceId);

  const [accountId, setAccountId] = useState(() => `acct_${Math.random().toString(36).slice(2, 12)}`);
  const [plan, setPlan] = useState(service?.planLabel.toLowerCase().replace(/\s+/g, "-") ?? "");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  if (!serviceId || !service || !sessionId) {
    return <Shell><p className="text-sm text-muted">This simulation link is incomplete.</p></Shell>;
  }

  async function submit() {
    setState("sending");
    setMessage(null);
    try {
      const response = await fetch(`/api/verify/callback?service=${serviceId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, accountId, plan }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setMessage(body.error ?? "Verification was rejected.");
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setMessage("Could not reach the server.");
      setState("error");
    }
  }

  return (
    <Shell>
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] leading-relaxed text-amber-900">
        Simulated verification. This proves nothing — it exists so the claim and payout flow
        can be tested without a live Reclaim provider.
      </p>

      <h1 className="mt-6 text-lg font-semibold tracking-tight">
        Verify your {service.name} subscription
      </h1>

      <label className="mt-5 block text-[13px] font-medium">
        Account identifier
        <input
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line-strong bg-surface px-3 py-2 font-mono text-[13px] outline-none focus:border-foreground"
        />
        <span className="mt-1 block text-[12px] font-normal text-muted">
          Reuse the same value to test that one subscription cannot claim twice.
        </span>
      </label>

      <label className="mt-4 block text-[13px] font-medium">
        Plan reported by the provider
        <input
          value={plan}
          onChange={(event) => setPlan(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line-strong bg-surface px-3 py-2 font-mono text-[13px] outline-none focus:border-foreground"
        />
        <span className="mt-1 block text-[12px] font-normal text-muted">
          Try &ldquo;free&rdquo; to see an ineligible account rejected.
        </span>
      </label>

      {state === "done" ? (
        <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-900">
          Proof accepted. Return to the RewardGPT tab to claim your cashback.
        </p>
      ) : (
        <button
          onClick={submit}
          disabled={state === "sending" || !accountId || !plan}
          className="mt-6 w-full rounded-full bg-foreground px-5 py-3 text-sm font-medium text-white transition hover:bg-foreground/90 disabled:opacity-60"
        >
          {state === "sending" ? "Submitting…" : "Submit simulated proof"}
        </button>
      )}

      {message && <p className="mt-3 text-[13px] text-accent-warm">{message}</p>}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-line bg-surface p-6 card-float">{children}</div>
    </main>
  );
}
