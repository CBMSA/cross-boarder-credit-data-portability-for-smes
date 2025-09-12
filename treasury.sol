
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/*
 SadiCoin (SADI) - ERC20 with a transfer tax sent to treasury.
  - 2% tax on every transfer (can be changed by owner)
  - owner = deployer (can mint/burn)
  - uses OpenZeppelin libraries
*/

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SadiCoin is ERC20, Ownable {
    address public treasury;
    uint256 public taxBasisPoints = 200; // 2.00% = 200 bps (1% = 100 bps)
    uint256 public constant BPS_DIV = 10000;

    event TaxUpdated(uint256 newBps);
    event TreasuryUpdated(address newTreasury);

    constructor(address _treasury, uint256 initialSupply) ERC20("SadiCoin", "SADI") {
        require(_treasury != address(0), "Treasury required");
        treasury = _treasury;
        _mint(msg.sender, initialSupply);
    }

    function setTaxBps(uint256 _bps) external onlyOwner {
        require(_bps <= 1000, "Tax cannot exceed 10%");
        taxBasisPoints = _bps;
        emit TaxUpdated(_bps);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }

    // Override transfer logic to take tax
    function _transfer(address sender, address recipient, uint256 amount) internal virtual override {
        if (taxBasisPoints == 0 || sender == treasury || recipient == treasury || sender == owner() || recipient == owner()) {
            // no tax for treasury or owner (optional)
            super._transfer(sender, recipient, amount);
            return;
        }

        uint256 tax = (amount * taxBasisPoints) / BPS_DIV;
        uint256 net = amount - tax;

        if (tax > 0) {
            super._transfer(sender, treasury, tax);
        }
        super._transfer(sender, recipient, net);
    }
}





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
