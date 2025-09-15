
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Sadicoin ERC20 token (prototype)
/// @notice Minted supply = 1000 tokens (with 18 decimals). Owner can mint/burn if needed.
contract Sadicoin is ERC20, Ownable {
    constructor() ERC20("Sadicoin", "SADI") {
        // Mint 1000 SADI to deployer (1000 * 10^18)
        _mint(msg.sender, 1000 * 10 ** decimals());
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
