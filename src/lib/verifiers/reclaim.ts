import { ReclaimProofRequest, verifyProof, type Proof } from "@reclaimprotocol/js-sdk";
import { env } from "../env";
import type { ServiceId } from "../services";
import { VerificationError, type SubscriptionVerifier, type VerificationStart, type VerifiedSubscription } from "./types";

/**
 * zkTLS verification via Reclaim.
 *
 * The user runs the proof on their own device against the real chatgpt.com /
 * claude.ai / grok.com, so no credential ever reaches us. What comes back is a
 * signed attestation over a handful of revealed bytes.
 *
 * Each service's Reclaim provider must be configured to expose exactly two
 * extracted parameters — `accountId` and `plan` — and optionally `status`.
 * That naming is the contract between the dashboard config and this file.
 */
export class ReclaimVerifier implements SubscriptionVerifier {
  readonly mode = "reclaim" as const;

  async start(serviceId: ServiceId): Promise<VerificationStart> {
    const proofRequest = await ReclaimProofRequest.init(
      env.reclaimAppId,
      env.reclaimAppSecret,
      env.reclaimProviderId(serviceId),
    );

    // Reclaim posts the finished proof straight to our backend, so the browser
    // never handles it and can't tamper with it in transit.
    const callback = new URL("/api/verify/callback", env.appUrl);
    callback.searchParams.set("service", serviceId);
    proofRequest.setAppCallbackUrl(callback.toString(), true);

    return {
      sessionId: proofRequest.getSessionId(),
      requestUrl: await proofRequest.getRequestUrl(),
      mode: this.mode,
    };
  }

  async verify(serviceId: ServiceId, payload: unknown): Promise<VerifiedSubscription> {
    const proof = normalizeProof(payload);

    const result = await verifyProof(proof, {
      providerId: env.reclaimProviderId(serviceId),
    });
    if (!result.isVerified) {
      throw new VerificationError(
        `Proof failed attestor verification: ${result.error?.message ?? "unknown reason"}`,
      );
    }

    const trusted = result.data[0];
    if (!trusted) {
      throw new VerificationError("Proof carried no verified data.");
    }

    const params = trusted.extractedParameters ?? {};
    const accountId = params.accountId;
    const plan = params.plan;
    if (!accountId || !plan) {
      throw new VerificationError(
        "Proof is missing accountId or plan. Check the Reclaim provider's extracted parameters.",
      );
    }

    const sessionId = String(
      (trusted.context as { reclaimSessionId?: unknown })?.reclaimSessionId ?? "",
    );
    if (!sessionId) {
      throw new VerificationError("Proof carried no Reclaim session id.");
    }

    return {
      sessionId,
      accountId,
      plan,
      // timestampS is when the attestor signed; it is what freshness is judged on.
      issuedAt: new Date(proof.claimData.timestampS * 1000),
      // The claim identifier is unique per proof, which makes it a sound replay guard.
      proofHash: proof.identifier,
    };
  }
}

/** Reclaim's callback delivers the proof as JSON, sometimes string-encoded. */
function normalizeProof(payload: unknown): Proof {
  let candidate: unknown = payload;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      throw new VerificationError("Callback body was not valid JSON.");
    }
  }
  if (Array.isArray(candidate)) candidate = candidate[0];

  const proof = candidate as Proof | undefined;
  if (!proof?.claimData || !proof.identifier || !proof.signatures) {
    throw new VerificationError("Callback body was not a Reclaim proof.");
  }
  return proof;
}
