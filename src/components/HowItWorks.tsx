import { formatUsd } from "@/lib/services";
import { PLAN_TIERS } from "@/lib/verifiers/plans";
import { ChatGptMark } from "./logos";
import { Reveal } from "./Reveal";

const STEPS = [
  {
    title: "Connect Wallet",
    body: "Link your Solana wallet, or have one created for you in a tap.",
    icon: WalletIcon,
  },
  {
    title: "Verify Subscription",
    body: "Prove your plan with zkTLS. No credentials ever leave your device.",
    icon: ShieldIcon,
  },
  {
    title: "Claim Cashback",
    body: "SOL lands in your wallet. No fees, no signature, no waiting.",
    icon: CoinIcon,
  },
];

export function HowItWorks() {
  // Taken from the live tier table rather than hard-coded, so the example can
  // never drift away from what the app actually pays.
  const example = PLAN_TIERS.chatgpt.find((tier) => tier.label === "ChatGPT Plus")!;
  const reward = Math.floor((example.priceUsdCents * 500) / 10_000);

  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <Reveal>
        <h2 className="text-[26px] font-semibold tracking-tight">How it works</h2>
        <p className="mt-1.5 text-sm text-muted">Get your AI cashback in three simple steps.</p>
      </Reveal>

      {/* Steps sit on one row with connectors between them, so the sequence
          reads as a flow rather than three unrelated paragraphs. */}
      <ol className="mt-8 grid gap-4 md:grid-cols-3">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <Reveal as="li" key={step.title} delay={index * 110} className="relative h-full">
              <div className="lift h-full rounded-2xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-accent">
                    <Icon />
                  </span>
                  <span className="text-[11px] font-semibold tracking-[0.14em] text-muted-soft">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-[15px] font-medium">{step.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{step.body}</p>
              </div>

              {index < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 -right-3 z-10 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-muted-soft md:flex"
                >
                  <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m6 3.5 4.5 4.5L6 12.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </Reveal>
          );
        })}
      </ol>

      {/* The example is laid out as the actual arithmetic: what you pay, the
          rate, what you get back. */}
      <Reveal delay={140}>
        <div
          id="rewards"
          className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface card-float"
        >
          <div className="flex items-center justify-between border-b border-line px-6 py-3.5">
            <span className="text-[10.5px] font-medium tracking-[0.14em] text-muted-soft uppercase">
              Example reward
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-accent">
              5% cashback
            </span>
          </div>

          <div className="grid items-center gap-6 px-6 py-6 sm:grid-cols-[1fr_auto_auto_auto_1fr]">
            <div className="flex items-center gap-3">
              <ChatGptMark className="size-10 shrink-0" />
              <div>
                <p className="text-sm font-medium">{example.label}</p>
                <p className="text-[12.5px] text-muted">
                  {formatUsd(example.priceUsdCents)} / month
                </p>
              </div>
            </div>

            <Connector />

            <div className="text-center">
              <p className="text-[11px] tracking-wide text-muted-soft uppercase">Rate</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">5%</p>
            </div>

            <Connector />

            <div className="sm:text-right">
              <p className="text-[11px] tracking-wide text-muted-soft uppercase">You receive</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-accent">
                {formatUsd(reward)}
                <span className="ml-1.5 text-[13px] font-normal text-muted">in SOL</span>
              </p>
              <p className="mt-0.5 text-[11.5px] text-muted-soft">
                converted at the live rate when you claim
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/** Horizontal on wide screens, vertical when the row stacks. */
function Connector() {
  return (
    <span aria-hidden="true" className="hidden justify-center text-muted-soft sm:flex">
      <svg viewBox="0 0 24 16" className="h-4 w-6" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M1 8h18M15 3.5 19.5 8 15 12.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H15a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.5Z" />
      <path d="M3 7h12M13.5 11h1.2" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M10 2.5 16 4.7v5c0 3.6-2.4 6.4-6 7.8-3.6-1.4-6-4.2-6-7.8v-5L10 2.5Z" strokeLinejoin="round" />
      <path d="m7.4 9.8 1.9 1.9 3.4-3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6.2v7.6M8 8.1h3.1a1.6 1.6 0 0 1 0 3.2H8.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
