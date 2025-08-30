#!/bin/bash

# scripts/logMemoryHash.sh
# Helper script to log memory hashes to the blockchain

# Check if required arguments are provided
if [ $# -ne 2 ]; then
    echo "Usage: $0 <tokenId> <memoryHash>"
    echo "Example: $0 1 0x1234567890abcdef..."
    exit 1
fi

TOKEN_ID=$1
MEMORY_HASH=$2

# Load environment variables
if [ -f .env.local ]; then
    source .env.local
else
    echo "Error: .env.local file not found"
    exit 1
fi

# Check if required environment variables are set
if [ -z "$DEPLOYER_PK" ]; then
    echo "Error: DEPLOYER_PK not set in .env.local"
    exit 1
fi

if [ -z "$NFT_CONTRACT_ADDRESS" ]; then
    echo "Error: NFT_CONTRACT_ADDRESS not set in .env.local"
    echo "Please set it to your deployed contract address"
    exit 1
fi

# Default RPC URL if not set
RPC_URL=${AVALANCHE_FUJI_RPC:-"https://avalanche-fuji.infura.io/v3/YOUR_INFURA_KEY"}

echo "Logging memory hash for Token ID: $TOKEN_ID"
echo "Memory Hash: $MEMORY_HASH"
echo "Contract Address: $NFT_CONTRACT_ADDRESS"
echo "RPC URL: $RPC_URL"
echo

# Call the logMemoryHash function using forge
forge send $NFT_CONTRACT_ADDRESS \
    "logMemoryHash(uint256,bytes32)" \
    $TOKEN_ID \
    $MEMORY_HASH \
    --rpc-url $RPC_URL \
    --private-key $DEPLOYER_PK \
    --gas-limit 100000

if [ $? -eq 0 ]; then
    echo "✅ Memory hash logged successfully!"
    echo "You can verify this transaction on the Avalanche Fuji explorer"
else
    echo "❌ Failed to log memory hash"
    exit 1
fi