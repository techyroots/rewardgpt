/**
 * The AI subscriptions we pay cashback on.
 *
 * This array is the seed source; at runtime the `Service` table is the
 * authority for prices and rates, so a price change never needs a redeploy
 * and a user-supplied amount can never influence a payout.
 */
export type ServiceId = "chatgpt" | "claude" | "grok";

export type ServiceDefinition = {
  id: ServiceId;
  name: string;
  planLabel: string;
  priceUsdCents: number;
  cashbackBps: number;
  blurb: string;
  /** Brand accent used for the service card. */
  accent: string;
};

export const SERVICES: ServiceDefinition[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    planLabel: "ChatGPT Plus",
    priceUsdCents: 2000,
    cashbackBps: 500,
    blurb: "Get cashback on your ChatGPT Plus subscription.",
    accent: "#10a37f",
  },
  {
    id: "claude",
    name: "Claude",
    planLabel: "Claude Pro",
    priceUsdCents: 2000,
    cashbackBps: 500,
    blurb: "Get cashback on your Claude subscription.",
    accent: "#d97757",
  },
  {
    id: "grok",
    name: "Grok",
    planLabel: "SuperGrok",
    priceUsdCents: 3000,
    cashbackBps: 500,
    blurb: "Get cashback on your Grok subscription.",
    accent: "#111111",
  },
];

export const SERVICE_IDS = SERVICES.map((s) => s.id);

export function isServiceId(value: unknown): value is ServiceId {
  return typeof value === "string" && (SERVICE_IDS as string[]).includes(value);
}

export function getServiceDefinition(id: ServiceId): ServiceDefinition {
  const service = SERVICES.find((s) => s.id === id);
  if (!service) throw new Error(`Unknown service ${id}`);
  return service;
}

/** Cashback in cents, rounded down so we never over-pay by a rounding cent. */
export function cashbackCents(priceUsdCents: number, cashbackBps: number): number {
  return Math.floor((priceUsdCents * cashbackBps) / 10_000);
}

export function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
