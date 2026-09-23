"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect, useState } from "react";
import { useApi } from "@/lib/client-api";
import { formatUsd, type ServiceId } from "@/lib/services";
import { SERVICE_MARKS } from "./logos";
import { Reveal } from "./Reveal";

type Claim = {
  id: string;
  serviceId: ServiceId;
  planLabel: string | null;
  amountCents: number;
  solAmount: string | null;
  status: string;
  explorerUrl: string | null;
  createdAt: string;
};

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-emerald-50 text-accent",
  ELIGIBLE: "bg-amber-50 text-amber-700",
  PAYING: "bg-amber-50 text-amber-700",
  REVIEW: "bg-orange-50 text-orange-700",
};

/**
 * The connected user's own claims.
 *
 * Renders nothing when signed out or when there is no history, so the landing
 * page is unchanged for a first-time visitor.
 */
export function ClaimHistory() {
  const { authenticated, ready } = usePrivy();
  const api = useApi();
  const [claims, setClaims] = useState<Claim[] | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ claims: Claim[] }>("/api/claim");
      setClaims(data.claims);
    } catch {
      // A failure here should not disturb the page; the section simply stays hidden.
      setClaims([]);
    }
  }, [api]);

  useEffect(() => {
    if (ready && authenticated) void load();
  }, [ready, authenticated, load]);

  if (!authenticated || !claims?.length) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-2 pb-12 sm:px-6">
      <Reveal>
        <h2 className="text-[22px] font-semibold tracking-tight">Your claims</h2>
        <p className="mt-1.5 text-sm text-muted">
          Everything you&rsquo;ve verified and been paid for.
        </p>

        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {claims.map((claim) => {
            const Mark = SERVICE_MARKS[claim.serviceId];
            return (
              <li key={claim.id} className="flex items-center gap-4 px-5 py-4">
                {Mark && <Mark className="size-8 shrink-0" />}

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{claim.planLabel ?? claim.serviceId}</p>
                  <p className="text-[12.5px] text-muted">
                    {new Date(claim.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-medium">
                    {claim.solAmount ? `${claim.solAmount} SOL` : formatUsd(claim.amountCents)}
                  </p>
                  {claim.solAmount && (
                    <p className="text-[12px] text-muted-soft">{formatUsd(claim.amountCents)}</p>
                  )}
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10.5px] font-medium tracking-wide uppercase ${
                    STATUS_STYLES[claim.status] ?? "bg-foreground/5 text-muted"
                  }`}
                >
                  {claim.status === "ELIGIBLE" ? "Ready" : claim.status.toLowerCase()}
                </span>

                {claim.explorerUrl && (
                  <a
                    href={claim.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View transaction"
                    className="text-muted-soft transition hover:text-foreground"
                  >
                    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M6.5 3.5h-3v9h9v-3M9.5 2.5h4v4M13.5 2.5 7 9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </Reveal>
    </section>
  );
}
