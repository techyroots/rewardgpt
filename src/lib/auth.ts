import { PrivyClient } from "@privy-io/server-auth";
import { env } from "./env";

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
  if (idToken) {
    try {
      const user = await privy().getUser({ idToken });
      wallets = user.linkedAccounts
        .filter((account) => account.type === "wallet")
        .map((account) => (account as { address: string }).address.toLowerCase());
    } catch {
      // Fall through: an unusable identity token just means we can't confirm
      // wallet ownership from it, which `requireOwnedWallet` treats as failure.
      wallets = [];
    }
  }

  return { privyUserId, wallets };
}

/**
 * Confirms the payout address is one the caller actually controls, so a claim
 * can't be pointed at someone else's wallet by editing the request body.
 */
export function requireOwnedWallet(user: AuthenticatedUser, wallet: string): string {
  const normalized = wallet.trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(normalized)) {
    throw new AuthError("That does not look like a valid wallet address.");
  }
  if (!user.wallets.includes(normalized)) {
    throw new AuthError("That wallet is not linked to your account.");
  }
  return normalized;
}
