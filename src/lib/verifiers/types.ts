import type { ServiceId } from "../services";

/** What the browser needs in order to run a verification. */
export type VerificationStart = {
  sessionId: string;
  /** Deep link / QR target the user opens to run the proof on their device. */
  requestUrl: string;
  mode: "mock" | "reclaim";
};

/**
 * The only facts we keep from a proof. Notably absent: email, name, session
 * cookies, anything that identifies the human rather than the subscription.
 */
export type VerifiedSubscription = {
  sessionId: string;
  /** Raw, stable account id. Hashed into a nullifier immediately, never stored. */
  accountId: string;
  /** The plan string the provider reported, e.g. "chatgpt-plus". */
  plan: string;
  /** When the attestor signed the claim. */
  issuedAt: Date;
  /** Stable digest of the proof itself, used to reject replays. */
  proofHash: string;
};

export interface SubscriptionVerifier {
  readonly mode: "mock" | "reclaim";
  /** Creates a verification session for a service. */
  start(serviceId: ServiceId): Promise<VerificationStart>;
  /** Validates whatever the verification flow posted back to us. */
  verify(serviceId: ServiceId, payload: unknown): Promise<VerifiedSubscription>;
}

export class VerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VerificationError";
  }
}
