import { fetchStatusUrl, ReclaimProofRequest, verifyProof, type Proof } from "@reclaimprotocol/js-sdk";
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
 * Providers from Reclaim's public catalog are written by third parties, so we
 * do not control what they call their extracted parameters — one calls the
 * account `accountId`, another `userId`. Rather than require a specific
 * naming, we resolve each field from a list of aliases, overridable per
 * service with RECLAIM_PARAM_ACCOUNT_ID / RECLAIM_PARAM_PLAN when a provider
 * uses something unexpected.
 */

/** Checked in order; first non-empty match wins. */
const ACCOUNT_ID_ALIASES = [
  "accountId", "account_id", "userId", "user_id", "uid", "id", "sub", "email",
];
const PLAN_ALIASES = [
  "plan", "planType", "plan_type", "accountPlan", "membershipTier",
  "memberShipTier", "membership_tier", "tier", "subscription",
  "subscriptionPlan", "subscription_plan", "planName",
];
const STATUS_ALIASES = ["status", "subscriptionStatus", "subscription_status", "state", "isActive"];

function pick(
  params: Record<string, string>,
  aliases: string[],
  override?: string,
): string | undefined {
  if (override) return params[override]?.trim() || undefined;
  // Case-insensitive, since provider authors are inconsistent about casing.
  const lowered = new Map(
    Object.entries(params).map(([key, value]) => [key.toLowerCase(), value]),
  );
  for (const alias of aliases) {
    const value = lowered.get(alias.toLowerCase());
    if (value && String(value).trim()) return String(value).trim();
  }
  return undefined;
}
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

  /**
   * Pulls a finished proof from Reclaim's session status.
   *
   * Reclaim posts proofs to `setAppCallbackUrl`, which it cannot do when the
   * app is on localhost. Polling covers that, and doubles as a safety net in
   * production if a callback is ever dropped.
   */
  async poll(serviceId: ServiceId, sessionId: string): Promise<VerifiedSubscription | null> {
    let status;
    try {
      status = await fetchStatusUrl(sessionId);
    } catch {
      return null; // Session not ready yet, or a transient Reclaim error.
    }

    const proofs = status.session?.proofs;
    if (!proofs?.length) {
      const error = status.session?.error;
      if (error) {
        throw new VerificationError(error.message || "Verification failed on Reclaim's side.");
      }
      return null;
    }

    return this.verify(serviceId, proofs[0]);
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

    const params = (trusted.extractedParameters ?? {}) as Record<string, string>;

    const accountId = pick(params, ACCOUNT_ID_ALIASES, process.env.RECLAIM_PARAM_ACCOUNT_ID);
    const plan = pick(params, PLAN_ALIASES, process.env.RECLAIM_PARAM_PLAN);
    const status = pick(params, STATUS_ALIASES, process.env.RECLAIM_PARAM_STATUS);

    if (!accountId || !plan) {
      // Log the keys (not the values) so the right alias can be added without
      // a second round trip through a real verification.
      console.error(
        `[reclaim] ${serviceId}: could not resolve account id / plan. Provider returned keys: [${Object.keys(params).join(", ")}]`,
      );
      throw new VerificationError(
        "We could not read your plan from that proof. This provider reports fields we don't recognise yet.",
      );
    }

    console.info(
      `[reclaim] ${serviceId}: resolved plan from provider keys [${Object.keys(params).join(", ")}]`,
    );

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
      status,
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
