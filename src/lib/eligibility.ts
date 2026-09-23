import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { env } from "./env";
import { deriveNullifier } from "./nullifier";
import { cashbackCents, type ServiceId } from "./services";
import { isPaidPlan, type VerifiedSubscription } from "./verifiers";

export class IneligibleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IneligibleError";
  }
}

/**
 * Turns a verified proof into an eligible claim, or explains why not.
 *
 * Every rule that decides whether money moves lives here, so there is one
 * place to audit. Order matters: cheap checks first, the nullifier last,
 * because that is the one that permanently consumes a subscription.
 */
export async function recordEligibility(
  serviceId: ServiceId,
  proof: VerifiedSubscription,
): Promise<{ claimId: string; amountCents: number }> {
  const session = await prisma.verificationSession.findUnique({
    where: { id: proof.sessionId },
  });
  if (!session) {
    throw new IneligibleError("No verification session matches this proof.");
  }
  if (session.consumedAt) {
    throw new IneligibleError("This verification session has already been used.");
  }
  if (session.serviceId !== serviceId) {
    throw new IneligibleError("This proof is for a different service.");
  }

  // Freshness: an old proof may describe a subscription that has since lapsed.
  const ageMinutes = (Date.now() - proof.issuedAt.getTime()) / 60_000;
  if (ageMinutes > env.proofMaxAgeMinutes) {
    throw new IneligibleError("This proof is too old. Please verify again.");
  }
  if (ageMinutes < -5) {
    throw new IneligibleError("This proof is timestamped in the future.");
  }

  if (!isPaidPlan(serviceId, proof.plan, proof.status)) {
    throw new IneligibleError(
      "We could not find an active paid subscription on that account.",
    );
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.enabled) {
    throw new IneligibleError("That service is not accepting claims right now.");
  }

  await assertCooldownElapsed(session.wallet, serviceId);

  const amountCents = cashbackCents(service.priceUsdCents, service.cashbackBps);
  if (amountCents <= 0) {
    throw new IneligibleError("Cashback for that service is currently zero.");
  }

  // The raw account id stops here: it is hashed and the plaintext is dropped.
  const nullifier = deriveNullifier(serviceId, proof.accountId);

  try {
    const claim = await prisma.claim.create({
      data: {
        privyUserId: session.privyUserId,
        wallet: session.wallet,
        serviceId,
        nullifier,
        proofHash: proof.proofHash,
        amountCents,
        status: "ELIGIBLE",
      },
    });

    await prisma.verificationSession.update({
      where: { id: session.id },
      data: { status: "SUCCESS", claimId: claim.id, consumedAt: new Date(), message: null },
    });

    return { claimId: claim.id, amountCents };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = String(error.meta?.target ?? "");
      throw new IneligibleError(
        target.includes("proofHash")
          ? "This proof has already been submitted."
          : "This subscription has already claimed cashback.",
      );
    }
    throw error;
  }
}

async function assertCooldownElapsed(wallet: string, serviceId: ServiceId): Promise<void> {
  const cooldownMs = env.claimCooldownDays * 24 * 60 * 60 * 1000;
  const recent = await prisma.claim.findFirst({
    where: {
      wallet,
      serviceId,
      createdAt: { gte: new Date(Date.now() - cooldownMs) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    const nextAt = new Date(recent.createdAt.getTime() + cooldownMs);
    throw new IneligibleError(
      `This wallet already claimed for that service. Next claim available ${nextAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`,
    );
  }
}
