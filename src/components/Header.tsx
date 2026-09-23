"use client";

import { ConnectButton } from "./ConnectButton";
import { RewardGptMark } from "./logos";

const NAV = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Supported AI", href: "#supported" },
  { label: "Rewards", href: "#rewards" },
  { label: "FAQ", href: "#faq" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2">
          <RewardGptMark className="size-7" />
          <span className="text-[17px] font-semibold tracking-tight">RewardGPT</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[13px] text-muted transition hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <ConnectButton />
      </div>
    </header>
  );
}
