"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCallback } from "react";
import { PRIVY_ENABLED } from "@/lib/privy-enabled";
import { usePayoutWallet } from "./ConnectButton";

/**
 * The hero's primary action.
 *
 * A plain anchor to the services section made the user do the work of
 * realising they still had to connect first. This performs whichever step is
 * actually next: connect a wallet, or pick a service.
 */
export function GetStartedButton() {
  if (!PRIVY_ENABLED) {
    return <Shell label="Get started" onClick={() => scrollToServices()} />;
  }
  return <PrivyGetStarted />;
}

function PrivyGetStarted() {
  const { ready, authenticated, login } = usePrivy();
  const wallet = usePayoutWallet();

  const onClick = useCallback(() => {
    if (!authenticated) {
      login();
      return;
    }
    scrollToServices();
  }, [authenticated, login]);

  const label = !ready
    ? "Loading…"
    : !authenticated
      ? "Connect wallet to start"
      : wallet
        ? "Choose your subscription"
        : "Finish setting up your wallet";

  return <Shell label={label} onClick={onClick} disabled={!ready} />;
}

/**
 * Scrolls to the services and draws attention to them, so the user can see
 * that the click did something even when the section was already on screen.
 */
function scrollToServices() {
  const section = document.getElementById("supported");
  if (!section) return;

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  section.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });

  section.setAttribute("data-highlight", "true");
  window.setTimeout(() => section.removeAttribute("data-highlight"), 1400);
}

function Shell({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="press group inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-white transition hover:bg-foreground/90 disabled:opacity-60"
    >
      {label}
      <svg
        viewBox="0 0 16 16"
        className="size-3.5 transition-transform duration-300 group-hover:translate-x-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
