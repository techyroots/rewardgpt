import { formatUsd } from "@/lib/services";
import { PLAN_TIERS } from "@/lib/verifiers/plans";
import { ChatGptMark } from "./logos";
import { Reveal } from "./Reveal";

const STEPS = [
  {
    title: "Connect Wallet",
    body: "Link your Solana wallet, or have one created for you, to get started.",
  },
  {
    title: "Verify Subscription",
    body: "Prove your active ChatGPT, Claude, or Grok plan without sharing credentials.",
  },
  {
    title: "Claim Cashback",
    body: "Receive SOL directly to your wallet. No fees, no signature.",
  },
];

export function HowItWorks() {
  // Taken from the live tier table rather than hard-coded, so the example can
  // never drift away from what the app actually pays.
  const example = PLAN_TIERS.chatgpt.find((tier) => tier.label === "ChatGPT Plus")!;
  const reward = Math.floor((example.priceUsdCents * 500) / 10_000);

  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Reveal>
        <h2 className="text-[22px] font-semibold tracking-tight">How it works</h2>
        <p className="mt-1.5 text-sm text-muted">Get your AI cashback in three simple steps.</p>
      </Reveal>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-start">
        <ol className="grid gap-5 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal as="li" key={step.title} delay={index * 100} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line-strong text-[12px] font-medium text-muted">
                {index + 1}
              </span>
              <span>
                <span className="block text-sm font-medium">{step.title}</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-muted">
                  {step.body}
                </span>
              </span>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={120}>
          <div
            id="rewards"
            className="rounded-2xl border border-line bg-surface p-5 card-float"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-medium tracking-[0.14em] text-muted-soft uppercase">
                Example reward
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-accent">
                5% cashback
              </span>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <ChatGptMark className="size-9" />
              <div>
                <p className="text-sm font-medium">{example.label}</p>
                <p className="text-[12.5px] text-muted">Monthly subscription</p>
              </div>
            </div>

            <div className="mt-5 flex items-end justify-between border-t border-line pt-4">
              <div>
                <p className="text-[12.5px] text-muted">Cashback Rate</p>
                <p className="mt-0.5 text-xl font-semibold tracking-tight">5%</p>
              </div>
              <div className="text-right">
                <p className="text-[12.5px] text-muted">Eligible Reward</p>
                <p className="mt-0.5 text-xl font-semibold tracking-tight">
                  {formatUsd(reward)}{" "}
                  <span className="text-[12px] font-normal text-muted">in SOL</span>
                </p>
                <p className="text-[11px] text-muted-soft">
                  on a {formatUsd(example.priceUsdCents)} subscription
                </p>
              </div>
            </div>

            <p className="mt-4 text-[11.5px] leading-relaxed text-muted-soft">
              Converted to SOL at the live rate when you claim.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
