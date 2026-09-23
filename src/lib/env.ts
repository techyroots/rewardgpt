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

  get treasuryPrivateKey(): `0x${string}` {
    const key = required("TREASURY_PRIVATE_KEY");
    if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
      throw new Error("TREASURY_PRIVATE_KEY must be a 0x-prefixed 32-byte hex string.");
    }
    return key as `0x${string}`;
  },
  get rpcUrl(): string | undefined {
    return process.env.RPC_URL;
  },
  /** Base mainnet unless explicitly told otherwise. */
  get useTestnet(): boolean {
    return process.env.CHAIN === "base-sepolia";
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
