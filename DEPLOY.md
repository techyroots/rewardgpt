# Deploying RewardGPT

The app is a single Next.js project, so it deploys to Vercel's free tier as-is.
Three things have to exist first, and only you can create them.

## 1. A Postgres database (2 min)

SQLite cannot be used in production: Vercel runs the app in serverless
functions with an ephemeral filesystem, so a file-backed database is wiped on
cold start and is not shared between concurrent invocations — which would
break the unique nullifier that stops one subscription claiming twice.

Create a free database at [neon.tech](https://neon.tech) (or use Vercel
Postgres from the Vercel dashboard) and copy the **pooled** connection string.

Then, from this directory:

```bash
DATABASE_URL="postgresql://..." npm run db:deploy   # create the tables
DATABASE_URL="postgresql://..." npm run db:seed     # load the service catalog
```

## 2. A Vercel project

```bash
npx vercel login
npx vercel link
npx vercel --prod
```

You get a free `*.vercel.app` domain, which is enough to share with a client.
A custom domain can be added later in the project settings.

## 3. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables**, or with
`npx vercel env add <NAME> production`:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | the pooled Postgres URL from step 1 |
| `NEXT_PUBLIC_APP_URL` | `https://<your-project>.vercel.app` |
| `NEXT_PUBLIC_PRIVY_APP_ID` | from the Privy dashboard |
| `PRIVY_APP_SECRET` | from the Privy dashboard |
| `VERIFIER_MODE` | `reclaim` |
| `RECLAIM_APP_ID` | from dev.reclaimprotocol.org |
| `RECLAIM_APP_SECRET` | from dev.reclaimprotocol.org |
| `RECLAIM_PROVIDER_CHATGPT` | the ChatGPT provider id |
| `RECLAIM_PROVIDER_HASH_CHATGPT` | the pinned provider hash |
| `NULLIFIER_PEPPER` | `openssl rand -hex 32` — permanent, see below |
| `TREASURY_SECRET_KEY` | base58 secret key of the paying wallet |
| `SOLANA_CLUSTER` | `devnet` for a demo, `mainnet-beta` for real money |
| `SOLANA_RPC_URL` | `https://api.devnet.solana.com`, or a paid RPC in production |
| `DAILY_PAYOUT_CAP_USD` | e.g. `50` while demoing |

`NULLIFIER_PEPPER` must stay the same forever. Changing it makes every
subscription that has already claimed eligible again.

## 4. Two settings outside this repo

- **Privy → Domains and clients**: add your `*.vercel.app` domain, or wallet
  connect will be refused on the deployed site.
- **Privy → Basics**: the app is in development mode, capped at 150 users.
  Fine for a client demo; upgrade before a real launch.

## What changes once it is public

Reclaim can reach a public URL, so proofs are delivered to
`/api/verify/callback` instead of being polled for. Both paths are
implemented and share the same validation, so nothing needs changing — but it
does mean the callback route starts receiving live traffic.

## Before real money

- Rotate every secret that has been pasted into a chat or a terminal.
- Generate a fresh treasury key for mainnet and keep only a working float in it.
- Set `DAILY_PAYOUT_CAP_USD` deliberately; it is the last line of defence.
- The treasury key in a Vercel environment variable is readable by anyone with
  access to the project. Treat that access list as the list of people who can
  spend the treasury.
