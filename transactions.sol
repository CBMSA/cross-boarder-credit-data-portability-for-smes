
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Sadicoin USD token (SUSD)
/// @notice Total supply = 1,000,000 SUSD minted to the deployer (18 decimals)
contract SadicoinUSD is ERC20, Ownable {
    constructor() ERC20("Sadicoin USD", "SUSD") {
        // Mint 1,000,000 * 10^18 units to deployer
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    // Owner convenience functions (optional in production; review access policies)
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}
