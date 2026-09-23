import type { ServiceId } from "../services";

/**
 * Which plan strings count as an active paid subscription.
 *
 * These live in config rather than in code because the upstream endpoints are
 * private and undocumented: when OpenAI or xAI renames a tier, this is the one
 * place that has to change.
 *
 * A proof for a plan outside this list is still a *valid proof* — just a proof
 * of a free account. It has to be rejected as ineligible, not as a failure.
 */
export const PAID_PLAN_PATTERNS: Record<ServiceId, RegExp[]> = {
  chatgpt: [/chatgpt\s*-?_?plus/i, /chatgpt\s*-?_?pro/i, /chatgpt\s*-?_?team/i, /^plus$/i, /^pro$/i],
  claude: [/claude\s*-?_?pro/i, /claude\s*-?_?max/i, /^pro$/i, /^max/i, /default_pro/i],
  grok: [/super\s*-?_?grok/i, /grok\s*-?_?premium/i, /^x\s*-?_?premium/i, /^premium\+?$/i],
};

/**
 * Words that mean "not currently paying", whatever the tier name says. A
 * cancelled Plus subscription still reports a plan of "chatgpt-plus" on some
 * endpoints, so this check runs first and wins.
 */
const INACTIVE_PATTERNS = [/expired/i, /cancel/i, /inactive/i, /past_?due/i, /unpaid/i, /free/i, /trial/i];

export function isPaidPlan(serviceId: ServiceId, plan: string, status?: string): boolean {
  const normalizedPlan = plan.trim();
  if (!normalizedPlan) return false;

  const haystack = `${normalizedPlan} ${status ?? ""}`;
  if (INACTIVE_PATTERNS.some((pattern) => pattern.test(haystack))) return false;

  return PAID_PLAN_PATTERNS[serviceId].some((pattern) => pattern.test(normalizedPlan));
}
