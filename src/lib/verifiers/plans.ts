import type { ServiceId } from "../services";

/**
 * Plan tiers we pay cashback on, and what each one costs.
 *
 * Cashback is a percentage of the subscription price, so the price has to be
 * per *tier*, not per service: ChatGPT Plus and ChatGPT Pro are an order of
 * magnitude apart and cannot share one number. `Service.priceUsdCents` is only
 * the fallback for a paid plan we recognise but have no tier entry for.
 *
 * These live in config because the upstream endpoints are private and
 * undocumented — when a tier is renamed, this is the one place to change.
 */
export type PlanTier = {
  /** Matched against the plan string the provider reports. */
  match: RegExp;
  label: string;
  priceUsdCents: number;
};

export const PLAN_TIERS: Record<ServiceId, PlanTier[]> = {
  chatgpt: [
    // Order matters: the most specific pattern must come first.
    // "prolite" is what the API reports for a $100/mo subscription (confirmed
    // against a real invoice). It is not the $200 Pro tier below, despite the
    // name, so it needs its own entry or we would pay double.
    { match: /prolite/i, label: "ChatGPT Pro Lite", priceUsdCents: 10000 },
    { match: /chatgpt\s*-?_?pro\b|^pro$/i, label: "ChatGPT Pro", priceUsdCents: 20000 },
    { match: /chatgpt\s*-?_?team/i, label: "ChatGPT Team", priceUsdCents: 2500 },
    { match: /chatgpt\s*-?_?plus|^plus$/i, label: "ChatGPT Plus", priceUsdCents: 2000 },
    { match: /\bgo\b/i, label: "ChatGPT Go", priceUsdCents: 500 },
  ],
  claude: [
    { match: /claude\s*-?_?max|^max/i, label: "Claude Max", priceUsdCents: 10000 },
    { match: /claude\s*-?_?pro|^pro$|default_pro/i, label: "Claude Pro", priceUsdCents: 2000 },
  ],
  grok: [
    { match: /super\s*-?_?grok\s*-?_?heavy/i, label: "SuperGrok Heavy", priceUsdCents: 30000 },
    { match: /super\s*-?_?grok/i, label: "SuperGrok", priceUsdCents: 3000 },
    { match: /grok\s*-?_?premium|^x\s*-?_?premium|^premium\+?$/i, label: "X Premium", priceUsdCents: 800 },
  ],
};

/**
 * Words that mean "not currently paying", whatever the tier name says. A
 * cancelled Plus subscription still reports a plan of "chatgpt-plus" on some
 * endpoints, so this check runs first and wins.
 */
const INACTIVE_PATTERNS = [
  /expired/i, /cancel/i, /inactive/i, /past_?due/i, /unpaid/i, /\bfree\b/i, /trial/i,
];

/** The tier a reported plan maps to, or null if it isn't an active paid plan. */
export function resolvePlanTier(
  serviceId: ServiceId,
  plan: string,
  status?: string,
): PlanTier | null {
  const normalized = plan.trim();
  if (!normalized) return null;

  const haystack = `${normalized} ${status ?? ""}`;
  if (INACTIVE_PATTERNS.some((pattern) => pattern.test(haystack))) return null;

  return PLAN_TIERS[serviceId].find((tier) => tier.match.test(normalized)) ?? null;
}

export function isPaidPlan(serviceId: ServiceId, plan: string, status?: string): boolean {
  return resolvePlanTier(serviceId, plan, status) !== null;
}
