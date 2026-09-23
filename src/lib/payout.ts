import {
  LAMPORTS_PER_SOL as WEB3_LAMPORTS,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { prisma } from "./db";
import { env } from "./env";
import { quoteLamports } from "./sol-price";
import { connection, treasury } from "./solana";

export class PayoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayoutError";
  }
}

/**
 * Pays a single claim in SOL from the treasury wallet.
 *
 * The user pays no fee and signs nothing — they only ever prove eligibility.
 * Safety comes from four places:
 *  1. the ELIGIBLE -> PAYING flip is a conditional update, so two concurrent
 *     claim requests cannot both begin a transfer,
 *  2. the USD amount is read from the database, never from the request,
 *  3. the SOL amount is quoted at payout time and recorded with its rate,
 *  4. a rolling 24h cap and a balance check bound the blast radius.
 */
export async function payClaim(claimId: string): Promise<{ signature: string }> {
  const claim = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!claim) throw new PayoutError("Claim not found.");
  if (claim.status === "PAID" && claim.txHash) return { signature: claim.txHash };
  if (claim.status !== "ELIGIBLE") {
    throw new PayoutError(`Claim is ${claim.status.toLowerCase()}, not ready to pay.`);
  }

  await assertWithinDailyCap(claim.amountCents);

  // Quote before locking, so a price-feed outage doesn't strand the claim.
  const { lamports, solUsdRate } = await quoteLamports(claim.amountCents);

  // Conditional update doubles as a lock: whoever flips ELIGIBLE -> PAYING
  // first owns the transfer, and the loser's updateMany touches zero rows.
  const locked = await prisma.claim.updateMany({
    where: { id: claimId, status: "ELIGIBLE" },
    data: { status: "PAYING" },
  });
  if (locked.count === 0) {
    throw new PayoutError("This claim is already being paid.");
  }

  let submitted: string | undefined;

  try {
    const payer = treasury();
    const rpc = connection();

    let recipient: PublicKey;
    try {
      recipient = new PublicKey(claim.wallet);
    } catch {
      throw new PayoutError("That wallet is not a valid Solana address.");
    }

    // Keep enough behind to stay rent-exempt and cover the fee.
    const balance = BigInt(await rpc.getBalance(payer.publicKey));
    const reserve = BigInt(Math.round(0.002 * WEB3_LAMPORTS));
    if (balance < lamports + reserve) {
      throw new PayoutError("Treasury is out of SOL. Please try again later.");
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: recipient,
        lamports: Number(lamports),
      }),
    );

    // sendAndConfirmTransaction waits for confirmation, so a dropped or failed
    // transaction is never reported as paid.
    const signature = await sendAndConfirmTransaction(rpc, transaction, [payer], {
      commitment: "confirmed",
    });
    submitted = signature;

    await prisma.claim.update({
      where: { id: claimId },
      data: {
        status: "PAID",
        txHash: signature,
        lamports: lamports.toString(),
        solUsdRate,
        paidAt: new Date(),
        failure: null,
      },
    });

    return { signature };
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 500) : "Unknown payout error";

    if (submitted) {
      // Broadcast but not recorded. Returning this to ELIGIBLE would risk
      // paying twice, so it parks in REVIEW for a human to settle on chain.
      await prisma.claim.update({
        where: { id: claimId },
        data: { status: "REVIEW", txHash: submitted, failure: reason },
      });
      throw new PayoutError(
        "Your payout was sent but we could not confirm it. We're checking — you will not be paid twice.",
      );
    }

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

/** Live treasury balance in lamports, for the stats strip. */
export async function treasuryLamports(): Promise<bigint | null> {
  try {
    return BigInt(await connection().getBalance(treasury().publicKey));
  } catch {
    // No treasury configured yet (or RPC down) — the UI hides the figure.
    return null;
  }
}
