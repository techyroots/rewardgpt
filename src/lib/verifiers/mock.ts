import { createHash, randomUUID } from "node:crypto";
import { env } from "../env";
import type { ServiceId } from "../services";
import { VerificationError, type SubscriptionVerifier, type VerificationStart, type VerifiedSubscription } from "./types";

/**
 * Local stand-in for Reclaim.
 *
 * It exists so the wallet → verify → claim → payout path can be built and
 * tested before any Reclaim provider is approved, and so the app can be demoed
 * without an active ChatGPT subscription. It proves nothing, so it refuses to
 * run in production.
 */
export class MockVerifier implements SubscriptionVerifier {
  readonly mode = "mock" as const;

  constructor() {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_VERIFIER !== "yes-i-know") {
      throw new Error(
        "The mock verifier cannot run in production. Set VERIFIER_MODE=reclaim.",
      );
    }
  }

  async start(serviceId: ServiceId): Promise<VerificationStart> {
    const sessionId = randomUUID();
    const url = new URL("/verify/simulate", env.appUrl);
    url.searchParams.set("session", sessionId);
    url.searchParams.set("service", serviceId);
    return { sessionId, requestUrl: url.toString(), mode: this.mode };
  }

  async verify(serviceId: ServiceId, payload: unknown): Promise<VerifiedSubscription> {
    const body = payload as { sessionId?: string; accountId?: string; plan?: string };
    if (!body?.sessionId || !body.accountId || !body.plan) {
      throw new VerificationError("Mock proof is missing sessionId, accountId or plan.");
    }

    return {
      sessionId: body.sessionId,
      accountId: body.accountId,
      plan: body.plan,
      issuedAt: new Date(),
      proofHash: createHash("sha256")
        .update(`mock:${serviceId}:${body.sessionId}:${body.accountId}`)
        .digest("hex"),
    };
  }
}
