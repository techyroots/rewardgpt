/** Shown in place of interactive UI until Privy credentials are configured. */
export function SetupNotice({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span className="rounded-full border border-dashed border-line-strong px-4 py-2 text-[12.5px] text-muted">
        Wallet setup needed
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-background p-4 text-[13px] leading-relaxed text-muted">
      <p className="font-medium text-foreground">Wallet connect isn&rsquo;t configured yet</p>
      <p className="mt-1">
        Add <code className="rounded bg-foreground/5 px-1 py-0.5 font-mono text-[12px]">NEXT_PUBLIC_PRIVY_APP_ID</code>{" "}
        and <code className="rounded bg-foreground/5 px-1 py-0.5 font-mono text-[12px]">PRIVY_APP_SECRET</code> to your{" "}
        <code className="rounded bg-foreground/5 px-1 py-0.5 font-mono text-[12px]">.env</code>, then restart the dev
        server.
      </p>
    </div>
  );
}
