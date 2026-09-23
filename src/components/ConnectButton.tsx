"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { PRIVY_ENABLED } from "@/lib/privy-enabled";
import { SetupNotice } from "./SetupNotice";

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Returns the wallet cashback should be sent to, or null if there isn't one yet. */
export function usePayoutWallet(): string | null {
  const { wallets } = useWallets();
  return wallets[0]?.address ?? null;
}

export function ConnectButton({ className = "" }: { className?: string }) {
  // PRIVY_ENABLED is a build-time constant, so this branch never changes
  // between renders and the hooks below keep a stable order.
  if (!PRIVY_ENABLED) return <SetupNotice compact />;
  return <PrivyConnectButton className={className} />;
}

function PrivyConnectButton({ className }: { className: string }) {
  const { ready, authenticated, login, logout } = usePrivy();
  const wallet = usePayoutWallet();

  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition disabled:opacity-60";

  if (!ready) {
    return (
      <button disabled className={`${base} bg-foreground/10 text-muted ${className}`}>
        Loading…
      </button>
    );
  }

  if (authenticated) {
    return (
      <button
        onClick={() => logout()}
        title="Disconnect"
        className={`${base} border border-line-strong bg-surface text-foreground hover:bg-foreground/5 ${className}`}
      >
        <span className="size-2 rounded-full bg-accent" />
        {wallet ? shortenAddress(wallet) : "Connected"}
      </button>
    );
  }

  return (
    <button
      onClick={() => login()}
      className={`${base} bg-foreground text-white hover:bg-foreground/90 ${className}`}
    >
      Connect Wallet
    </button>
  );
}
