import { LAMPORTS_PER_SOL } from "./solana";

/**
 * Converts the USD cashback we owe into lamports.
 *
 * Cashback is defined as a percentage of a subscription price in dollars, but
 * paid in SOL, so the rate has to be fetched at claim time. Paying a fixed
 * amount of SOL instead would mean the cashback silently stops being 5% the
 * moment the price moves.
 *
 * The rate used is recorded on the claim, so any payout can be explained later.
 */

const CACHE_MS = 60_000;
// A rate outside this range is more likely a broken feed than a real move, and
// acting on it would over- or under-pay by orders of magnitude.
const MIN_PLAUSIBLE_USD = 1;
const MAX_PLAUSIBLE_USD = 10_000;

let cached: { usd: number; at: number } | undefined;

export class PriceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PriceError";
  }
}

async function fromCoinGecko(): Promise<number> {
  const response = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
    { signal: AbortSignal.timeout(8000) },
  );
  if (!response.ok) throw new Error(`CoinGecko returned ${response.status}`);
  const body = (await response.json()) as { solana?: { usd?: number } };
  const usd = body.solana?.usd;
  if (typeof usd !== "number") throw new Error("CoinGecko returned no price");
  return usd;
}

async function fromBinance(): Promise<number> {
  const response = await fetch(
    "https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT",
    { signal: AbortSignal.timeout(8000) },
  );
  if (!response.ok) throw new Error(`Binance returned ${response.status}`);
  const body = (await response.json()) as { price?: string };
  const usd = Number(body.price);
  if (!Number.isFinite(usd)) throw new Error("Binance returned no price");
  return usd;
}

/** SOL price in USD, cached briefly, with a second source behind the first. */
export async function solUsdPrice(): Promise<number> {
  const override = Number(process.env.SOL_USD_PRICE);
  if (Number.isFinite(override) && override > 0) return override;

  if (cached && Date.now() - cached.at < CACHE_MS) return cached.usd;

  let usd: number | undefined;
  const failures: string[] = [];
  for (const source of [fromCoinGecko, fromBinance]) {
    try {
      usd = await source();
      break;
    } catch (error) {
      failures.push(error instanceof Error ? error.message : "unknown");
    }
  }

  if (usd === undefined) {
    throw new PriceError(`Could not read the SOL price (${failures.join("; ")}).`);
  }
  if (usd < MIN_PLAUSIBLE_USD || usd > MAX_PLAUSIBLE_USD) {
    throw new PriceError(`Refusing to pay out at an implausible SOL price of $${usd}.`);
  }

  cached = { usd, at: Date.now() };
  return usd;
}

export type Quote = { lamports: bigint; solUsdRate: number };

/** How many lamports a given USD amount is worth right now. */
export async function quoteLamports(amountCents: number): Promise<Quote> {
  const solUsdRate = await solUsdPrice();
  const sol = amountCents / 100 / solUsdRate;
  // Round down so rounding never pays out more than is owed.
  const lamports = BigInt(Math.floor(sol * LAMPORTS_PER_SOL));
  if (lamports <= 0n) {
    throw new PriceError("That cashback amount rounds to zero SOL.");
  }
  return { lamports, solUsdRate };
}

export function formatSol(lamports: bigint): string {
  return (Number(lamports) / LAMPORTS_PER_SOL).toFixed(4);
}
