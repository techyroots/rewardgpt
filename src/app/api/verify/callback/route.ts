import { NextResponse } from "next/server";
import { isServiceId } from "@/lib/services";
import { getVerifier, VerificationError } from "@/lib/verifiers";
import { ingestProof } from "@/lib/verify-flow";

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

  let proof;
  try {
    proof = await getVerifier().verify(serviceId, payload);
  } catch (error) {
    const message =
      error instanceof VerificationError ? error.message : "Verification failed.";
    if (!(error instanceof VerificationError)) {
      console.error("verify/callback failed", error);
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const result = await ingestProof(serviceId, proof);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.rejected ? 409 : 400 });
  }
  return NextResponse.json({ ok: true, claimId: result.claimId, amountCents: result.amountCents });
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
