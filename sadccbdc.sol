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

        // Fix: Explicitly cast _router to IUniswapV2Router02
        IUniswapV2Router02 router = IUniswapV2Router02(_router);
        uniswapRouter = router;
        WETH = router.WETH();

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
    /// @param amount SADI amount to burn
    /// @param minETH Minimum ETH expected (prevents front-running)
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

    // ========== Tax Logic ==========
    /// @dev Overrides ERC20._transfer to apply 3% tax (unless owner is involved)
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        if (from != owner() && to != owner()) {
            uint256 taxAmount = (amount * TAX_RATE) / 100;
            if (taxAmount > 0) {
                super._transfer(from, owner(), taxAmount);
                super._transfer(from, to, amount - taxAmount);
                emit TaxPaid(from, owner(), taxAmount);
                return;
            }
        }
        super._transfer(from, to, amount);
    }

    // ========== Swap Helpers ==========
    /// @notice Swap SADI for ETH via Uniswap V2 (user must approve contract first)
    /// @param amountIn SADI amount to swap (before tax)
    /// @param amountOutMin Minimum ETH expected (slippage protection)
    /// @param deadline Transaction expiry (use block.timestamp + buffer)
    function swapSADIForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external nonReentrant {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Amount zero");

        // Pull tokens from user (tax applied here)
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

    /// @notice Swap ETH for SADI via Uniswap V2
    /// @param amountOutMin Minimum SADI expected (slippage protection)
    /// @param deadline Transaction expiry
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
    /// @notice Toggle deposits on/off
    function setDepositsEnabled(bool enabled) external onlyOwner {
        depositsEnabled = enabled;
        emit AdminAction(msg.sender, "SET_DEPOSITS_ENABLED", enabled ? 1 : 0);
    }

    /// @notice Toggle redemptions on/off
    function setRedemptionsEnabled(bool enabled) external onlyOwner {
        redemptionsEnabled = enabled;
        emit AdminAction(msg.sender, "SET_REDEMPTIONS_ENABLED", enabled ? 1 : 0);
    }

    /// @notice Withdraw ETH from contract (owner only)
    function withdrawETH(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount zero");
        require(address(this).balance >= amount, "Insufficient ETH");

        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "ETH transfer failed");

        emit Withdrawn(owner(), amount);
    }

    /// @notice Rescue accidentally sent ERC20 tokens (excluding SADI)
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

    // Allow contract to receive ETH
    receive() external payable {}
}
