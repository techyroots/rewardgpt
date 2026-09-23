"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCreateWallet } from "@privy-io/react-auth/solana";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/client-api";
import { formatUsd, getServiceDefinition, type ServiceId } from "@/lib/services";
import { usePayoutWallet } from "./ConnectButton";
import { SERVICE_MARKS } from "./logos";

type Stage = "connect" | "intro" | "starting" | "awaiting" | "eligible" | "claiming" | "paid" | "error";

type Claim = {
  id: string;
  amountCents: number;
  status: string;
  txHash: string | null;
  /** Set once paid: the SOL actually sent, and where to view the transaction. */
  solAmount?: string | null;
  explorerUrl?: string | null;
};

type StatusResponse = {
  status: "PENDING" | "SUCCESS" | "REJECTED" | "FAILED";
  message: string | null;
  claim: Claim | null;
};

const POLL_INTERVAL_MS = 3000;

export function VerifyDialog({
  serviceId,
  onClose,
}: {
  serviceId: ServiceId | null;
  onClose: () => void;
}) {
  const { authenticated, login } = usePrivy();
  const { createWallet } = useCreateWallet();
  const wallet = usePayoutWallet();
  const api = useApi();

  const [stage, setStage] = useState<Stage>("intro");
  const [error, setError] = useState<string | null>(null);
  const [requestUrl, setRequestUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"mock" | "reclaim">("reclaim");
  const [claim, setClaim] = useState<Claim | null>(null);
  // Where the cashback will actually go, as resolved by the server.
  const [payoutWallet, setPayoutWallet] = useState<string | null>(null);
  const sessionRef = useRef<string | null>(null);

  // Reset whenever a different service is opened.
  useEffect(() => {
    if (!serviceId) return;
    setStage(authenticated && wallet ? "intro" : "connect");
    setError(null);
    setRequestUrl(null);
    setClaim(null);
    setPayoutWallet(null);
    sessionRef.current = null;
  }, [serviceId, authenticated, wallet]);

  const startVerification = useCallback(async () => {
    if (!serviceId) return;
    setStage("starting");
    setError(null);
    try {
      const started = await api<{
        sessionId: string;
        requestUrl: string;
        mode: "mock" | "reclaim";
        wallet: string;
      }>("/api/verify/start", { method: "POST", body: { serviceId } });
      sessionRef.current = started.sessionId;
      setPayoutWallet(started.wallet);
      setRequestUrl(started.requestUrl);
      setMode(started.mode);
      setStage("awaiting");
      window.open(started.requestUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start verification.");
      setStage("error");
    }
  }, [api, serviceId]);

  // Poll while the user proves their subscription on their own device.
  useEffect(() => {
    if (stage !== "awaiting" || !sessionRef.current) return;
    let cancelled = false;

    const timer = setInterval(async () => {
      try {
        const status = await api<StatusResponse>(
          `/api/verify/status?sessionId=${encodeURIComponent(sessionRef.current!)}`,
        );
        if (cancelled) return;
        if (status.status === "SUCCESS" && status.claim) {
          setClaim(status.claim);
          setStage(status.claim.status === "PAID" ? "paid" : "eligible");
        } else if (status.status === "REJECTED" || status.status === "FAILED") {
          setError(status.message ?? "Verification did not succeed.");
          setStage("error");
        }
      } catch {
        // Transient polling failures are not worth interrupting the user for.
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [stage, api]);

  const claimCashback = useCallback(async () => {
    if (!claim) return;
    setStage("claiming");
    setError(null);
    try {
      const result = await api<{ signature: string; solAmount: string; explorerUrl: string }>(
        "/api/claim",
        { method: "POST", body: { claimId: claim.id } },
      );
      setClaim({
        ...claim,
        status: "PAID",
        txHash: result.signature,
        solAmount: result.solAmount,
        explorerUrl: result.explorerUrl,
      });
      setStage("paid");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your cashback.");
      setStage("eligible");
    }
  }, [api, claim]);

  if (!serviceId) return null;

  const service = getServiceDefinition(serviceId);
  const Mark = SERVICE_MARKS[serviceId];
  const reward = Math.floor((service.priceUsdCents * service.cashbackBps) / 10_000);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/25 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Verify your ${service.name} subscription`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-in w-full max-w-md rounded-2xl border border-line bg-surface p-6 card-float">
        <div className="flex items-start gap-3">
          <Mark className="size-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold tracking-tight">{service.planLabel}</h2>
            <p className="text-sm text-muted">
              {formatUsd(reward)} back on {formatUsd(service.priceUsdCents)} a month
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-full p-1.5 text-muted transition hover:bg-foreground/5 hover:text-foreground"
          >
            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <Stepper stage={stage} />

        <div key={stage} className="step-in mt-5">
          {stage === "connect" && !authenticated && (
            <Body
              title="Connect a wallet first"
              text="Your cashback is sent straight to it. You can use an existing wallet or have one created for you."
              action={{ label: "Connect Wallet", onClick: () => login() }}
            />
          )}

          {/* Signed in by email but with no wallet yet — which is what happens
              when embedded wallets are not created automatically. Without this
              there is nowhere to send the cashback and no way forward. */}
          {stage === "connect" && authenticated && !wallet && (
            <Body
              title="You need a wallet to get paid"
              text="Create one in a tap, or connect a wallet you already have."
              action={{
                label: "Create a wallet",
                onClick: () => {
                  createWallet().catch(() => setError("Could not create a wallet."));
                },
              }}
            />
          )}

          {stage === "intro" && (
            <Body
              title="Prove it privately"
              text={`You'll sign in to ${service.name} on their real website, in your own browser. We never see your email, password or session — only that a paid plan is active.`}
              action={{ label: "Start verification", onClick: startVerification }}
            />
          )}

          {stage === "starting" && <Body title="Preparing…" text="Setting up your verification session." />}

          {stage === "awaiting" && (
            <Body
              title="Waiting for your proof"
              text={
                mode === "mock"
                  ? "A simulated verification page opened in a new tab. Complete it there and this will update automatically."
                  : `Finish the verification in the tab that just opened. Once ${service.name} confirms your plan, this updates automatically.`
              }
            >
              <div className="flex items-center gap-2 text-sm text-muted">
                <Spinner />
                <span>Listening for your proof…</span>
              </div>
              {requestUrl && (
                <a
                  href={requestUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-sm font-medium text-accent underline underline-offset-4"
                >
                  Reopen verification
                </a>
              )}
            </Body>
          )}

          {stage === "eligible" && claim && (
            <Body
              title="You're eligible"
              text={`${formatUsd(claim.amountCents)} of SOL is ready to send to ${payoutWallet ? `${payoutWallet.slice(0, 4)}…${payoutWallet.slice(-4)}` : "your linked wallet"}.`}
              action={{ label: `Claim ${formatUsd(claim.amountCents)}`, onClick: claimCashback }}
            />
          )}

          {stage === "claiming" && <Body title="Sending…" text="Your cashback is on its way. This takes a few seconds." />}

          {stage === "paid" && claim && (
            <SuccessTick />
          )}

          {stage === "paid" && claim && (
            <Body
              title="Cashback sent"
              text={`${claim.solAmount ? `${claim.solAmount} SOL` : formatUsd(claim.amountCents)} is on its way to your wallet.`}
            >
              {claim.txHash && (
                <a
                  href={claim.explorerUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-accent underline underline-offset-4"
                >
                  View transaction
                </a>
              )}
            </Body>
          )}

          {stage === "error" && (
            <Body
              title="That didn't work"
              text={error ?? "Something went wrong."}
              action={{ label: "Try again", onClick: () => setStage("intro") }}
            />
          )}

          {error && stage === "eligible" && (
            <p className="mt-3 text-sm text-accent-warm">{error}</p>
          )}
        </div>

        <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-muted-soft">
          Your password and session never leave your device. The account identifier in
          your proof is hashed on arrival and never stored, so a subscription can only
          claim once.
        </p>
      </div>
    </div>
  );
}

function Body({
  title,
  text,
  action,
  children,
}: {
  title: string;
  text: string;
  action?: { label: string; onClick: () => void };
  children?: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-[15px] font-medium">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
      {children && <div className="mt-4">{children}</div>}
      {action && (
        <button
          onClick={action.onClick}
          className="press mt-5 w-full rounded-full bg-foreground px-5 py-3 text-sm font-medium text-white transition hover:bg-foreground/90"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/** Where the user is in the three-step flow. */
function Stepper({ stage }: { stage: Stage }) {
  const current =
    stage === "connect" ? 0 : stage === "paid" ? 2 : stage === "eligible" || stage === "claiming" ? 2 : 1;

  return (
    <ol className="mt-5 flex items-center gap-2" aria-label="Progress">
      {["Connect", "Verify", "Claim"].map((label, index) => {
        const done = index < current || stage === "paid";
        const active = index === current && stage !== "paid";
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                done ? "bg-accent" : active ? "bg-foreground/35" : "bg-foreground/10"
              }`}
            />
            <span
              className={`text-[10.5px] font-medium tracking-wide uppercase transition-colors duration-500 ${
                done ? "text-accent" : active ? "text-foreground" : "text-muted-soft"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function SuccessTick() {
  return (
    <div className="mb-4 flex justify-center">
      <svg viewBox="0 0 48 48" className="size-12" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="22" className="tick-ring" fill="#ecfdf5" stroke="#10a37f" strokeWidth="1.5" />
        <path
          d="m15.5 24.5 6 6 11-12"
          className="tick-path"
          stroke="#10a37f"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 animate-spin" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
      <path d="M8 1.5A6.5 6.5 0 0 1 14.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
