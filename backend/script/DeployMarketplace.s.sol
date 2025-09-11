// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/Marketplace.sol";
import "../contracts/AgentNFT.sol";

contract DeployMarketplace is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address agentNFTAddress = vm.envAddress("AGENT_NFT_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);
        Marketplace marketplace = new Marketplace(agentNFTAddress);
        vm.stopBroadcast();

        console.log("=== Marketplace Deployment Complete ===");
        console.log("Marketplace Address:", address(marketplace));
        console.log("AgentNFT Address:", agentNFTAddress);
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Network:", block.chainid);

        // FIXED: Correct vm.toString and vm.writeFile
        string memory envLine = string.concat("NEXT_PUBLIC_MARKETPLACE_ADDRESS=", vm.toString(address(marketplace)));
        vm.writeFile("../frontend/.env.marketplace", envLine);
        console.log("Saved address to frontend/.env.marketplace");
    }
}
