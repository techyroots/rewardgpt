"use client";

import { useState } from "react";
import { PRIVY_ENABLED } from "@/lib/privy-enabled";
import { SERVICES, type ServiceId } from "@/lib/services";
import { PLAN_TIERS } from "@/lib/verifiers/plans";
import { SERVICE_MARKS } from "./logos";
import { Reveal } from "./Reveal";
import { SetupNotice } from "./SetupNotice";
import { VerifyDialog } from "./VerifyDialog";

/** The best cashback on offer for a service, to show what is at stake. */
function bestReward(serviceId: ServiceId): number {
  const prices = PLAN_TIERS[serviceId].map((tier) => tier.priceUsdCents);
  return Math.floor((Math.max(...prices) * 500) / 10_000) / 100;
}

export function ServiceSection() {
  const [active, setActive] = useState<ServiceId | null>(null);

  return (
    <section id="supported" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Reveal>
        <h2 className="text-[22px] font-semibold tracking-tight">Supported AI platforms</h2>
        <p className="mt-1.5 text-sm text-muted">
          Link your existing subscription. Earn rewards. It&rsquo;s that simple.
        </p>
      </Reveal>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((service, index) => {
          const Mark = SERVICE_MARKS[service.id];
          return (
            <Reveal key={service.id} delay={index * 90} className="h-full">
              <button
                onClick={() => setActive(service.id)}
                className="lift press group flex h-full w-full items-start gap-4 rounded-2xl border border-line bg-surface p-5 text-left hover:border-line-strong"
              >
                <Mark className="size-11 shrink-0" />

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[15px] font-medium">{service.name}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-medium text-accent">
                      5% back
                    </span>
                  </span>
                  <span className="mt-1 block text-[13px] leading-snug text-muted">
                    {service.blurb}
                  </span>
                  <span className="mt-2 block text-[12px] text-muted-soft">
                    up to ${bestReward(service.id).toFixed(2)} a month
                  </span>
                </span>

                <svg
                  viewBox="0 0 16 16"
                  className="mt-1 size-4 shrink-0 text-muted-soft transition-transform duration-300 group-hover:translate-x-1 group-hover:text-foreground"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="m6 3.5 4.5 4.5L6 12.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </Reveal>
          );
        })}
      </div>

      {PRIVY_ENABLED ? (
        <VerifyDialog serviceId={active} onClose={() => setActive(null)} />
      ) : (
        active && (
          <div className="mt-5">
            <SetupNotice />
          </div>
        )
      )}
    </section>
  );
}
