import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { treasuryLamports } from "@/lib/payout";

export const runtime = "nodejs";
export const revalidate = 30;

/**
 * Real numbers only. Anything we can't compute yet comes back as null and the
 * UI hides that tile rather than showing an invented figure.
 */
export async function GET() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [paid, verifiedUsers, claimsToday, lamports] = await Promise.all([
    prisma.claim.aggregate({ _sum: { amountCents: true }, where: { status: "PAID" } }),
    prisma.claim.findMany({ distinct: ["privyUserId"], select: { privyUserId: true } }),
    prisma.claim.count({ where: { createdAt: { gte: startOfDay } } }),
    treasuryLamports(),
  ]);

  return NextResponse.json({
    treasurySol: lamports === null ? null : Number(lamports) / 1_000_000_000,
    cashbackPaidCents: paid._sum.amountCents ?? 0,
    verifiedUsers: verifiedUsers.length,
    claimsToday,
  });
}
