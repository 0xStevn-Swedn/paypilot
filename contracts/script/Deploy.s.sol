// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {PayPilotFactory} from "../src/PayPilotFactory.sol";

// Deployment script for Foundry.
// This script deploys the Factory contract to the blockchain. it is run with 'forge script'. 
// It reads the private key from environment variables and broadcasts the transaction.

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        PayPilotFactory factory = new PayPilotFactory();
        console.log("PayPilotFactory is deployed at:", address(factory));

        vm.stopBroadcast();
    }
}