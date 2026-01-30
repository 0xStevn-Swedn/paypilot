pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title PayPilotVault
/// @notice The personal vault for all automated crypto payements
contract PayPilotVault is Ownable {
    using SafeERC20 for IERC20;

    // Deposit and withdrawal events
    event Deposited(address indexed token, uint256 amount);
    event Withdrawn(address indexed token, uint256 amount);

    // Main errors - Insufficient balance or invalid amount
    error InsufficientBalance();
    error InvalidAmount();

    constructor(address _owner) Ownable(_owner) {}

    /// @notice Deposit selected tokens into the vault
    function deposit(address token, uint256 amount) external {
        if (amount == 0) revert InvalidAmount();
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(token, amount);
    }

    /// @notice Withdraw selected tokens from the vault, for owner only
    function withdraw(address token, uint256 amount) external onlyOwner {
        if (amount == 0) revert InvalidAmount();
        if (IERC20(token).balanceOf(address(this)) < amount) {
            revert InsufficientBalance();
        }
    IERC20(token).safeTransfer(owner(), amount);
    emit Withdrawn(token, amount);
    }

    /// @notice CHeck the vault balance for a specific token
    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

}