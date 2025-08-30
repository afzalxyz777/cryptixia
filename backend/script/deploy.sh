#!/bin/bash

# scripts/deploy.sh
# Deploy AgentNFT contract to Avalanche Fuji

echo "🚀 Deploying AgentNFT to Avalanche Fuji..."

# Load environment variables
if [ -f .env.local ]; then
    source .env.local
else
    echo "❌ Error: .env.local file not found"
    exit 1
fi

# Check required environment variables
if [ -z "$DEPLOYER_PK" ]; then
    echo "❌ Error: DEPLOYER_PK not set in .env.local"
    exit 1
fi

# Use primary RPC with fallback
RPC_URL=${AVALANCHE_FUJI_RPC:-"https://api.avax-test.network/ext/bc/C/rpc"}

echo "🔧 Configuration:"
echo "RPC URL: $RPC_URL"
echo "Deployer: $(cast wallet address --private-key $DEPLOYER_PK)"
echo

# Compile contracts first
echo "📦 Compiling contracts..."
forge build

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed"
    exit 1
fi

echo "✅ Compilation successful"
echo

# Deploy the contract
echo "🎯 Deploying AgentNFT..."

# Use forge create to deploy
DEPLOYMENT_OUTPUT=$(forge create contracts/AgentNFT.sol:AgentNFT \
    --rpc-url $RPC_URL \
    --private-key $DEPLOYER_PK \
    --gas-limit 3000000\
    --broadcast)

if [ $? -eq 0 ]; then
    # Extract contract address from output
    CONTRACT_ADDRESS=$(echo "$DEPLOYMENT_OUTPUT" | grep "Deployed to:" | awk '{print $3}')
    
    echo "✅ AgentNFT deployed successfully!"
    echo "📍 Contract Address: $CONTRACT_ADDRESS"
    echo
    
    # Update .env.local with new contract address
    if [ ! -z "$CONTRACT_ADDRESS" ]; then
        # Create backup of .env.local
        cp .env.local .env.local.backup
        
        # Update or add NFT_CONTRACT_ADDRESS
        if grep -q "NFT_CONTRACT_ADDRESS=" .env.local; then
            sed -i.bak "s/NFT_CONTRACT_ADDRESS=.*/NFT_CONTRACT_ADDRESS=$CONTRACT_ADDRESS/" .env.local
        else
            echo "NFT_CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> .env.local
        fi
        
        echo "✅ Updated .env.local with new contract address"
    fi
    
    # Test basic contract functionality
    echo "🧪 Testing contract..."
    
    # Test name function
    CONTRACT_NAME=$(cast call $CONTRACT_ADDRESS "name()" --rpc-url $RPC_URL)
    echo "Contract Name: $CONTRACT_NAME"
    
    # Test nextTokenId function
    NEXT_TOKEN_ID=$(cast call $CONTRACT_ADDRESS "nextTokenId()" --rpc-url $RPC_URL)
    echo "Next Token ID: $NEXT_TOKEN_ID"
    
    echo
    echo "🎉 Deployment completed successfully!"
    echo
    echo "📋 Next steps:"
    echo "1. Update your frontend with the new contract address"
    echo "2. Add some test AVAX to your wallet: https://faucet.avax.network/"
    echo "3. Test minting an NFT through your frontend"
    echo
    echo "📍 Contract Address: $CONTRACT_ADDRESS"
    echo "🔗 Avalanche Fuji Explorer: https://testnet.snowtrace.io/address/$CONTRACT_ADDRESS"
    
else
    echo "❌ Deployment failed"
    echo "💡 Common issues:"
    echo "   - Check your private key is correct"
    echo "   - Ensure you have AVAX for gas on Fuji testnet"
    echo "   - Verify RPC URL is working"
    exit 1
fi