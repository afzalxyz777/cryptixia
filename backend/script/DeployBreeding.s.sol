// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/Breeding.sol";
import "../contracts/AgentNFT.sol";

contract DeployBreeding is Script {
    function run() external {
        // Load private key from environment variable
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Replace with your deployed AgentNFT address
        address agentNFTAddress = vm.envAddress("AGENT_NFT_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Breeding contract with AgentNFT address
        Breeding breeding = new Breeding(agentNFTAddress);

        console.log("Breeding contract deployed at:", address(breeding));

        vm.stopBroadcast();
    }
}
