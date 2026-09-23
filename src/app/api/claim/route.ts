import { NextResponse } from "next/server";
import { authenticate, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { payClaim, PayoutError } from "@/lib/payout";

export const runtime = "nodejs";

/** Sends the cashback. The user signs nothing and pays no gas. */
export async function POST(request: Request) {
  try {
    const user = await authenticate(request);
    const body = (await request.json()) as { claimId?: string };
    if (!body.claimId) {
      return NextResponse.json({ error: "Missing claimId." }, { status: 400 });
    }

    const claim = await prisma.claim.findUnique({ where: { id: body.claimId } });
    if (!claim || claim.privyUserId !== user.privyUserId) {
      return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    }

    const { txHash } = await payClaim(claim.id);
    return NextResponse.json({ ok: true, txHash });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PayoutError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("claim failed", error);
    return NextResponse.json({ error: "Could not send your cashback." }, { status: 500 });
  }
}

/** The connected user's claim history. */
export async function GET(request: Request) {
  try {
    const user = await authenticate(request);
    const claims = await prisma.claim.findMany({
      where: { privyUserId: user.privyUserId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        serviceId: true,
        amountCents: true,
        status: true,
        txHash: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ claims });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Could not load claims." }, { status: 500 });
  }
}
