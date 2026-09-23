# RewardGPT

5% cashback on paid AI subscriptions. A user connects a wallet, privately proves
they have an active ChatGPT, Claude or Grok plan using zkTLS, and receives USDC
from a single treasury wallet.

No credentials are ever entered into this app. The proof happens on the user's
own device, against the real provider's website.

## Running it locally

Requires Node 22 (`.nvmrc` pins it — run `nvm use`).

```bash
npm install
cp .env.example .env      # then fill in the values below
npm run db:push           # create the SQLite schema
npm run db:seed           # load the service catalog
npm run dev
```

The minimum to see the full flow is `NEXT_PUBLIC_PRIVY_APP_ID` and
`PRIVY_APP_SECRET` from [dashboard.privy.io](https://dashboard.privy.io). With
`VERIFIER_MODE=mock` (the default) verification is simulated locally, so you can
walk the whole path without a Reclaim account or a real subscription.

`npm run smoke` runs the eligibility rules against a running dev server. It
clears the claims table, so only point it at a local database.

## How the pieces fit

```
browser ──connect──▶ Privy ──access + identity token──▶ /api/verify/start
                                                             │
                                             creates VerificationSession
                                                             │
user proves on their own device (Reclaim)  ──signed proof──▶ /api/verify/callback
                                                             │
                                          verify → nullifier → Claim(ELIGIBLE)
                                                             │
browser polls /api/verify/status ──────────────────────▶ /api/claim
                                                             │
                                              treasury wallet sends USDC
```

| Area | File |
| --- | --- |
| Eligibility rules (every rule that moves money) | `src/lib/eligibility.ts` |
| Anonymous per-subscription id | `src/lib/nullifier.ts` |
| Which plans count as paid | `src/lib/verifiers/plans.ts` |
| Verification backends | `src/lib/verifiers/` |
| Treasury payout | `src/lib/payout.ts` |
| Prices and cashback rates | `Service` table, seeded from `src/lib/services.ts` |

## Privacy

The proof reveals two things: a stable account identifier and the plan name.
The identifier is HMAC'd into a nullifier in the same request and the plaintext
is dropped — it is never written to the database or the logs.

Be accurate about this when describing the product: the server *does* briefly
see the account identifier before hashing it. It is pseudonymous, not
zero-knowledge from our side. Hiding it from ourselves entirely would require
hashing inside the zk circuit, which depends on the Reclaim provider config.

`NULLIFIER_PEPPER` keys that HMAC. Rotating it makes every past subscription
eligible again, so treat it as permanent.

## Anti-abuse

- **Nullifier** — unique index. One subscription can never claim from two wallets.
- **Proof hash** — unique index, so a proof cannot be replayed.
- **Session binding** — a proof only counts for the wallet that started the session, and each session is single-use.
- **Freshness** — proofs older than `PROOF_MAX_AGE_MINUTES` are rejected.
- **Cooldown** — `CLAIM_COOLDOWN_DAYS` per wallet per service.
- **Daily cap** — `DAILY_PAYOUT_CAP_USD` bounds the damage if eligibility logic is ever wrong.
- **Amounts** — always read from the database, never from the request body.

## Setting up real verification

Set `VERIFIER_MODE=reclaim` and create one provider per service at
[dev.reclaimprotocol.org](https://dev.reclaimprotocol.org), then put the ids in
`RECLAIM_PROVIDER_CHATGPT` / `_CLAUDE` / `_GROK`.

**Each provider must expose exactly these extracted parameters**, which is the
contract `src/lib/verifiers/reclaim.ts` depends on:

| Parameter | Meaning |
| --- | --- |
| `accountId` | A stable per-account identifier. This becomes the nullifier. |
| `plan` | The plan or tier string. |
| `status` | Optional. Subscription status, if the endpoint exposes one. |

Suggested endpoints to build the providers against:

| Service | Endpoint |
| --- | --- |
| ChatGPT | `GET https://chatgpt.com/backend-api/me` |
| Claude | `GET https://claude.ai/api/organizations` |
| Grok | `GET https://grok.com/rest/subscriptions` |

These are private, undocumented APIs. Expect their shapes to change without
notice — when they do, update `src/lib/verifiers/plans.ts` and the provider
regexes. A broken provider means nobody can verify that service until it is
fixed, so it is worth alerting on callback failure rates.

## Going to production

1. Switch `datasource db` in `prisma/schema.prisma` to `postgresql` and point `DATABASE_URL` at it.
2. Set `CHAIN=base` and `NEXT_PUBLIC_CHAIN=base`, and fund the treasury with USDC.
3. Move `TREASURY_PRIVATE_KEY` into a secrets manager. It is a hot wallet — keep only the float you need in it.
4. Set `VERIFIER_MODE=reclaim`. The mock verifier refuses to start in production.
5. Watch for claims in `REVIEW` status: those were broadcast but not confirmed, and need settling against the chain by hand.

## Known limitations

- Payouts are pushed by the backend rather than claimed from a contract. Users pay no gas and sign nothing, but they are trusting the operator. An on-chain vault with EIP-712 vouchers can replace `src/lib/payout.ts` without touching the frontend.
- Verifying subscriptions through private endpoints sits in a grey area with each provider's terms, and running a cashback programme funded from one wallet may carry money-transmission obligations depending on where you operate. Worth legal review before real money moves.
- The service marks in `src/components/logos.tsx` are geometric stand-ins, not the official brand logos.
