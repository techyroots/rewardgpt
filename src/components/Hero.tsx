import { ChatGptMark, ClaudeMark, GrokMark, RewardGptMark } from "./logos";

const TRUST = [
  { label: "Secure & transparent", icon: ShieldIcon },
  { label: "Powered by real usage", icon: BoltIcon },
  { label: "Built for the AI community", icon: PeopleIcon },
];

export function Hero() {
  return (
    <section id="top" className="hero-wash">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-6 lg:pt-20">
        <div className="rise">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-soft uppercase">
            AI powers your ideas. We reward you.
          </p>
          <h1 className="mt-4 text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-5xl lg:text-[3.4rem]">
            Get 5% cashback on AI subscriptions.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted">
            Verify your ChatGPT, Claude, or Grok subscription and receive cashback to your
            wallet. No email, no password, no identity shared.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#supported"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-white transition hover:bg-foreground/90"
            >
              Get started
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a
              href="#how-it-works"
              className="rounded-full border border-line-strong bg-surface px-6 py-3 text-sm font-medium transition hover:bg-foreground/5"
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

/** The fanned card stack from the mockup. */
function HeroArt() {
  return (
    <div className="relative hidden h-[19rem] lg:block" aria-hidden="true">
      {/* Chips sit just off the card's right edge, fanned like the mockup. */}
      <div className="absolute top-8 right-0 flex -rotate-6 flex-col gap-2.5">
        {[ChatGptMark, ClaudeMark, GrokMark].map((Mark, index) => (
          <div
            key={index}
            className="rounded-2xl border border-line bg-surface p-2 card-float"
            style={{ transform: `translateX(${(2 - index) * 16}px)` }}
          >
            <Mark className="size-8" />
          </div>
        ))}
      </div>

      <div className="absolute top-1 left-0 w-[21.5rem] -rotate-3 overflow-hidden rounded-3xl border border-line bg-surface p-5 card-float">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RewardGptMark className="size-5" />
            <span className="text-sm font-semibold tracking-tight">RewardGPT</span>
          </div>
          <span className="text-[11px] text-muted-soft">Your AI spending rewards you.</span>
        </div>
        <p className="mt-8 text-2xl leading-tight font-medium tracking-tight">
          Same AI tools.
          <br />
          More for you.
        </p>
        <div className="mt-6 h-20 rounded-2xl bg-gradient-to-tr from-emerald-100 via-white to-orange-100" />
      </div>
    </div>
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
