import { NextResponse } from "next/server";
import { authenticate, AuthError, requireOwnedWallet } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isServiceId } from "@/lib/services";
import { getVerifier } from "@/lib/verifiers";

export const runtime = "nodejs";

/** Opens a verification session and hands the browser something to open. */
export async function POST(request: Request) {
  try {
    const user = await authenticate(request);
    const body = (await request.json()) as { serviceId?: string; wallet?: string };

    if (!isServiceId(body.serviceId)) {
      return NextResponse.json({ error: "Unknown service." }, { status: 400 });
    }
    const wallet = requireOwnedWallet(user, body.wallet ?? "");

    const service = await prisma.service.findUnique({ where: { id: body.serviceId } });
    if (!service?.enabled) {
      return NextResponse.json({ error: "That service is not available." }, { status: 400 });
    }

    const verifier = getVerifier();
    const started = await verifier.start(body.serviceId);

    await prisma.verificationSession.create({
      data: {
        id: started.sessionId,
        privyUserId: user.privyUserId,
        wallet,
        serviceId: body.serviceId,
      },
    });

    return NextResponse.json(started);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("verify/start failed", error);
    return NextResponse.json(
      { error: "Could not start verification. Please try again." },
      { status: 500 },
    );
  }
}
