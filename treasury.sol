// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title SadiCoin - A regional digital asset with transaction tax
/// @notice Includes 2% transaction tax sent to Treasury
contract SadiCoin is ERC20, Ownable {
    uint256 public taxRate = 200; // 2% (basis points)
    address public treasury;

    event TaxTaken(address indexed from, address indexed to, uint256 taxAmount);

    constructor(address _treasury) ERC20("SadiCoin", "SADI") Ownable(msg.sender) {
        require(_treasury != address(0), "Treasury cannot be zero");
        treasury = _treasury;
        _mint(msg.sender, 1_000_000 * 10 ** decimals()); // Initial supply
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }

    function setTaxRate(uint256 _bps) external onlyOwner {
        require(_bps <= 1000, "Max 10%");
        taxRate = _bps;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal override {
        if (taxRate > 0 && treasury != address(0)) {
            uint256 taxAmount = (amount * taxRate) / 10000;
            uint256 netAmount = amount - taxAmount;

            super._transfer(sender, treasury, taxAmount);
            super._transfer(sender, recipient, netAmount);

            emit TaxTaken(sender, recipient, taxAmount);
        } else {
            super._transfer(sender, recipient, amount);
        }
    }
}
