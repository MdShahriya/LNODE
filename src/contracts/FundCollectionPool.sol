// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title FundCollectionPool
 * @dev Reusable USDT (or any ERC20) collection contract with dynamic token support
 */
contract FundCollectionPool is ReentrancyGuard, Ownable, Pausable {
    IERC20 public usdtToken;
    uint256 public totalFundsCollected;

    mapping(address => uint256) public userContributions;
    address[] public contributors;
    mapping(address => bool) public isContributor;

    event FundsDeposited(address indexed user, uint256 amount, uint256 timestamp);
    event FundsWithdrawn(address indexed recipient, uint256 amount, uint256 timestamp);
    event TokenAddressUpdated(address indexed oldToken, address indexed newToken);

    error InvalidAmount();
    error TransferFailed();
    error InvalidTokenAddress();

    constructor(address _token) Ownable(msg.sender) {
        if (_token == address(0)) revert InvalidTokenAddress();
        usdtToken = IERC20(_token);
    }

    /**
     * @dev Update the token address (only owner)
     * @param _newToken Address of the new token contract
     */
    function setTokenAddress(address _newToken) external onlyOwner {
        if (_newToken == address(0)) revert InvalidTokenAddress();
        emit TokenAddressUpdated(address(usdtToken), _newToken);
        usdtToken = IERC20(_newToken);
    }

    function deposit(uint256 _amount) external nonReentrant whenNotPaused {
        if (_amount == 0) revert InvalidAmount();

        bool success = usdtToken.transferFrom(msg.sender, address(this), _amount);
        if (!success) revert TransferFailed();

        userContributions[msg.sender] += _amount;

        if (!isContributor[msg.sender]) {
            contributors.push(msg.sender);
            isContributor[msg.sender] = true;
        }

        totalFundsCollected += _amount;

        emit FundsDeposited(msg.sender, _amount, block.timestamp);
    }

    function withdrawFunds(uint256 _amount, address _to) external onlyOwner nonReentrant {
        if (_amount == 0 || _to == address(0)) revert InvalidAmount();
        if (_amount > usdtToken.balanceOf(address(this))) revert TransferFailed();

        bool success = usdtToken.transfer(_to, _amount);
        if (!success) revert TransferFailed();

        emit FundsWithdrawn(_to, _amount, block.timestamp);
    }

    function emergencyWithdraw(address _to) external onlyOwner {
        if (_to == address(0)) revert InvalidAmount();

        uint256 balance = usdtToken.balanceOf(address(this));
        if (balance > 0) {
            bool success = usdtToken.transfer(_to, balance);
            if (!success) revert TransferFailed();

            emit FundsWithdrawn(_to, balance, block.timestamp);
        }
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getAllContributors() external view returns (address[] memory) {
        return contributors;
    }

    function getContractBalance() external view returns (uint256) {
        return usdtToken.balanceOf(address(this));
    }

    function getContributorCount() external view returns (uint256) {
        return contributors.length;
    }
}
