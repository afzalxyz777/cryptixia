// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../contracts/AgentNFT.sol";
import "../contracts/Marketplace.sol";

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy AgentNFT
        AgentNFT agentNFT = new AgentNFT();
        console.log("AgentNFT deployed to:", address(agentNFT));

        // Deploy Marketplace
        Marketplace marketplace = new Marketplace(address(agentNFT));
        console.log("Marketplace deployed to:", address(marketplace));

        vm.stopBroadcast();

        // Write deployment addresses to file
        string memory deploymentFile =
            string.concat("deployments/", vm.toString(block.chainid), "-", vm.toString(block.timestamp), ".json");

        string memory json = string.concat(
            "{\n",
            '  "chainId": ',
            vm.toString(block.chainid),
            ",\n",
            '  "timestamp": ',
            vm.toString(block.timestamp),
            ",\n",
            '  "agentNFT": "',
            vm.toString(address(agentNFT)),
            '",\n',
            '  "marketplace": "',
            vm.toString(address(marketplace)),
            '"\n',
            "}"
        );

        vm.writeFile(deploymentFile, json);
        console.log("Deployment info written to:", deploymentFile);
    }
}
