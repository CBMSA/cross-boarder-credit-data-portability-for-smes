
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract Sadicoin is ERC20, Ownable, ERC20Permit {
    uint256 private constant INITIAL_SUPPLY = 1_000_000 * 10**18; // 1M SADI (18 decimals)
    address public moonPayWallet; // MoonPay's hot wallet for on/off-ramp

    constructor()
        ERC20("Sadicoin", "SADI")
        ERC20Permit("Sadicoin")
        Ownable(msg.sender)  // <-- Fix: Pass initialOwner
    {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /// @notice Owner-only mint (optional)
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Owner-only burn (optional)
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}
