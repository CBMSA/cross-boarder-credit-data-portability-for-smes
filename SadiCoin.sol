// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SadiCoin
 * @dev ERC20 token with a transfer tax sent to a treasury.
 * Features:
 * - Configurable tax (up to 10%) with proper rounding.
 * - Tax exemptions for owner/treasury.
 * - Secure and gas-optimized (uses super._transfer).
 */
contract SadiCoin is ERC20, Ownable {
    address public treasury;
    uint256 public taxBasisPoints = 200;  // 2.00% (1% = 100 bps)
    uint256 public constant BPS_DIV = 10_000;
    uint256 public constant MAX_TAX_BPS = 1000;  // 10% max tax

    // Events
    event TaxUpdated(uint256 newBps);
    event TreasuryUpdated(address newTreasury);
    event TaxedTransfer(address indexed from, address indexed to, uint256 taxAmount, uint256 netAmount);

    constructor(address _treasury, uint256 initialSupply)
        ERC20("SadiCoin", "SADI")
    {
        require(_treasury != address(0), "SadiCoin: Treasury cannot be zero");
        treasury = _treasury;
        _mint(msg.sender, initialSupply);
    }

    // --- Owner Functions ---
    function setTaxBps(uint256 _bps) external onlyOwner {
        require(_bps <= MAX_TAX_BPS, "SadiCoin: Tax exceeds maximum");
        taxBasisPoints = _bps;
        emit TaxUpdated(_bps);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "SadiCoin: Treasury cannot be zero");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }

    // --- Core Transfer Logic (Fixed) ---
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual override {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        // Skip tax for owner/treasury or when tax is disabled
        if (taxBasisPoints == 0 || sender == owner() || recipient == owner() || sender == treasury || recipient == treasury) {
            super._transfer(sender, recipient, amount);
            return;
        }

        // Calculate tax with rounding (to nearest integer)
        uint256 tax = ((amount * taxBasisPoints) + (BPS_DIV / 2)) / BPS_DIV;
        uint256 net = amount - tax;

        require(tax <= amount, "SadiCoin: Tax exceeds transfer amount");

        // Transfer tax to treasury (if tax > 0)
        if (tax > 0) {
            super._transfer(sender, treasury, tax);
        }
        // Transfer net amount to recipient
        super._transfer(sender, recipient, net);

        // Emit custom event for tracking
        emit TaxedTransfer(sender, recipient, tax, net);
    }
}
