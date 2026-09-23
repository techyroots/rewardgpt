import { prisma } from "@/lib/db";
import { treasuryLamports } from "@/lib/payout";
import { CountUp } from "./CountUp";
import { Reveal } from "./Reveal";

/**
 * Live numbers only.
 *
 * The mockup showed impressive placeholder figures; showing invented totals on
 * a product that moves real money is the kind of thing people check. Tiles
 * with nothing real behind them are simply not rendered.
 */
export async function StatsBar() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [paid, distinctUsers, claimsToday, lamports] = await Promise.all([
    prisma.claim.aggregate({ _sum: { amountCents: true }, where: { status: "PAID" } }),
    prisma.claim.findMany({ distinct: ["privyUserId"], select: { privyUserId: true } }),
    prisma.claim.count({ where: { createdAt: { gte: startOfDay } } }),
    treasuryLamports(),
  ]);

  const tiles = [
    lamports !== null && {
      label: "Treasury Balance",
      hint: "available to pay out",
      value: <CountUp value={Number(lamports) / 1_000_000_000} decimals={3} suffix=" SOL" />,
      icon: <DatabaseIcon />,
    },
    {
      label: "Cashback Paid",
      hint: "returned to members",
      value: <CountUp value={(paid._sum.amountCents ?? 0) / 100} decimals={2} prefix="$" />,
      icon: <GiftIcon />,
    },
    {
      label: "Verified Users",
      hint: "subscriptions proven",
      value: <CountUp value={distinctUsers.length} />,
      icon: <PeopleIcon />,
    },
    {
      label: "Claims Today",
      hint: "in the last 24 hours",
      value: <CountUp value={claimsToday} />,
      icon: <BoltIcon />,
    },
  ].filter(Boolean) as {
    label: string;
    hint: string;
    value: React.ReactNode;
    icon: React.ReactNode;
  }[];

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <Reveal>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[26px] font-semibold tracking-tight">By the numbers</h2>
          <p className="text-[12.5px] text-muted-soft">Live from the treasury and the chain.</p>
        </div>
      </Reveal>

      {/* One tile per figure, rather than a single band where everything ran
          together and the right half sat empty. */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile, index) => (
          <Reveal key={tile.label} delay={index * 90} className="h-full">
            <div className="lift h-full rounded-2xl border border-line bg-surface p-5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-foreground/[0.04] text-muted">
                {tile.icon}
              </span>
              <p className="mt-4 text-2xl font-semibold tracking-tight tabular-nums">
                {tile.value}
              </p>
              <p className="mt-1 text-[13px] font-medium">{tile.label}</p>
              <p className="mt-0.5 text-[12px] text-muted-soft">{tile.hint}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function DatabaseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4">
      <ellipse cx="8" cy="4" rx="5" ry="2.2" />
      <path d="M3 4v8c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2V4M3 8c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="2.2" y="6" width="11.6" height="8" rx="1.2" />
      <path d="M2.2 6h11.6M8 6v8M8 6c-1.6 0-3-.7-3-1.9S6 2.5 8 6Zm0 0c1.6 0 3-.7 3-1.9S10 2.5 8 6Z" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="6" cy="6" r="2.4" />
      <path d="M1.8 13.5a4.4 4.4 0 0 1 8.4 0M11 4.2a2.4 2.4 0 0 1 0 4.4M12.2 13.5a4 4 0 0 0-1.2-2.6" strokeLinecap="round" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M9 1.5 3.5 9h4l-.5 5.5L12.5 7h-4l.5-5.5Z" strokeLinejoin="round" />
    </svg>
  );
}
