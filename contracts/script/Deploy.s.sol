pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {PayPilotFactory} from "../src/PayPilotFactory.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        PayPilotFactory factory = new PayPilotFactory();
        console.log("PayPilotFactory is deployed at:", address(factory));

        vm.stopBroadcast();
    }
}