// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AgentNFT} from "./AgentNFT.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SafeExecute
 * @dev Handles safe execution of agent commands with user confirmation
 * This contract ensures agents cannot perform wallet-affecting operations without explicit user confirmation
 */
contract SafeExecute is Ownable, ReentrancyGuard {
    AgentNFT public immutable agentNFT;

    // Command types that require confirmation
    enum CommandType {
        SEND_ETH,
        SEND_TOKEN,
        APPROVE_TOKEN,
        MARKETPLACE_LIST,
        MARKETPLACE_BUY,
        BREED_AGENT,
        CUSTOM_CALL
    }

    // Pending command structure
    struct PendingCommand {
        uint256 agentTokenId;
        address requester;
        CommandType commandType;
        address target;
        uint256 value;
        bytes data;
        uint256 createdAt;
        uint256 expiresAt;
        bool executed;
        bool confirmed;
    }

    // Storage
    mapping(uint256 => PendingCommand) public pendingCommands;
    uint256 public nextCommandId;

    // Security settings
    uint256 public constant COMMAND_EXPIRY_TIME = 10 minutes;
    uint256 public constant MAX_ETH_PER_COMMAND = 10 ether;
    mapping(address => bool) public trustedTokens;
    mapping(address => bool) public trustedContracts;

    // User preferences
    mapping(address => uint256) public userMaxEthPerCommand;
    mapping(address => bool) public userAutoConfirmSmallAmounts;
    uint256 public constant SMALL_AMOUNT_THRESHOLD = 0.01 ether;

    // Events
    event CommandProposed(
        uint256 indexed commandId,
        uint256 indexed agentTokenId,
        address indexed requester,
        CommandType commandType,
        address target,
        uint256 value
    );

    event CommandConfirmed(uint256 indexed commandId, address indexed confirmer);
    event CommandExecuted(uint256 indexed commandId, bool success, bytes result);
    event CommandExpired(uint256 indexed commandId);
    event CommandCancelled(uint256 indexed commandId);

    event TrustedTokenAdded(address indexed token);
    event TrustedContractAdded(address indexed contractAddress);

    modifier onlyAgentOwner(uint256 agentTokenId) {
        require(agentNFT.ownerOf(agentTokenId) == msg.sender, "SafeExecute: Not agent owner");
        _;
    }

    modifier validCommand(uint256 commandId) {
        require(commandId < nextCommandId, "SafeExecute: Invalid command ID");
        PendingCommand storage cmd = pendingCommands[commandId];
        require(!cmd.executed, "SafeExecute: Command already executed");
        require(!cmd.confirmed, "SafeExecute: Command already confirmed");
        require(block.timestamp <= cmd.expiresAt, "SafeExecute: Command expired");
        _;
    }

    constructor(address _agentNFT) Ownable(msg.sender) {
        require(_agentNFT != address(0), "SafeExecute: Invalid AgentNFT address");
        agentNFT = AgentNFT(_agentNFT);
    }

    /**
     * @dev Propose a command that requires user confirmation
     * This is called by the frontend when an agent suggests an action
     */
    function proposeCommand(
        uint256 agentTokenId,
        CommandType commandType,
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyAgentOwner(agentTokenId) returns (uint256 commandId) {
        // Security validations
        _validateCommand(commandType, target, value, data, msg.sender);

        commandId = nextCommandId++;

        pendingCommands[commandId] = PendingCommand({
            agentTokenId: agentTokenId,
            requester: msg.sender,
            commandType: commandType,
            target: target,
            value: value,
            data: data,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + COMMAND_EXPIRY_TIME,
            executed: false,
            confirmed: false
        });

        emit CommandProposed(commandId, agentTokenId, msg.sender, commandType, target, value);

        // Auto-confirm for small amounts if user has enabled this feature
        if (_shouldAutoConfirm(msg.sender, commandType, value)) {
            _confirmAndExecute(commandId);
        }

        return commandId;
    }

    /**
     * @dev User confirms and executes a pending command
     */
    function confirmCommand(uint256 commandId) external validCommand(commandId) nonReentrant {
        PendingCommand storage cmd = pendingCommands[commandId];
        require(cmd.requester == msg.sender, "SafeExecute: Not command requester");

        _confirmAndExecute(commandId);
    }

    /**
     * @dev Cancel a pending command
     */
    function cancelCommand(uint256 commandId) external {
        require(commandId < nextCommandId, "SafeExecute: Invalid command ID");
        PendingCommand storage cmd = pendingCommands[commandId];
        require(cmd.requester == msg.sender, "SafeExecute: Not command requester");
        require(!cmd.executed, "SafeExecute: Command already executed");

        cmd.executed = true; // Mark as executed to prevent future execution
        emit CommandCancelled(commandId);
    }

    /**
     * @dev Clean up expired commands (can be called by anyone)
     */
    function cleanupExpiredCommand(uint256 commandId) external {
        require(commandId < nextCommandId, "SafeExecute: Invalid command ID");
        PendingCommand storage cmd = pendingCommands[commandId];
        require(block.timestamp > cmd.expiresAt, "SafeExecute: Command not expired");
        require(!cmd.executed, "SafeExecute: Command already executed");

        cmd.executed = true;
        emit CommandExpired(commandId);
    }

    /**
     * @dev Internal function to confirm and execute command
     */
    function _confirmAndExecute(uint256 commandId) internal {
        PendingCommand storage cmd = pendingCommands[commandId];
        cmd.confirmed = true;
        cmd.executed = true;

        emit CommandConfirmed(commandId, msg.sender);

        // Execute the command
        bool success;
        bytes memory result;

        if (cmd.commandType == CommandType.SEND_ETH) {
            (success, result) = cmd.target.call{value: cmd.value}(cmd.data);
        } else if (cmd.commandType == CommandType.SEND_TOKEN || cmd.commandType == CommandType.APPROVE_TOKEN) {
            (success, result) = cmd.target.call(cmd.data);
        } else if (cmd.commandType == CommandType.CUSTOM_CALL) {
            require(trustedContracts[cmd.target], "SafeExecute: Untrusted contract");
            (success, result) = cmd.target.call{value: cmd.value}(cmd.data);
        } else {
            // For marketplace and breeding operations, execute the call
            (success, result) = cmd.target.call{value: cmd.value}(cmd.data);
        }

        emit CommandExecuted(commandId, success, result);

        if (!success) {
            // Revert with the error message from the failed call
            assembly {
                let returnDataSize := mload(result)
                revert(add(32, result), returnDataSize)
            }
        }
    }

    /**
     * @dev Validate command parameters for security
     */
    function _validateCommand(CommandType commandType, address target, uint256 value, bytes calldata data, address user)
        internal
        view
    {
        // Basic validations
        require(target != address(0), "SafeExecute: Invalid target");

        if (commandType == CommandType.SEND_ETH) {
            require(value > 0, "SafeExecute: Zero ETH amount");
            require(value <= MAX_ETH_PER_COMMAND, "SafeExecute: ETH amount too high");

            uint256 userMaxEth = userMaxEthPerCommand[user];
            if (userMaxEth > 0) {
                require(value <= userMaxEth, "SafeExecute: Exceeds user ETH limit");
            }
        }

        if (commandType == CommandType.SEND_TOKEN || commandType == CommandType.APPROVE_TOKEN) {
            require(trustedTokens[target], "SafeExecute: Untrusted token");
            require(data.length >= 68, "SafeExecute: Invalid token call data"); // transfer/approve signature + params
        }

        if (commandType == CommandType.CUSTOM_CALL) {
            require(trustedContracts[target], "SafeExecute: Untrusted contract for custom call");
        }

        // Prevent self-calls and calls to this contract
        require(target != address(this), "SafeExecute: Cannot call self");
        require(target != user, "SafeExecute: Cannot call user address directly");
    }

    /**
     * @dev Check if command should be auto-confirmed
     */
    function _shouldAutoConfirm(address user, CommandType commandType, uint256 value) internal view returns (bool) {
        if (!userAutoConfirmSmallAmounts[user]) {
            return false;
        }

        if (commandType == CommandType.SEND_ETH) {
            return value <= SMALL_AMOUNT_THRESHOLD;
        }

        // For now, only auto-confirm small ETH transfers
        return false;
    }

    // View functions
    function getPendingCommand(uint256 commandId) external view returns (PendingCommand memory) {
        require(commandId < nextCommandId, "SafeExecute: Invalid command ID");
        return pendingCommands[commandId];
    }

    function getUserPendingCommands(address user) external view returns (uint256[] memory) {
        uint256[] memory tempArray = new uint256[](nextCommandId);
        uint256 count = 0;

        for (uint256 i = 0; i < nextCommandId; i++) {
            PendingCommand storage cmd = pendingCommands[i];
            if (cmd.requester == user && !cmd.executed && block.timestamp <= cmd.expiresAt) {
                tempArray[count] = i;
                count++;
            }
        }

        uint256[] memory userCommands = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            userCommands[i] = tempArray[i];
        }

        return userCommands;
    }

    function isCommandExpired(uint256 commandId) external view returns (bool) {
        if (commandId >= nextCommandId) return false;
        return block.timestamp > pendingCommands[commandId].expiresAt;
    }

    // User preference functions
    function setMaxEthPerCommand(uint256 maxEth) external {
        require(maxEth <= MAX_ETH_PER_COMMAND, "SafeExecute: Max ETH too high");
        userMaxEthPerCommand[msg.sender] = maxEth;
    }

    function setAutoConfirmSmallAmounts(bool autoConfirm) external {
        userAutoConfirmSmallAmounts[msg.sender] = autoConfirm;
    }

    // Admin functions
    function addTrustedToken(address token) external onlyOwner {
        require(token != address(0), "SafeExecute: Invalid token address");
        trustedTokens[token] = true;
        emit TrustedTokenAdded(token);
    }

    function addTrustedContract(address contractAddress) external onlyOwner {
        require(contractAddress != address(0), "SafeExecute: Invalid contract address");
        trustedContracts[contractAddress] = true;
        emit TrustedContractAdded(contractAddress);
    }

    function removeTrustedToken(address token) external onlyOwner {
        trustedTokens[token] = false;
    }

    function removeTrustedContract(address contractAddress) external onlyOwner {
        trustedContracts[contractAddress] = false;
    }

    // Emergency functions
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // Allow contract to receive ETH for ETH transfer commands
    receive() external payable {}
}
