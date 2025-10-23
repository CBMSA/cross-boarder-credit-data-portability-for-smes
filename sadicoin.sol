// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IUniswapV2Router02 {
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    function WETH() external pure returns (address);
}

contract SadiCoin is ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1B SADI (18 decimals)
    uint256 public constant TAX_RATE = 3; // 3% tax (integer)
    uint256 public constant MIN_SWAP_DEADLINE = 20 minutes; // Default deadline buffer

    // State
    bool public depositsEnabled = true;
    bool public redemptionsEnabled = true;
    IUniswapV2Router02 public immutable uniswapRouter;
    address public immutable WETH;

    // Events
    event Deposit(address indexed user, uint256 ethAmount, uint256 tokensMinted);
    event Redeem(address indexed user, uint256 tokenAmount, uint256 ethReturned);
    event TaxPaid(address indexed from, address indexed to, uint256 taxAmount);
    event SwapExecuted(
        address indexed user,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    );
    event AdminAction(address indexed admin, string action, uint256 value);
    event Withdrawn(address indexed to, uint256 amount);
    event RescueERC20(address indexed token, uint256 amount, address indexed to);

    constructor(address _router) ERC20("SadiCoin", "SADI") Ownable(msg.sender) {
        require(_router != address(0), "Invalid router");
        uniswapRouter = IUniswapV2Router02(_router);
        WETH = uniswapRouter.WETH();

        require(WETH != address(0), "Invalid WETH");
        require(WETH.code.length > 0, "WETH not a contract");

        _mint(msg.sender, MAX_SUPPLY);
        emit AdminAction(msg.sender, "CONTRACT_DEPLOYED_AND_SUPPLY_MINTED", MAX_SUPPLY);
    }

    // ========== Core Functions ==========
    /// @notice Deposit ETH and mint SADI 1:1 (1 wei ETH = 1 wei SADI)
    function deposit() external payable nonReentrant {
        require(depositsEnabled, "Deposits disabled");
        require(msg.value > 0, "Must send ETH");
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value, msg.value);
    }

    /// @notice Redeem SADI for ETH 1:1 (with slippage protection)
    function redeem(uint256 amount, uint256 minETH) external nonReentrant {
        require(redemptionsEnabled, "Redemptions disabled");
        require(amount > 0, "Amount zero");
        require(balanceOf(msg.sender) >= amount, "Insufficient SADI");
        require(address(this).balance >= amount, "Insufficient ETH reserves");
        require(amount >= minETH, "Slippage too high");

        _burn(msg.sender, amount);
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ETH transfer failed");
        emit Redeem(msg.sender, amount, amount);
    }

    // ========== Tax Logic (via _update) ==========
    /// @dev Overrides ERC20._update to apply 3% tax (unless owner is involved)
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override {
        if (from != owner() && to != owner() && from != address(0) && to != address(0)) {
            uint256 taxAmount = (value * TAX_RATE) / 100;
            if (taxAmount > 0) {
                super._update(from, owner(), taxAmount);
                super._update(from, to, value - taxAmount);
                emit TaxPaid(from, to, taxAmount);
                return;
            }
        }
        super._update(from, to, value);
    }

    // ========== Swap Helpers ==========
    function swapSADIForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external nonReentrant {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Amount zero");

        // Transfer tokens from user (tax applied via _update)
        uint256 before = balanceOf(address(this));
        IERC20(address(this)).safeTransferFrom(msg.sender, address(this), amountIn);
        uint256 received = balanceOf(address(this)) - before;
        require(received > 0, "No tokens received after tax");

        // Approve router and swap
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

        emit SwapExecuted(msg.sender, WETH, amountIn, amountOutMin, deadline);
    }

    function swapETHForSADI(
        uint256 amountOutMin,
        uint256 deadline
    ) external payable nonReentrant {
        require(block.timestamp <= deadline, "Expired");
        require(msg.value > 0, "Must send ETH");

        address[] memory path = new address[](2);
        path[0] = WETH;
        path[1] = address(this);

        uniswapRouter.swapExactETHForTokensSupportingFeeOnTransferTokens{
            value: msg.value
        }(
            amountOutMin,
            path,
            msg.sender,
            deadline
        );

        emit SwapExecuted(msg.sender, address(this), msg.value, amountOutMin, deadline);
    }

    // ========== Admin Functions ==========
    function setDepositsEnabled(bool enabled) external onlyOwner {
        depositsEnabled = enabled;
        emit AdminAction(msg.sender, "SET_DEPOSITS_ENABLED", enabled ? 1 : 0);
    }

    function setRedemptionsEnabled(bool enabled) external onlyOwner {
        redemptionsEnabled = enabled;
        emit AdminAction(msg.sender, "SET_REDEMPTIONS_ENABLED", enabled ? 1 : 0);
    }

    function withdrawETH(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount zero");
        require(address(this).balance >= amount, "Insufficient ETH");

        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "ETH transfer failed");
        emit Withdrawn(owner(), amount);
    }

    function rescueERC20(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner nonReentrant {
        require(token != address(this), "Cannot rescue SADI");
        require(to != address(0), "Invalid recipient");
        IERC20(token).safeTransfer(to, amount);
        emit RescueERC20(token, amount, to);
    }

    receive() external payable {}
}
