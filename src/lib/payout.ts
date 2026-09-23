import type { Address } from "viem";
import { centsToUsdcUnits, ERC20_ABI, publicClient, treasury, usdcAddress } from "./chain";
import { prisma } from "./db";
import { env } from "./env";

export class PayoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayoutError";
  }
}

/**
 * Pays a single claim from the treasury wallet.
 *
 * The user pays no gas and signs nothing — they only ever prove eligibility.
 * Safety comes from three places:
 *  1. the ELIGIBLE -> PAYING flip is a conditional update, so two concurrent
 *     claim requests cannot both begin a transfer,
 *  2. the amount is read from the database, never from the request,
 *  3. a rolling 24h cap and a balance check bound the blast radius if
 *     eligibility logic is ever wrong.
 */
export async function payClaim(claimId: string): Promise<{ txHash: string }> {
  const claim = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!claim) throw new PayoutError("Claim not found.");
  if (claim.status === "PAID" && claim.txHash) return { txHash: claim.txHash };
  if (claim.status !== "ELIGIBLE") {
    throw new PayoutError(`Claim is ${claim.status.toLowerCase()}, not ready to pay.`);
  }

  await assertWithinDailyCap(claim.amountCents);

  // Conditional update doubles as a lock: whoever flips ELIGIBLE -> PAYING
  // first owns the transfer, and the loser's updateMany touches zero rows.
  const locked = await prisma.claim.updateMany({
    where: { id: claimId, status: "ELIGIBLE" },
    data: { status: "PAYING" },
  });
  if (locked.count === 0) {
    throw new PayoutError("This claim is already being paid.");
  }

  // Tracked outside the try so the recovery path can tell "never sent" from
  // "sent but we lost track of it".
  let submittedTx: string | undefined;

  try {
    const amount = centsToUsdcUnits(claim.amountCents);
    const { account, wallet } = treasury();
    const client = publicClient();

    const balance = await client.readContract({
      address: usdcAddress(),
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });
    if (balance < amount) {
      throw new PayoutError("Treasury is out of USDC. Please try again later.");
    }

    const txHash = await wallet.writeContract({
      address: usdcAddress(),
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [claim.wallet as Address, amount],
    });
    submittedTx = txHash;

    // Wait for inclusion so a reverted transfer is never reported as paid.
    const receipt = await client.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
      throw new PayoutError("The payout transaction reverted on chain.");
    }

    await prisma.claim.update({
      where: { id: claimId },
      data: { status: "PAID", txHash, paidAt: new Date(), failure: null },
    });

    return { txHash };
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 500) : "Unknown payout error";

    if (submittedTx) {
      // The transfer was broadcast and we lost track of it — a timed-out
      // receipt poll, say. Returning this to ELIGIBLE would risk paying twice,
      // so it parks in REVIEW for a human to settle against the chain.
      await prisma.claim.update({
        where: { id: claimId },
        data: { status: "REVIEW", txHash: submittedTx, failure: reason },
      });
      throw new PayoutError(
        "Your payout was sent but we could not confirm it. We're checking — you will not be charged or paid twice.",
      );
    }

    // Nothing was broadcast, so it is safe to let the user try again.
    await prisma.claim.update({
      where: { id: claimId },
      data: { status: "ELIGIBLE", failure: reason },
    });
    throw error instanceof PayoutError
      ? error
      : new PayoutError("Payout failed. Your eligibility is safe — please try again.");
  }
}

async function assertWithinDailyCap(pendingCents: number): Promise<void> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const paid = await prisma.claim.aggregate({
    _sum: { amountCents: true },
    // REVIEW rows may represent money that already left the treasury, so they
    // count against the cap until a human resolves them.
    where: { status: { in: ["PAID", "PAYING", "REVIEW"] }, createdAt: { gte: since } },
  });
  const spent = paid._sum.amountCents ?? 0;
  if (spent + pendingCents > env.dailyPayoutCapCents) {
    throw new PayoutError("Daily payout limit reached. Please come back tomorrow.");
  }
}

/** Live treasury balance in cents, for the stats strip. */
export async function treasuryBalanceCents(): Promise<number | null> {
  try {
    const { account } = treasury();
    const balance = await publicClient().readContract({
      address: usdcAddress(),
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });
    return Number(balance / 10n ** 4n);
  } catch {
    // No treasury configured yet (or RPC down) — the UI hides the figure.
    return null;
  }
}
