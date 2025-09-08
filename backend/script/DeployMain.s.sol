// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/AgentNFT.sol";
import "../contracts/Breeding.sol";
import "../contracts/Marketplace.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PK");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying contracts with the account:", deployer);
        console.log("Account balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy AgentNFT first
        AgentNFT agentNFT = new AgentNFT();
        console.log("AgentNFT deployed to:", address(agentNFT));

        // Deploy Breeding contract with AgentNFT address
        Breeding breeding = new Breeding(address(agentNFT));
        console.log("Breeding deployed to:", address(breeding));

        // Deploy Marketplace contract with AgentNFT address
        Marketplace marketplace = new Marketplace(address(agentNFT));
        console.log("Marketplace deployed to:", address(marketplace));

        // Add breeding contract as authorized minter
        agentNFT.addAuthorizedMinter(address(breeding));
        console.log("Added Breeding contract as authorized minter");

        // Set initial breeding fee (0.01 ether)
        breeding.setBreedingFee(0.01 ether);
        console.log("Set breeding fee to 0.01 ether");

        // Set marketplace fee to 2.5%
        marketplace.setMarketplaceFee(250);
        console.log("Set marketplace fee to 2.5%");

        vm.stopBroadcast();

        // Write addresses to file for frontend
        string memory addresses = string(
            abi.encodePacked(
                "AGENT_NFT_ADDRESS=",
                vm.toString(address(agentNFT)),
                "\n",
                "BREEDING_ADDRESS=",
                vm.toString(address(breeding)),
                "\n",
                "MARKETPLACE_ADDRESS=",
                vm.toString(address(marketplace)),
                "\n"
            )
        );

        vm.writeFile("./deployed-addresses.txt", addresses);
        console.log("Contract addresses written to deployed-addresses.txt");
    }
}
