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
      value: <CountUp value={Number(lamports) / 1_000_000_000} decimals={3} suffix=" SOL" />,
      icon: <DatabaseIcon />,
    },
    {
      label: "Cashback Paid",
      value: <CountUp value={(paid._sum.amountCents ?? 0) / 100} decimals={2} prefix="$" />,
      icon: <GiftIcon />,
    },
    {
      label: "Verified Users",
      value: <CountUp value={distinctUsers.length} />,
      icon: <PeopleIcon />,
    },
    {
      label: "Claims Today",
      value: <CountUp value={claimsToday} />,
      icon: <BoltIcon />,
    },
  ].filter(Boolean) as { label: string; value: React.ReactNode; icon: React.ReactNode }[];

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <Reveal className="flex flex-wrap items-center gap-x-10 gap-y-6 rounded-2xl border border-line bg-surface px-6 py-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex items-center gap-3">
            <span className="text-muted-soft">{tile.icon}</span>
            <span>
              <span className="block text-[17px] font-semibold tracking-tight">{tile.value}</span>
              <span className="block text-[12px] text-muted">{tile.label}</span>
            </span>
          </div>
        ))}
        <p className="ml-auto max-w-[14rem] text-right text-[12px] leading-snug text-muted-soft">
          A more rewarding AI future, together.
        </p>
      </Reveal>
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
