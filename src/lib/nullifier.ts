import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";
import type { ServiceId } from "./services";

/**
 * Turns the account identifier revealed by a zkTLS proof into a stable,
 * anonymous per-subscription handle.
 *
 * The raw identifier reaches this process inside the proof, is hashed here,
 * and is never written to the database or the logs. Keying the HMAC with a
 * server-side pepper means a leaked database still can't be brute-forced back
 * to account ids, which a bare SHA-256 of a short id would not survive.
 *
 * The service id is part of the input so the same person's ChatGPT and Claude
 * subscriptions produce different nullifiers.
 */
export function deriveNullifier(serviceId: ServiceId, accountId: string): string {
  const normalized = accountId.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Cannot derive a nullifier from an empty account id.");
  }
  return createHmac("sha256", env.nullifierPepper)
    .update(`${serviceId}:${normalized}`)
    .digest("hex");
}

/** Constant-time compare, for anywhere a nullifier is checked against input. */
export function nullifiersEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
