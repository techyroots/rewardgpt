"use client";

import { useState } from "react";
import { PRIVY_ENABLED } from "@/lib/privy-enabled";
import { SERVICES, type ServiceId } from "@/lib/services";
import { SERVICE_MARKS } from "./logos";
import { SetupNotice } from "./SetupNotice";
import { VerifyDialog } from "./VerifyDialog";

export function ServiceSection() {
  const [active, setActive] = useState<ServiceId | null>(null);

  return (
    <section id="supported" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h2 className="text-[22px] font-semibold tracking-tight">Supported AI platforms</h2>
      <p className="mt-1.5 text-sm text-muted">
        Link your existing subscription. Earn rewards. It&rsquo;s that simple.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((service) => {
          const Mark = SERVICE_MARKS[service.id];
          return (
            <button
              key={service.id}
              onClick={() => setActive(service.id)}
              className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 text-left transition hover:border-line-strong hover:shadow-sm"
            >
              <Mark className="size-11 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">{service.name}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-muted">
                  {service.blurb}
                </span>
              </span>
              <svg
                viewBox="0 0 16 16"
                className="size-4 shrink-0 text-muted-soft transition group-hover:translate-x-0.5 group-hover:text-foreground"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path d="m6 3.5 4.5 4.5L6 12.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
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
