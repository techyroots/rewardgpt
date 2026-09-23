import { env } from "../env";
import { MockVerifier } from "./mock";
import { ReclaimVerifier } from "./reclaim";
import type { SubscriptionVerifier } from "./types";

let cached: SubscriptionVerifier | undefined;

/** One line to swap the whole verification backend. */
export function getVerifier(): SubscriptionVerifier {
  if (!cached) {
    cached = env.verifierMode === "reclaim" ? new ReclaimVerifier() : new MockVerifier();
  }
  return cached;
}

export * from "./types";
export { isPaidPlan } from "./plans";
