import { GetStartedButton } from "./GetStartedButton";
import { HeroArt } from "./HeroArt";

const TRUST = [
  { label: "Secure & transparent", icon: ShieldIcon },
  { label: "Powered by real usage", icon: BoltIcon },
  { label: "Built for the AI community", icon: PeopleIcon },
];

export function Hero() {
  // overflow-x:clip on the section contains the aurora and the tilted art
  // without turning it into a scroll container the way overflow:hidden would.
  return (
    <section id="top" className="hero-wash [overflow-x:clip]">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-6 lg:pt-20">
        <div className="rise">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-soft uppercase">
            AI powers your ideas. We reward you.
          </p>
          <h1 className="mt-4 text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-5xl lg:text-[3.4rem]">
            Get 5% cashback on AI subscriptions.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted">
            Prove your ChatGPT, Claude, or Grok subscription with zkTLS and get paid in
            SOL. Your password and session never leave your device.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <GetStartedButton />
            <a
              href="#how-it-works"
              className="press rounded-full border border-line-strong bg-surface px-6 py-3 text-sm font-medium transition hover:bg-foreground/5"
            >
              How it works
            </a>
          </div>

          <ul className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12.5px] text-muted">
            {TRUST.map(({ label, icon: Icon }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <HeroArt />
      </div>
    </section>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 text-muted-soft" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M8 1.8 13 3.6v4.1c0 3-2 5.3-5 6.5-3-1.2-5-3.5-5-6.5V3.6L8 1.8Z" strokeLinejoin="round" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 text-muted-soft" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M9 1.5 3.5 9h4l-.5 5.5L12.5 7h-4l.5-5.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 text-muted-soft" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="6" cy="6" r="2.4" />
      <path d="M1.8 13.5a4.4 4.4 0 0 1 8.4 0M11 4.2a2.4 2.4 0 0 1 0 4.4M12.2 13.5a4 4 0 0 0-1.2-2.6" strokeLinecap="round" />
    </svg>
  );
}
