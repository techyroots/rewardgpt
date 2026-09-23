/**
 * Environment access.
 *
 * Everything is read lazily so that a missing production secret (a treasury
 * key, say) doesn't stop the landing page or the mock-verifier dev flow from
 * booting. Each accessor throws only when the feature that needs it is used.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. See .env.example for what it should hold.`,
    );
  }
  return value;
}

function optionalInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export type VerifierMode = "mock" | "reclaim";

export const env = {
  /** "mock" lets the whole flow run locally with no Reclaim account. */
  get verifierMode(): VerifierMode {
    return process.env.VERIFIER_MODE === "reclaim" ? "reclaim" : "mock";
  },

  get nullifierPepper(): string {
    return required("NULLIFIER_PEPPER");
  },

  get privyAppId(): string {
    return required("NEXT_PUBLIC_PRIVY_APP_ID");
  },
  get privyAppSecret(): string {
    return required("PRIVY_APP_SECRET");
  },

  get reclaimAppId(): string {
    return required("RECLAIM_APP_ID");
  },
  get reclaimAppSecret(): string {
    return required("RECLAIM_APP_SECRET");
  },
  /** Reclaim provider id per service, e.g. RECLAIM_PROVIDER_CHATGPT. */
  reclaimProviderId(serviceId: string): string {
    return required(`RECLAIM_PROVIDER_${serviceId.toUpperCase()}`);
  },

  /** Base58 secret key, or the JSON byte array the Solana CLI writes. */
  get treasurySecretKey(): string {
    return required("TREASURY_SECRET_KEY");
  },
  get solanaRpcUrl(): string | undefined {
    return process.env.SOLANA_RPC_URL;
  },
  /** devnet unless explicitly pointed at mainnet. */
  get solanaCluster(): "devnet" | "mainnet-beta" {
    return process.env.SOLANA_CLUSTER === "mainnet-beta" ? "mainnet-beta" : "devnet";
  },

  /** Hard ceiling on what the treasury can pay out in a rolling 24h, in cents. */
  get dailyPayoutCapCents(): number {
    return optionalInt("DAILY_PAYOUT_CAP_USD", 500) * 100;
  },
  /** How long a wallet must wait before claiming the same service again. */
  get claimCooldownDays(): number {
    return optionalInt("CLAIM_COOLDOWN_DAYS", 30);
  },
  /** Proofs older than this are rejected outright. */
  get proofMaxAgeMinutes(): number {
    return optionalInt("PROOF_MAX_AGE_MINUTES", 10);
  },

  get appUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  },
};
