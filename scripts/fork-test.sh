#!/usr/bin/env bash
# Runs a local fork of Base mainnet and funds the treasury on it.
#
# This is how the payout path gets tested without faucets or real money: the
# fork carries the real USDC contract at its real address, so the code under
# test is exactly the code that runs in production.
#
#   ./scripts/fork-test.sh
#   # then set in .env:  RPC_URL=http://127.0.0.1:8545  CHAIN=base
set -euo pipefail

export PATH="$HOME/.foundry/bin:$PATH"
TREASURY="${1:?usage: fork-test.sh <treasury-address>}"
USDC=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
RPC=http://127.0.0.1:8545

pkill -f "anvil --fork-url" 2>/dev/null || true
anvil --fork-url https://mainnet.base.org --chain-id 8453 --port 8545 --silent &
sleep 10

# 1 ETH for gas.
cast rpc --rpc-url $RPC anvil_setBalance "$TREASURY" 0xDE0B6B3A7640000 >/dev/null

# 100 USDC, written straight into the balance mapping (slot 9 on Circle's
# FiatTokenV2_2) rather than begging a whale for a transfer.
SLOT=$(cast index address "$TREASURY" 9)
cast rpc --rpc-url $RPC anvil_setStorageAt "$USDC" "$SLOT" \
  0x0000000000000000000000000000000000000000000000000000000005f5e100 >/dev/null

echo "fork ready on $RPC — treasury $TREASURY funded with 1 ETH + 100 USDC"
