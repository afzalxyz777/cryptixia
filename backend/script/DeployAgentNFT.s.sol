// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../contracts/AgentNFT.sol";

contract DeployAgentNFT is Script {
    function run() external {
        vm.startBroadcast(); // Start sending transactions
        AgentNFT agentNFT = new AgentNFT(); // Deploy the contract
        console.log("AgentNFT deployed at:", address(agentNFT));
        vm.stopBroadcast(); // Stop broadcasting
    }
}
