pragma solidity ^0.8.20;

import {PayPilotVault} from "./PayPilotVault.sol";

/// @title PayPilotFactory
/// @notice Deploys the personal PayPilot vaults for users
contract PayPilotFactory {

    // ---------- State
    mapping(address => address) public userVaults;
    address[] public allVaults;

    // ---------- Events
    event VaultCreated(address indexed owner, address indexed vault);

    // ---------- Errors
    error VaultAlreadyExists();

    // ---------- Functions
    /// @notice Create a new vault for the caller
    /// @return vault - THe address of the new vault
    function createVault() external returns (address vault) {
        if (userVaults[msg.sender] != address(0)) {
            revert VaultAlreadyExists();
        }

        vault = address(new PayPilotVault(msg.sender));
        userVaults[msg.sender] = vault;
        allVaults.push(vault);

        emit VaultCreated(msg.sender, vault);
    }

    /// @notice Get the vault address for a user
    /// @param user - The user address
    /// @return - The vault address, or zero if none
    function getVault(address user) external view returns (address) {
        return userVaults[user];
    }

    /// @notice Get the total number of vaults created
    /// @return  - The total vault count
    function getVaultCount() external view returns (uint256) {
        return allVaults.length;
    }

}