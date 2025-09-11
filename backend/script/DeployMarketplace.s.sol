// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/Marketplace.sol";
import "../contracts/AgentNFT.sol";

contract DeployMarketplace is Script {
    function run() external {
        // Get deployer private key from environment (changed from DEPLOYER_PK to PRIVATE_KEY)
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Get AgentNFT address from environment (should be deployed first)
        address agentNFTAddress = vm.envAddress("AGENT_NFT_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Marketplace contract
        Marketplace marketplace = new Marketplace(agentNFTAddress);

        vm.stopBroadcast();

        // Log deployment info
        console.log("=== Marketplace Deployment Complete ===");
        console.log("Marketplace Address:", address(marketplace));
        console.log("AgentNFT Address:", agentNFTAddress);
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Network:", block.chainid);

        // Save to file for frontend
        string memory envLine = string.concat(
            "NEXT_PUBLIC_MARKETPLACE_ADDRESS=",
            vm.toString(address(marketplace))
        );
        vm.writeFile("frontend/.env.marketplace", envLine);
        console.log("Saved address to frontend/.env.marketplace");
    }
}

// Alternative script that deploys both AgentNFT and Marketplace together
contract DeployAll is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy AgentNFT first
        AgentNFT agentNFT = new AgentNFT();

        // Deploy Marketplace
        Marketplace marketplace = new Marketplace(address(agentNFT));

        vm.stopBroadcast();

        // Log all deployment info
        console.log("=== Complete Deployment ===");
        console.log("AgentNFT Address:", address(agentNFT));
        console.log("Marketplace Address:", address(marketplace));
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Network:", block.chainid);

        // Create complete .env file for frontend
        string memory envContent = string.concat(
            "NEXT_PUBLIC_AGENT_NFT_ADDRESS=",
            vm.toString(address(agentNFT)),
            "\nNEXT_PUBLIC_MARKETPLACE_ADDRESS=",
            vm.toString(address(marketplace))
        );
        vm.writeFile("frontend/.env.local", envContent);
        console.log("Created frontend/.env.local with both addresses");
    }
}
