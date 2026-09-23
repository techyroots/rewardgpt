"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { base, baseSepolia } from "viem/chains";
import type { ReactNode } from "react";

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const chain = process.env.NEXT_PUBLIC_CHAIN === "base-sepolia" ? baseSepolia : base;

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
        // disabled provider (google, twitter) just renders a button that
        // fails, so enable it there first, then add it here.
        loginMethods: ["wallet", "email"],
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        defaultChain: chain,
        supportedChains: [chain],
        appearance: {
          theme: "light",
          accentColor: "#111111",
          logo: "/logo-mark.svg",
          walletChainType: "ethereum-only",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
