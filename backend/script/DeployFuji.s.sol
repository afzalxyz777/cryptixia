// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/AgentNFT.sol";
import "../contracts/Marketplace.sol";

contract DeployFujiScript is Script {
    function run() external {
        vm.startBroadcast();

        console.log("Deploying to Avalanche Fuji testnet...");
        console.log("Deployer:", msg.sender);

        // Deploy AgentNFT
        AgentNFT agentNFT = new AgentNFT();
        console.log("AgentNFT deployed to:", address(agentNFT));

        // Deploy Marketplace
        Marketplace marketplace = new Marketplace(address(agentNFT));
        console.log("Marketplace deployed to:", address(marketplace));

        vm.stopBroadcast();

        // Write to fuji deployment file
        string memory timestamp = vm.toString(block.timestamp);
        string memory filename = string.concat(
            "deployments/fuji-",
            timestamp,
            ".json"
        );

        string memory json = string.concat(
            "{\n",
            '  "network": "fuji",\n',
            '  "chainId": 43113,\n',
            '  "blockNumber": ',
            vm.toString(block.number),
            ",\n",
            '  "timestamp": ',
            timestamp,
            ",\n",
            '  "agentNFT": "',
            vm.toString(address(agentNFT)),
            '",\n',
            '  "marketplace": "',
            vm.toString(address(marketplace)),
            '"\n',
            "}"
        );

        vm.writeFile(filename, json);
        vm.writeFile("deployments/fuji-latest.json", json);

        // Update frontend .env.local for fuji
        string memory envContent = string.concat(
            "NEXT_PUBLIC_AGENT_NFT_ADDRESS=",
            vm.toString(address(agentNFT)),
            "\n",
            "NEXT_PUBLIC_MARKETPLACE_ADDRESS=",
            vm.toString(address(marketplace)),
            "\n",
            "NEXT_PUBLIC_NETWORK=fuji\n",
            "NEXT_PUBLIC_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc\n"
        );

        vm.writeFile("frontend/.env.local", envContent);

        console.log("Deployment completed!");
        console.log("Deployment file:", filename);
        console.log("Frontend .env.local updated for Fuji");
    }
}
