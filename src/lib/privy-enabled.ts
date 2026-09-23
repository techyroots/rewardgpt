/**
 * Whether wallet connect is configured.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time, so this is a constant: it
 * can safely decide which component to render without breaking hook order.
 * Without it, Privy's hooks would run outside their provider and every
 * interactive surface would fail in a confusing way.
 */
export const PRIVY_ENABLED = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
