
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
 *  SadiCoin (SADC)
 *  1 SADI = 1 ETH (fully redeemable)
 *  Total Supply: 1,000,000,000 SADI
 *  Redeemable and transferrable ERC20 token
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SadiCoin is ERC20, Ownable, ReentrancyGuard {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18; // 1 billion SADI
    bool public depositsEnabled = true;
    bool public redemptionsEnabled = true;

    event Deposit(address indexed user, uint256 ethAmount, uint256 tokensMinted);
    event Redeem(address indexed user, uint256 tokenAmount, uint256 ethReturned);
    event SupplyMinted(address indexed to, uint256 amount);

    constructor() ERC20("SadiCoin", "SADI") {
        // Automatically mint 1 billion SadiCoin to deployer
        _mint(msg.sender, MAX_SUPPLY);
        emit SupplyMinted(msg.sender, MAX_SUPPLY);
    }

    /// @notice Deposit ETH to mint SADI 1:1
    function deposit() external payable nonReentrant {
        require(depositsEnabled, "Deposits disabled");
        require(msg.value > 0, "Must send ETH");
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value, msg.value);
    }

    /// @notice Redeem SADI for ETH at 1:1 ratio
    function redeem(uint256 amount) external nonReentrant {
        require(redemptionsEnabled, "Redemptions disabled");
        require(balanceOf(msg.sender) >= amount, "Insufficient SADI");
        require(address(this).balance >= amount, "Insufficient ETH reserves");

        _burn(msg.sender, amount);
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ETH transfer failed");
        emit Redeem(msg.sender, amount, amount);
    }

    /// @notice Allow contract to receive ETH
    receive() external payable {}

    /// @notice Owner can toggle deposit or redeem features
    function toggleDeposit(bool enabled) external onlyOwner {
        depositsEnabled = enabled;
    }

    function toggleRedeem(bool enabled) external onlyOwner {
        redemptionsEnabled = enabled;
    }

    /// @notice Owner can withdraw ETH (e.g., off-ramp treasury)
    function withdrawETH(uint256 amount, address payable to) external onlyOwner {
        require(to != address(0), "Invalid address");
        require(address(this).balance >= amount, "Insufficient ETH");
        (bool success, ) = to.call{value: amount}("");
        require(success, "Withdraw failed");
    }
}
