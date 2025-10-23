// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SadiCoin is ERC20, Ownable, ReentrancyGuard {
    // ... (previous imports and state variables)

    mapping(address => uint256) public pendingRedemptions;

    function redeem(uint256 amount) external nonReentrant {
        require(redemptionsEnabled, "Redemptions disabled");
        require(amount > 0, "Amount zero");
        require(balanceOf(msg.sender) >= amount, "Insufficient SADI");
        _burn(msg.sender, amount);
        pendingRedemptions[msg.sender] += amount;
        emit Redeem(msg.sender, amount, amount);
    }

    function claimRedemption() external nonReentrant {
        uint256 amount = pendingRedemptions[msg.sender];
        require(amount > 0, "Nothing to claim");
        pendingRedemptions[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override {
        if (from != owner() && to != owner()) {
            uint256 taxAmount = (value * TAX_RATE + 99) / 100; // Round up
            if (taxAmount > 0) {
                super._update(from, owner(), taxAmount);
                super._update(from, to, value - taxAmount);
                emit TaxPaid(from, to, taxAmount);
                return;
            }
        }
        super._update(from, to, value);
    }

    function swapSADIForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external nonReentrant {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Amount zero");
        require(path.length == 2, "Invalid path length");

        uint256 before = balanceOf(address(this));
        IERC20(address(this)).safeTransferFrom(msg.sender, address(this), amountIn);
        uint256 received = balanceOf(address(this)) - before;
        require(received > 0, "No tokens received after tax");

        IERC20(address(this)).safeIncreaseAllowance(address(uniswapRouter), received);
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = WETH;

        uniswapRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
            received,
            amountOutMin,
            path,
            msg.sender,
            deadline
        );
    }
}
