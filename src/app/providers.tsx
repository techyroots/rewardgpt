"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import type { ReactNode } from "react";

// Without registering Solana connectors, Privy cannot see wallet extensions
// the user already has installed, and offers to install one instead.
const solanaConnectors = toSolanaWalletConnectors();

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function Providers({ children }: { children: ReactNode }) {
  // Without an app id Privy throws on mount, which would take the landing page
  // with it. Rendering the page unauthenticated is the better failure mode.
  if (!appId) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // Only the methods actually enabled on the Privy dashboard. Listing a
        // disabled provider just renders a button that fails, so enable it
        // there first, then add it here.
        loginMethods: ["wallet", "email"],
        // Cashback is paid in SOL, so the wallet we collect has to be a Solana
        // one. Someone with no wallet at all gets an embedded one created.
        embeddedWallets: { solana: { createOnLogin: "users-without-wallets" } },
        externalWallets: { solana: { connectors: solanaConnectors } },
        appearance: {
          theme: "light",
          accentColor: "#111111",
          logo: "/logo-mark.svg",
          walletChainType: "solana-only",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
