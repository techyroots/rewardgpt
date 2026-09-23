// End-to-end check of the eligibility rules against a running dev server.
// Usage: start a dev server with VERIFIER_MODE=mock, then run this against it.
//   VERIFIER_MODE=mock PORT=3001 npm run dev
//   BASE=http://localhost:3001 node scripts/smoke-test.mjs
// It clears the claims table, so only point it at a local database.

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();
const BASE = process.env.BASE ?? "http://localhost:3000";
let pass = 0, fail = 0;

function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ` -> ${detail}` : ""}`); }
}

async function session(wallet, serviceId = "chatgpt") {
  const id = randomUUID();
  await prisma.verificationSession.create({
    data: { id, privyUserId: `did:privy:${wallet}`, wallet, serviceId },
  });
  return id;
}

async function submit(sessionId, accountId, plan, serviceId = "chatgpt") {
  const res = await fetch(`${BASE}/api/verify/callback?service=${serviceId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId, accountId, plan }),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

// Clean slate for a repeatable run.
await prisma.claim.deleteMany();
await prisma.verificationSession.deleteMany();

const walletA = "AJfbyBhT4bpvwGxVxbPTYF3CNWdYbLNqiLd75SSCHmgW";
const walletB = "5SwJ3RDus6dm5EMzbr3KEy2EzmDJQjx4xP3HeZz7dLWj";

console.log("\n1. A paid subscription becomes eligible");
let r = await submit(await session(walletA), "acct_alice", "prolite");
check("claim created", r.status === 200 && !!r.body.claimId, JSON.stringify(r.body));
check("cashback is $5.00 on the $100 prolite plan", r.body.amountCents === 500, `got ${r.body.amountCents}`);

console.log("\n2. The same subscription cannot claim from a second wallet");
r = await submit(await session(walletB), "acct_alice", "prolite");
check("second wallet rejected", r.status === 409, JSON.stringify(r.body));
check("reason mentions already claimed", /already claimed/i.test(r.body.error ?? ""), r.body.error);

console.log("\n3. Nullifier ignores casing and whitespace");
r = await submit(await session(walletB), "  ACCT_ALICE ", "prolite");
check("normalised duplicate rejected", r.status === 409, JSON.stringify(r.body));

console.log("\n4. A free account is not eligible");
r = await submit(await session(walletB), "acct_bob", "free");
check("free plan rejected", r.status === 409, JSON.stringify(r.body));

console.log("\n5. A cancelled paid plan is not eligible");
r = await submit(await session(walletB), "acct_carol", "chatgpt-plus-cancelled");
check("cancelled plan rejected", r.status === 409, JSON.stringify(r.body));

console.log("\n6. A session can only be used once");
const reused = await session(walletB);
await submit(reused, "acct_dave", "prolite");
r = await submit(reused, "acct_erin", "prolite");
check("session replay rejected", r.status === 409, JSON.stringify(r.body));

console.log("\n7. Cooldown blocks a second claim from the same wallet");
r = await submit(await session(walletB), "acct_frank", "prolite");
check("cooldown enforced", r.status === 409 && /next claim available/i.test(r.body.error ?? ""), r.body.error);

console.log("\n8. Claude and Grok are separate subscriptions");
r = await submit(await session(walletA, "claude"), "acct_alice", "claude-pro", "claude");
check("same id on another service is allowed", r.status === 200, JSON.stringify(r.body));
r = await submit(await session(walletA, "grok"), "acct_alice", "SuperGrok", "grok");
check("grok eligible at $1.50", r.status === 200 && r.body.amountCents === 150, JSON.stringify(r.body));

console.log("\n9. Raw account ids are never stored");
const claims = await prisma.claim.findMany();
const leaked = claims.some((c) => JSON.stringify(c).includes("acct_"));
check("no account id in any claim row", !leaked);
check("nullifiers are 64-hex", claims.every((c) => /^[0-9a-f]{64}$/.test(c.nullifier)));

console.log("\n10. An unknown service is refused");
const res = await fetch(`${BASE}/api/verify/callback?service=gemini`, {
  method: "POST", headers: { "content-type": "application/json" }, body: "{}",
});
check("unknown service rejected", res.status === 400);

console.log(`\n${pass} passed, ${fail} failed\n`);
await prisma.$disconnect();
process.exit(fail === 0 ? 0 : 1);
