import { NextResponse } from "next/server";
import { authenticate, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/** Polled by the browser while the user is proving on their own device. */
export async function GET(request: Request) {
  try {
    const user = await authenticate(request);
    const sessionId = new URL(request.url).searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });
    }

    const session = await prisma.verificationSession.findUnique({
      where: { id: sessionId },
    });
    // Scope to the owner so a session id can't be used to watch someone else.
    if (!session || session.privyUserId !== user.privyUserId) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const claim = session.claimId
      ? await prisma.claim.findUnique({ where: { id: session.claimId } })
      : null;

    return NextResponse.json({
      status: session.status,
      message: session.message,
      claim: claim && {
        id: claim.id,
        serviceId: claim.serviceId,
        amountCents: claim.amountCents,
        status: claim.status,
        txHash: claim.txHash,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("verify/status failed", error);
    return NextResponse.json({ error: "Could not read status." }, { status: 500 });
  }
}
