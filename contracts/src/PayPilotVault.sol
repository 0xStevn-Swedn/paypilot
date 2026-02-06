// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title PayPilotVault
/// @notice The personal vault for all automated crypto payements

// This is the main smart contract. Each user gets their own vault. The vault can:
// - Hold tokens (like USDC) deposited by the user
// - Create payment rules (one-time or recurring payments)
// - Execute payments automatically based on rules
// - Set spending limits (daily/weekly caps for safety)

contract PayPilotVault is Ownable {
    using SafeERC20 for IERC20;

    // ---------- Structures

    struct PaymentRule {
        uint256 id;
        address token;
        address recipient;
        uint256 amount;
        uint256 interval; // seconds beween payements
        uint256 lastExecuted;
        bool active;
        string description;
    }

    // ---------- State

    mapping(uint256 => PaymentRule) public rules;
    uint256 public ruleCount;

    // ---------- Events
    // Deposit and withdrawal events
    event Deposited(address indexed token, uint256 amount);
    event Withdrawn(address indexed token, uint256 amount);
    // Event rules
    event RuleCreated(uint256 indexed ruleId, address recipient, uint256 amount);
    event RuleExecuted(uint256 indexed ruleId, address recipient, uint256 amount);
    event RuleCancelled(uint256 indexed ruleId);

    // ---------- Errors
    // Main errors - Insufficient balance or invalid amount
    error InsufficientBalance();
    error InvalidAmount();
    // Other errors
    error RuleNotActive();
    error TooEarlyToExecute();

    // ---------- Constructor
    constructor(address _owner) Ownable(_owner) {}

    // ---------- Deposit/Withdraw and balance functions

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

    /// @notice Check the vault balance for a specific token
    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ---------- Payment Rules

    /// @notice Create a new generic payment rule
    /// @param token Token to send to the receiver
    /// @param recipient Who receives the payment
    /// @param amount Amount per payment
    /// @param interval Seconds between payments (0 = one-time payement)
    /// @param description Payement text description
    function createRule(
        address token,
        address recipient,
        uint256 amount,
        uint256 interval,
        string calldata description
    ) external onlyOwner returns (uint256 ruleId) {
        if (amount == 0) revert InvalidAmount();

        ruleId = ruleCount++;
        rules[ruleId] = PaymentRule({
            id: ruleId,
            token: token,
            recipient: recipient,
            amount: amount,
            interval: interval,
            lastExecuted: 0,
            active: true,
            description: description
        });

        emit RuleCreated(ruleId, recipient, amount);
    }

    /// @notice Execute a payment rule
    /// @param ruleId The rule to execute
    function executeRule(uint256 ruleId) external {
        PaymentRule storage rule = rules[ruleId];

        if (!rule.active) revert RuleNotActive();

        // Check the timing in case of recurring rules
        if (rule.interval > 0 && rule.lastExecuted > 0) {
            if (block.timestamp < rule.lastExecuted + rule.interval) {
                revert TooEarlyToExecute();
            }
        }

        // Check the balance
        if (IERC20(rule.token).balanceOf(address(this)) < rule.amount) {
            revert InsufficientBalance();
        }

        // Update the state
        rule.lastExecuted = block.timestamp;

        // Deactivate all one-time rules
        if (rule.interval == 0) {
            rule.active = false;
        }

        // Send the payment
        IERC20(rule.token).safeTransfer(rule.recipient, rule.amount);

        emit RuleExecuted(ruleId, rule.recipient, rule.amount);
    }

    /// @notice Cancel a payment rule
    /// @param ruleId The rule to cancel
    function cancelRule(uint256 ruleId) external onlyOwner {
        rules[ruleId].active = false;
        emit RuleCancelled(ruleId);
    }

    /// @notice Get a payment rule
    /// @param ruleId The rule ID
    function getRule(uint256 ruleId) external view returns (PaymentRule memory) {
        return rules[ruleId];
    }
}
