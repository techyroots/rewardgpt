import { PrivyClient } from "@privy-io/server-auth";
import { env } from "./env";
import { isSolanaAddress } from "./solana";

/**
 * Privy replaces the usual SIWE nonce/session dance: the browser already holds
 * a signed access token, so API routes just verify it server-side.
 *
 * Two tokens are involved:
 *  - the access token proves *who* the caller is (userId)
 *  - the identity token carries the user's linked accounts, which lets us check
 *    a submitted wallet actually belongs to them without an extra API call that
 *    would be rate limited.
 */

let client: PrivyClient | undefined;

function privy(): PrivyClient {
  if (!client) {
    client = new PrivyClient(env.privyAppId, env.privyAppSecret);
  }
  return client;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export type AuthenticatedUser = {
  privyUserId: string;
  /** Lower-cased wallet addresses linked to this Privy account. */
  wallets: string[];
};

export async function authenticate(request: Request): Promise<AuthenticatedUser> {
  const header = request.headers.get("authorization");
  const accessToken = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!accessToken) {
    throw new AuthError("Missing Privy access token.");
  }

  let privyUserId: string;
  try {
    const claims = await privy().verifyAuthToken(accessToken);
    privyUserId = claims.userId;
  } catch {
    throw new AuthError("Invalid or expired session. Please reconnect your wallet.");
  }

  const idToken = request.headers.get("privy-id-token") ?? undefined;
  let wallets: string[] = [];
  let source = "none";

  // Preferred path: the identity token carries linked accounts with no API call.
  if (idToken) {
    try {
      wallets = walletsOf(await privy().getUser({ idToken }));
      source = "identity-token";
    } catch {
      wallets = [];
    }
  }

  // Fallback: ask Privy directly. This is rate limited, so it only runs when
  // the identity token is absent or unusable — which is the case whenever
  // identity tokens are not enabled for the app.
  if (wallets.length === 0) {
    try {
      wallets = walletsOf(await privy().getUser(privyUserId));
      source = "user-lookup";
    } catch (error) {
      console.error("Could not load linked accounts for", privyUserId, error);
    }
  }

  if (wallets.length === 0) {
    console.warn(
      `[auth] no linked wallets for ${privyUserId} (idToken ${idToken ? "present" : "absent"}, source ${source})`,
    );
  }

  return { privyUserId, wallets };
}

/** Linked Solana wallet addresses. Embedded and external both count. */
function walletsOf(user: { linkedAccounts: { type: string }[] }): string[] {
  return user.linkedAccounts
    .filter((account) => account.type === "wallet" || account.type === "smart_wallet")
    .map((account) => (account as unknown as { address?: string }).address)
    .filter((address): address is string => Boolean(address) && isSolanaAddress(address!));
}

/**
 * Decides where a user's cashback is sent.
 *
 * The address is resolved from the accounts Privy has verified, never taken
 * from the request. Letting the browser name the destination invited a
 * mismatch that cannot be resolved safely: a wallet extension reports whatever
 * account is currently selected, which is often not the one the user
 * authenticated with, and paying an address Privy has not verified would mean
 * trusting the client about where money goes.
 */
export function resolvePayoutWallet(user: AuthenticatedUser): string {
  const wallet = user.wallets[0];
  if (!wallet) {
    throw new AuthError(
      "No Solana wallet is linked to your account. Connect or create one, then try again.",
    );
  }
  return wallet;
}
