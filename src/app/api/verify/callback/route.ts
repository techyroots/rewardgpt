import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { IneligibleError, recordEligibility } from "@/lib/eligibility";
import { isServiceId } from "@/lib/services";
import { getVerifier, VerificationError } from "@/lib/verifiers";

export const runtime = "nodejs";

/**
 * Where a finished proof lands.
 *
 * Reclaim posts here directly from its attestor infrastructure, so this route
 * is deliberately unauthenticated — the proof's own signature is the
 * authentication, and the session id binds it to the wallet that started the
 * flow. Nothing here trusts the caller's identity.
 */
export async function POST(request: Request) {
  const serviceId = new URL(request.url).searchParams.get("service");
  if (!isServiceId(serviceId)) {
    return NextResponse.json({ error: "Unknown service." }, { status: 400 });
  }

  const payload = await readPayload(request);
  let sessionId: string | undefined;

  try {
    const verifier = getVerifier();
    const proof = await verifier.verify(serviceId, payload);
    sessionId = proof.sessionId;

    const { claimId, amountCents } = await recordEligibility(serviceId, proof);
    return NextResponse.json({ ok: true, claimId, amountCents });
  } catch (error) {
    const rejected = error instanceof IneligibleError;
    const message = rejected
      ? error.message
      : error instanceof VerificationError
        ? error.message
        : "Verification failed. Please try again.";

    if (!rejected && !(error instanceof VerificationError)) {
      console.error("verify/callback failed", error);
    }

    // Record the outcome so the waiting browser can stop polling and show why.
    if (sessionId) {
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

    return NextResponse.json({ error: message }, { status: rejected ? 409 : 400 });
  }
}

/** Reclaim may send JSON or a urlencoded `proof` field depending on config. */
async function readPayload(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return request.json();
  }
  const text = await request.text();
  try {
    return JSON.parse(text);
  } catch {
    const params = new URLSearchParams(text);
    return params.get("proof") ?? text;
  }
}
