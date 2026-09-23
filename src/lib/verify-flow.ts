import { prisma } from "./db";
import { IneligibleError, recordEligibility } from "./eligibility";
import type { ServiceId } from "./services";
import { VerificationError, type VerifiedSubscription } from "./verifiers";

export type IngestResult =
  | { ok: true; claimId: string; amountCents: number }
  | { ok: false; rejected: boolean; message: string };

/**
 * Records a verified proof and stamps the outcome on its session.
 *
 * Shared by both routes a proof can arrive through: Reclaim's callback, and
 * our own polling of the Reclaim session. Keeping it in one place means the
 * two paths can never disagree about whether a proof was accepted.
 */
export async function ingestProof(
  serviceId: ServiceId,
  proof: VerifiedSubscription,
): Promise<IngestResult> {
  try {
    const { claimId, amountCents } = await recordEligibility(serviceId, proof);
    return { ok: true, claimId, amountCents };
  } catch (error) {
    const rejected = error instanceof IneligibleError;
    const message =
      rejected || error instanceof VerificationError
        ? (error as Error).message
        : "Verification failed. Please try again.";

    if (!rejected && !(error instanceof VerificationError)) {
      console.error("ingestProof failed", error);
    }

    await markSessionFailed(proof.sessionId, rejected, message);
    return { ok: false, rejected, message };
  }
}

export async function markSessionFailed(
  sessionId: string,
  rejected: boolean,
  message: string,
): Promise<void> {
  await prisma.verificationSession
    .updateMany({
      where: { id: sessionId, consumedAt: null },
      data: {
        status: rejected ? "REJECTED" : "FAILED",
        message,
        consumedAt: new Date(),
      },
    })
    .catch(() => undefined);
}
