import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import bs58 from "bs58";
import { env } from "./env";

export const LAMPORTS_PER_SOL = 1_000_000_000;

/** devnet while testing, mainnet-beta in production. */
export function cluster(): "devnet" | "mainnet-beta" {
  return env.solanaCluster;
}

export function connection(): Connection {
  return new Connection(env.solanaRpcUrl ?? clusterApiUrl(cluster()), "confirmed");
}

/**
 * The single treasury wallet every payout is funded from.
 *
 * Accepts either a base58 secret key (what Phantom and Solflare export) or the
 * JSON byte array the Solana CLI writes, since both are things a person is
 * likely to paste.
 */
export function treasury(): Keypair {
  const raw = env.treasurySecretKey.trim();

  if (raw.startsWith("[")) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw) as number[]));
  }

  const decoded = bs58.decode(raw);
  if (decoded.length !== 64) {
    throw new Error(
      `TREASURY_SECRET_KEY decoded to ${decoded.length} bytes; a Solana secret key is 64.`,
    );
  }
  return Keypair.fromSecretKey(decoded);
}

/** Whether a string is a usable Solana address. */
export function isSolanaAddress(value: string): boolean {
  try {
    // Rejects the right-length-but-not-on-curve strings that PublicKey accepts.
    return PublicKey.isOnCurve(new PublicKey(value).toBytes());
  } catch {
    return false;
  }
}

export function explorerTxUrl(signature: string): string {
  const suffix = cluster() === "devnet" ? "?cluster=devnet" : "";
  return `https://solscan.io/tx/${signature}${suffix}`;
}
