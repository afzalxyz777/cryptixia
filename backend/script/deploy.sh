#!/usr/bin/env bash
set -euo pipefail

# --- Config ---
RPC_URL="http://127.0.0.1:8545"
SCRIPT_PATH="script/DeployAIAgentNFT.s.sol:DeployAIAgentNFT"
FRONTEND_ENV="./frontend/.env.local"
SENDER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
PK="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" # anvil default #0 (ok for local)

echo "▶ Deploying AgentNFT to $RPC_URL ..."
forge script "$SCRIPT_PATH" \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --sender "$SENDER" \
  --private-key "$PK"

# Find latest broadcast file
BROADCAST_DIR="./broadcast/DeployAIAgentNFT.s.sol/31337"
RUN_FILE="$(ls -t "$BROADCAST_DIR"/run-*.json | head -n1)"

# Extract the deployed address using jq (install: `brew install jq` on macOS)
ADDR=$(jq -r '.receipts[0].contractAddress // .transactions[0].contractAddress' "$RUN_FILE")

if [[ -z "$ADDR" || "$ADDR" == "null" ]]; then
  echo "❌ Could not extract contract address from $RUN_FILE"
  exit 1
fi

echo "✅ Deployed AgentNFT at: $ADDR"
echo "▶ Writing address to $FRONTEND_ENV ..."

# Ensure file exists
touch "$FRONTEND_ENV"

# Remove existing line, then append fresh
grep -v '^NEXT_PUBLIC_AGENTNFT_ADDRESS=' "$FRONTEND_ENV" > "$FRONTEND_ENV.tmp" || true
mv "$FRONTEND_ENV.tmp" "$FRONTEND_ENV"
echo "NEXT_PUBLIC_AGENTNFT_ADDRESS=$ADDR" >> "$FRONTEND_ENV"

# Also ensure RPC is present
grep -q '^NEXT_PUBLIC_RPC_URL=' "$FRONTEND_ENV" || echo "NEXT_PUBLIC_RPC_URL=$RPC_URL" >> "$FRONTEND_ENV"

echo "✅ Updated $FRONTEND_ENV"
