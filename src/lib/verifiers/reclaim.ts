import { createHash } from "node:crypto";
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

/**
 * The domain each service's proof must actually be about.
 *
 * Content validation below is not done through the SDK's hash list (see
 * `verify`), so this is part of what replaces it: a proof whose request went
 * somewhere other than the service's own domain is refused.
 */
const EXPECTED_HOSTS: Record<ServiceId, string[]> = {
  chatgpt: ["chatgpt.com", "chat.openai.com", "openai.com"],
  claude: ["claude.ai", "anthropic.com"],
  grok: ["grok.com", "x.com"],
};

/** Checked in order; first non-empty match wins. */
const ACCOUNT_ID_ALIASES = [
  "accountId", "account_id", "userId", "user_id", "orgId", "org_id", "uuid", "uid", "id", "sub", "email",
];
const PLAN_ALIASES = [
  "plan", "planType", "plan_type", "accountPlan", "membershipTier",
  "memberShipTier", "membership_tier", "tier", "subscription",
  "subscriptionPlan", "subscription_plan", "subscription_tier", "subscriptionTier",
  "rate_limit_tier", "rateLimitTier", "planName",
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

    // Setting a callback URL tells Reclaim to deliver the proof there *instead*
    // of storing it on the session. That is what we want in production, where
    // the browser then never handles the proof and cannot tamper with it.
    //
    // But if the URL is not reachable from the internet — localhost in
    // development — delivery fails, the user sees "Proof submission failed",
    // and the proof is lost even though it generated correctly. In that case
    // we leave the default in place and collect the proof by polling instead.
    if (isPubliclyReachable(env.appUrl)) {
      const callback = new URL("/api/verify/callback", env.appUrl);
      callback.searchParams.set("service", serviceId);
      proofRequest.setAppCallbackUrl(callback.toString(), true);
    } else {
      console.info(
        `[reclaim] ${env.appUrl} is not reachable from the internet; collecting proofs by polling instead of callback.`,
      );
    }

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

    // Step 1: the cryptography. This confirms real Reclaim attestors signed
    // this claim, which is the part that cannot be forged.
    //
    // Content validation is disabled here deliberately. It compares the
    // proof's provider hash against the list published for the provider
    // version — and catalog providers routinely publish none (this one returns
    // an empty list), so enabling it rejects every valid proof. Steps 2-4
    // below re-impose that binding ourselves instead of trusting blindly.
    const result = await verifyProof(proof, { dangerouslyDisableContentValidation: true });
    if (!result.isVerified) {
      throw new VerificationError(
        `Proof failed attestor verification: ${result.error?.message ?? "unknown reason"}`,
      );
    }

    // The context is covered by the claim identifier the attestors signed, so
    // anything read out of it is as trustworthy as the signature itself.
    const context = parseContext(proof);

    // Step 2: the proof must come from the provider we asked for. Pinning the
    // hash is what stops a proof generated against some other, weaker provider
    // from being passed off as this one.
    //
    // Proofs from AI-built providers carry no provider hash, so for those we
    // pin a digest of the signed request shape instead: the URL, method and
    // the match and redaction rules. That is the part a weaker provider would
    // have to differ in, and it is covered by the attestor signatures.
    const observedHash = context.providerHash ?? requestShapeHash(proof);
    const pinnedHash = process.env[`RECLAIM_PROVIDER_HASH_${serviceId.toUpperCase()}`];
    if (pinnedHash) {
      if (observedHash.toLowerCase() !== pinnedHash.toLowerCase()) {
        throw new VerificationError("This proof was produced by a different provider.");
      }
    } else if (process.env.NODE_ENV === "production") {
      throw new VerificationError(
        `Refusing to accept proofs for ${serviceId} without RECLAIM_PROVIDER_HASH_${serviceId.toUpperCase()} pinned.`,
      );
    } else {
      console.warn(
        `[reclaim] ${serviceId}: no pinned provider hash. Observed ${observedHash}. Set RECLAIM_PROVIDER_HASH_${serviceId.toUpperCase()} to lock it.`,
      );
    }

    // Step 3: the request must have gone to the service's own domain.
    assertExpectedHost(serviceId, proof);

    // Step 4: the proof must belong to our Reclaim application.
    const appId = context.attestationNonceData?.applicationId;
    if (appId && appId.toLowerCase() !== env.reclaimAppId.toLowerCase()) {
      throw new VerificationError("This proof was issued for a different application.");
    }

    const params = (context.extractedParameters ??
      result.data[0]?.extractedParameters ??
      {}) as Record<string, string>;

    const accountId = pick(params, ACCOUNT_ID_ALIASES, process.env.RECLAIM_PARAM_ACCOUNT_ID);
    const plan = pick(params, PLAN_ALIASES, process.env.RECLAIM_PARAM_PLAN);
    const status = pick(params, STATUS_ALIASES, process.env.RECLAIM_PARAM_STATUS);

    // A provider may prove the subscription status without the plan name;
    // resolvePlanTier then prices it at the cheapest tier.
    if (!accountId || (!plan && !status)) {
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

    const sessionId = String(context.reclaimSessionId ?? "");
    if (!sessionId) {
      throw new VerificationError("Proof carried no Reclaim session id.");
    }

    return {
      sessionId,
      accountId,
      plan: plan ?? "",
      status,
      // timestampS is when the attestor signed; it is what freshness is judged on.
      issuedAt: new Date(proof.claimData.timestampS * 1000),
      // The claim identifier is unique per proof, which makes it a sound replay guard.
      proofHash: proof.identifier,
    };
  }
}

type ProofContext = {
  reclaimSessionId?: string;
  providerHash?: string;
  extractedParameters?: Record<string, string>;
  attestationNonceData?: { applicationId?: string };
};

/** The signed context, which carries the revealed values and the provider hash. */
function parseContext(proof: Proof): ProofContext {
  const raw = proof.claimData.context;
  if (!raw) return {};
  try {
    return (typeof raw === "string" ? JSON.parse(raw) : raw) as ProofContext;
  } catch {
    throw new VerificationError("Proof context could not be read.");
  }
}

/** Digest of the signed request a proof covers, for providers that report no hash. */
function requestShapeHash(proof: Proof): string {
  let params: Record<string, unknown>;
  try {
    params = JSON.parse(String(proof.claimData.parameters ?? "{}"));
  } catch {
    throw new VerificationError("Proof parameters could not be read.");
  }
  const shape = {
    provider: proof.claimData.provider,
    url: params.url,
    method: params.method,
    responseMatches: params.responseMatches,
    responseRedactions: params.responseRedactions,
  };
  return createHash("sha256").update(JSON.stringify(shape)).digest("hex");
}

/** Refuses a proof whose underlying request did not target the service. */
function assertExpectedHost(serviceId: ServiceId, proof: Proof): void {
  let url: string | undefined;
  try {
    const params = JSON.parse(String(proof.claimData.parameters ?? "{}")) as { url?: string };
    url = params.url;
  } catch {
    throw new VerificationError("Proof parameters could not be read.");
  }
  if (!url) throw new VerificationError("Proof does not say which URL it covers.");

  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  const allowed = EXPECTED_HOSTS[serviceId];
  if (!allowed.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
    throw new VerificationError(
      `This proof is about ${host}, not ${serviceId}.`,
    );
  }
}

/**
 * Whether Reclaim's servers could POST to this URL.
 *
 * Loopback and private-range addresses cannot receive a callback from the
 * outside world, so asking Reclaim to use one silently throws the proof away.
 */
function isPubliclyReachable(appUrl: string): boolean {
  let host: string;
  try {
    host = new URL(appUrl).hostname.toLowerCase();
  } catch {
    return false;
  }

  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return false;
  if (host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") return false;
  // RFC1918 and link-local ranges.
  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;

  return true;
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
