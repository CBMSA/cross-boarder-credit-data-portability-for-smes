
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ===== OpenZeppelin Imports =====
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// ===== Uniswap Router Interface =====
interface IUniswapV2Router02 {
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable;

    function WETH() external pure returns (address);
}

// ===== SadiCoin Contract =====
contract SadiCoin is ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---- Constants ----
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1B SADI
    uint256 public constant TAX_RATE = 3; // 3% transaction tax

    // ---- State Variables ----
    bool public depositsEnabled = true;
    bool public redemptionsEnabled = true;

    IUniswapV2Router02 public immutable uniswapRouter;
    address public immutable WETH;

    mapping(address => uint256) public pendingRedemptions;

    // ---- Events ----
    event Deposit(address indexed user, uint256 ethAmount, uint256 tokensMinted);
    event Redeem(address indexed user, uint256 tokenAmount, uint256 ethReturned);
    event TaxPaid(address indexed from, address indexed to, uint256 taxAmount);
    event Withdrawn(address indexed to, uint256 amount);
    event SwapExecuted(address indexed user, uint256 amountIn, uint256 amountOutMin);
    event RescueERC20(address indexed token, uint256 amount, address indexed to);

    // ---- Constructor ----
    constructor(address _router) ERC20("SadiCoin", "SADI") Ownable(msg.sender) {
        require(_router != address(0), "Invalid router");
        uniswapRouter = IUniswapV2Router02(_router);
        WETH = uniswapRouter.WETH();

        require(WETH != address(0), "Invalid WETH");
        _mint(msg.sender, MAX_SUPPLY);
    }

    // ---- Deposit ETH → Mint SADI ----
    function deposit() external payable nonReentrant {
        require(depositsEnabled, "Deposits disabled");
        require(msg.value > 0, "Must send ETH");
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value, msg.value);
    }

    // ---- Redeem SADI → Queue for ETH ----
    function redeem(uint256 amount) external nonReentrant {
        require(redemptionsEnabled, "Redemptions disabled");
        require(amount > 0, "Amount zero");
        require(balanceOf(msg.sender) >= amount, "Insufficient SADI");

        _burn(msg.sender, amount);
        pendingRedemptions[msg.sender] += amount;

        emit Redeem(msg.sender, amount, amount);
    }

    // ---- Claim ETH Redemption ----
    function claimRedemption() external nonReentrant {
        uint256 amount = pendingRedemptions[msg.sender];
        require(amount > 0, "Nothing to claim");
        pendingRedemptions[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    // ---- Internal Tax Logic ----
    function _update(address from, address to, uint256 value) internal override {
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

    // ---- Swaps (FIXED) ----
    function swapSADIForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external nonReentrant {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Amount zero");

        IERC20(address(this)).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(address(this)).safeIncreaseAllowance(address(uniswapRouter), amountIn);

        // Declare and initialize path
        address[] memory path = new address[](2);
        path[0] = address(this); // SADI token address
        path[1] = WETH;           // WETH address

        uniswapRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
            amountIn,
            amountOutMin,
            path,
            msg.sender,
            deadline
        );

        emit SwapExecuted(msg.sender, amountIn, amountOutMin);
    }

    function swapETHForSADI(
        uint256 amountOutMin,
        uint256 deadline
    ) external payable nonReentrant {
        require(block.timestamp <= deadline, "Expired");
        require(msg.value > 0, "No ETH sent");

        // Declare and initialize path
        address[] memory path = new address[](2);
        path[0] = WETH;           // WETH address
        path[1] = address(this); // SADI token address

        uniswapRouter.swapExactETHForTokensSupportingFeeOnTransferTokens{
            value: msg.value
        }(
            amountOutMin,
            path,
            msg.sender,
            deadline
        );

        emit SwapExecuted(msg.sender, msg.value, amountOutMin);
    }

    // ---- Admin Functions ----
    function setDepositsEnabled(bool enabled) external onlyOwner {
        depositsEnabled = enabled;
    }

    function setRedemptionsEnabled(bool enabled) external onlyOwner {
        redemptionsEnabled = enabled;
    }

    function withdrawETH(uint256 amount) external onlyOwner nonReentrant {
        require(address(this).balance >= amount, "Insufficient ETH");
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdraw failed");
        emit Withdrawn(owner(), amount);
    }

    function rescueERC20(address token, uint256 amount, address to)
        external
        onlyOwner
        nonReentrant
    {
        require(token != address(this), "Cannot rescue SADI");
        require(to != address(0), "Invalid recipient");
        IERC20(token).safeTransfer(to, amount);
        emit RescueERC20(token, amount, to);
    }

    // ---- Fallback ----
    receive() external payable {}
}
