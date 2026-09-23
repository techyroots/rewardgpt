// Polls the treasury until it holds both gas and USDC on the configured chain.
// Usage: node scripts/wait-for-funding.mjs
import { createPublicClient, http, formatUnits } from "viem";
import { base, baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import fs from "node:fs";

for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_0-9]+)="?([^"]*)"?$/);
  if (m) process.env[m[1]] ??= m[2];
}

const chain = process.env.CHAIN === "base-sepolia" ? baseSepolia : base;
const usdc =
  chain.id === baseSepolia.id
    ? "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    : "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const account = privateKeyToAccount(process.env.TREASURY_PRIVATE_KEY);
const client = createPublicClient({ chain, transport: http(process.env.RPC_URL) });
const abi = [
  { type: "function", name: "balanceOf", stateMutability: "view",
    inputs: [{ name: "a", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
];

console.log(`watching ${account.address} on ${chain.name}`);

for (let i = 0; i < 100; i++) {
  const [eth, tokens] = await Promise.all([
    client.getBalance({ address: account.address }),
    client.readContract({ address: usdc, abi, functionName: "balanceOf", args: [account.address] }),
  ]);
  if (eth > 0n && tokens > 0n) {
    console.log(`FUNDED  eth=${formatUnits(eth, 18)}  usdc=${formatUnits(tokens, 6)}`);
    process.exit(0);
  }
  if (i % 5 === 0) {
    console.log(`waiting… eth=${formatUnits(eth, 18)} usdc=${formatUnits(tokens, 6)}`);
  }
  await new Promise((r) => setTimeout(r, 20_000));
}
console.log("gave up waiting");
process.exit(1);
