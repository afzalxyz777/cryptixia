// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../contracts/AgentNFT.sol";
import "../contracts/Marketplace.sol";

contract DeployLocalScript is Script {
    function run() external {
        // Use anvil's default private key for local development
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying to local anvil...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));

        // Deploy AgentNFT
        AgentNFT agentNFT = new AgentNFT();
        console.log("AgentNFT deployed to:", address(agentNFT));

        // Deploy Marketplace
        Marketplace marketplace = new Marketplace(address(agentNFT));
        console.log("Marketplace deployed to:", address(marketplace));

        // Mint a test agent for development
        agentNFT.publicMint("ipfs://QmTestMetadata");
        console.log("Test agent minted with tokenId: 0");

        vm.stopBroadcast();

        // Write to local deployment file
        string memory json = string.concat(
            "{\n",
            '  "network": "local",\n',
            '  "chainId": 31337,\n',
            '  "agentNFT": "',
            vm.toString(address(agentNFT)),
            '",\n',
            '  "marketplace": "',
            vm.toString(address(marketplace)),
            '",\n',
            '  "deployer": "',
            vm.toString(vm.addr(deployerPrivateKey)),
            '"\n',
            "}"
        );

        vm.writeFile("deployments/local-latest.json", json);

        // Also write .env.local for frontend
        string memory envContent = string.concat(
            "NEXT_PUBLIC_AGENT_NFT_ADDRESS=",
            vm.toString(address(agentNFT)),
            "\n",
            "NEXT_PUBLIC_MARKETPLACE_ADDRESS=",
            vm.toString(address(marketplace)),
            "\n",
            "NEXT_PUBLIC_NETWORK=local\n",
            "NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545\n"
        );

        vm.writeFile("frontend/.env.local", envContent);
        console.log("Frontend .env.local updated");
    }
}
