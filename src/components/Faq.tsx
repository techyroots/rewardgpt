"use client";

import { useState } from "react";
import { Reveal } from "./Reveal";

const FAQS = [
  {
    q: "Do I have to give you my ChatGPT login?",
    a: "No. You sign in on the real chatgpt.com, claude.ai or grok.com in your own browser. The proof is generated on your own device, and your password and session never leave it.",
  },
  {
    q: "What do you actually store?",
    a: "Your wallet address, which service you verified, which plan tier it was, the amount paid, and an anonymous hash of your subscription. Nothing else.",
  },
  {
    q: "Does my email reach your server?",
    a: "Briefly, yes — and we would rather be straight about it. The ChatGPT proof identifies your account by email address. It arrives inside the proof, is immediately turned into an irreversible hash, and the address itself is never written to our database or our logs. It is what stops one subscription claiming twice. We cannot read it back, but it does pass through our server, so this is not zero-knowledge from our side.",
  },
  {
    q: "Why does the SOL amount change?",
    a: "Cashback is 5% of what you pay for your subscription, which is priced in dollars. We convert that to SOL at the moment you claim and record the rate we used, so you always receive 5% of your subscription price in value.",
  },
  {
    q: "Can I claim from several wallets?",
    a: "No. Each subscription produces one anonymous identifier, and that identifier can only ever be used once. A second wallet proving the same subscription is rejected.",
  },
  {
    q: "How do I get paid?",
    a: "In SOL, sent from our treasury directly to your Solana wallet. You pay no network fee and sign nothing.",
  },
  {
    q: "How often can I claim?",
    a: "Once per subscription per service, then again after the cooldown period once your next billing cycle has been paid.",
  },
];

export function Faq() {
  // Open by index rather than a boolean per row, so only one answer shows at a
  // time and the section stays scannable.
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <Reveal>
        <h2 className="text-[22px] font-semibold tracking-tight">Questions</h2>
      </Reveal>

      <div className="mt-6 max-w-3xl divide-y divide-line border-t border-line">
        {FAQS.map((item, index) => {
          const expanded = open === index;
          return (
            <Reveal key={item.q} delay={Math.min(index, 4) * 60}>
              <h3>
                <button
                  onClick={() => setOpen(expanded ? null : index)}
                  aria-expanded={expanded}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-accent"
                >
                  <span className="text-[15px] font-medium">{item.q}</span>
                  <svg
                    viewBox="0 0 16 16"
                    className={`size-4 shrink-0 text-muted-soft transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
                    <path d="m3.5 6 4.5 4.5L12.5 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </h3>

              {/* Grid-rows transition animates to the content's natural height,
                  which a max-height hack only approximates. */}
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p className="pb-5 text-sm leading-relaxed text-muted">{item.a}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
