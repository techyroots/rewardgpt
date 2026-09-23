import { createPublicClient, createWalletClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { env } from "./env";

/** Circle's canonical USDC on each network. */
const USDC_ADDRESS: Record<number, Address> = {
  [base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  [baseSepolia.id]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
};

export const USDC_DECIMALS = 6;

export const ERC20_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export function activeChain() {
  return env.useTestnet ? baseSepolia : base;
}

export function usdcAddress(): Address {
  const address = USDC_ADDRESS[activeChain().id];
  if (!address) throw new Error(`No USDC address configured for chain ${activeChain().id}`);
  return address;
}

export function publicClient() {
  return createPublicClient({
    chain: activeChain(),
    transport: http(env.rpcUrl),
  });
}

/** The single treasury wallet every payout is funded from. */
export function treasury() {
  const account = privateKeyToAccount(env.treasuryPrivateKey);
  return {
    account,
    wallet: createWalletClient({
      account,
      chain: activeChain(),
      transport: http(env.rpcUrl),
    }),
  };
}

/** USDC has 6 decimals, so one cent is 10^4 base units. */
export function centsToUsdcUnits(cents: number): bigint {
  return BigInt(cents) * 10n ** BigInt(USDC_DECIMALS - 2);
}
