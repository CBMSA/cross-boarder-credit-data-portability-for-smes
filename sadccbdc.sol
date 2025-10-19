
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
  SadiCoin (SADI)
  - Combined redeemable (1 SADI = 1 ETH via deposit/redeem) and fixed-supply utility token
  - Owner minting up to MAX_SUPPLY
  - Swap helpers integrated for Uniswap-like routers (IUniswapV2Router02)
  - Audit metadata storage
*/

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

interface IUniswapV2Router02 {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable returns (uint[] memory amounts);

    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function WETH() external pure returns (address);
}

contract SadiCoin is ERC20, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    uint256 public immutable MAX_SUPPLY;
    bool public depositsEnabled = true;
    bool public redemptionsEnabled = true;

    // Uniswap/Pancake style router address — settable by owner
    IUniswapV2Router02 public dexRouter;

    // Audit metadata: store an IPFS hash / URL / timestamp for external audits
    string public auditReportURL;
    string public auditReportHash; // optional IPFS hash
    uint256 public auditTimestamp;

    // Events
    event Deposit(address indexed user, uint256 ethAmount, uint256 tokensMinted);
    event Redeem(address indexed user, uint256 tokenAmount, uint256 ethReturned);
    event SupplyMinted(address indexed to, uint256 amount);
    event RouterUpdated(address indexed newRouter);
    event SwapExecuted(address indexed executor, address indexed fromToken, address indexed toToken, uint256 amountIn, uint256 amountOut);
    event AuditReported(string url, string hash, uint256 timestamp);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupplyUnits, // specify in token units (e.g., 1_000_000_000 * 10**18)
        address initialRouter // optional router address (0 if none)
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        require(maxSupplyUnits > 0, "Max supply must be > 0");
        MAX_SUPPLY = maxSupplyUnits;

        if (initialRouter != address(0)) {
            dexRouter = IUniswapV2Router02(initialRouter);
            emit RouterUpdated(initialRouter);
        }
    }

    // -------------------------
    // Minting (owner)
    // -------------------------
    /// @notice Owner mints tokens up to MAX_SUPPLY
    function ownerMint(address to, uint256 amount) external onlyOwner whenNotPaused {
        require(to != address(0), "Invalid to");
        require(amount > 0, "Amount zero");
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
        emit SupplyMinted(to, amount);
    }

    // -------------------------
    // Deposit / Redeem (1:1 with ETH)
    // -------------------------
    /// @notice Deposit ETH and receive SADI at 1:1 (1 wei ETH => 1 token unit). Obeys MAX_SUPPLY.
    function deposit() external payable nonReentrant whenNotPaused {
        require(depositsEnabled, "Deposits disabled");
        require(msg.value > 0, "Must send ETH");
        require(totalSupply() + msg.value <= MAX_SUPPLY, "Deposit exceeds max supply");
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value, msg.value);
    }

    /// @notice Redeem tokens for ETH at 1:1
    function redeem(uint256 amount) external nonReentrant whenNotPaused {
        require(redemptionsEnabled, "Redemptions disabled");
        require(amount > 0, "Amount zero");
        require(balanceOf(msg.sender) >= amount, "Insufficient SADI");
        require(address(this).balance >= amount, "Insufficient ETH reserves");

        _burn(msg.sender, amount);
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ETH transfer failed");

        emit Redeem(msg.sender, amount, amount);
    }

    // Fallbacks to receive ETH (for router swaps or direct funding)
    receive() external payable {}
    fallback() external payable {}

    // -------------------------
    // Toggle controls
    // -------------------------
    function toggleDeposit(bool enabled) external onlyOwner {
        depositsEnabled = enabled;
    }

    function toggleRedeem(bool enabled) external onlyOwner {
        redemptionsEnabled = enabled;
    }

    // -------------------------
    // DEX / Swap helpers
    // -------------------------
    /// @notice Set DEX router (owner)
    function setRouter(address router) external onlyOwner {
        require(router != address(0), "Invalid router");
        dexRouter = IUniswapV2Router02(router);
        emit RouterUpdated(router);
    }

    /// @notice Swap tokens that the contract already holds (contract must hold `amountIn` of fromToken).
    /// Caller must be owner (or allowlist) — we restrict to owner to avoid misuse; change if desired.
    function swapContractTokens(
        address fromToken,
        address[] calldata path,
        uint256 amountIn,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external onlyOwner nonReentrant whenNotPaused returns (uint[] memory amounts) {
        require(address(dexRouter) != address(0), "Router not set");
        require(fromToken == path[0], "Path mismatch");
        require(path[path.length - 1] != address(0), "Invalid path");
        require(amountIn > 0, "Amount zero");

        IERC20(fromToken).safeIncreaseAllowance(address(dexRouter), amountIn);
        amounts = dexRouter.swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline);
        emit SwapExecuted(msg.sender, fromToken, path[path.length - 1], amountIn, amounts[amounts.length - 1]);
    }

    /// @notice Swap tokens taken from the caller: transferFrom caller -> contract -> swap -> send to `to`.
    /// Caller must approve this contract for `amountIn` of fromToken.
    function swapFromUserTokens(
        address fromToken,
        address[] calldata path,
        uint256 amountIn,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external nonReentrant whenNotPaused returns (uint[] memory amounts) {
        require(address(dexRouter) != address(0), "Router not set");
        require(fromToken == path[0], "Path mismatch");
        require(amountIn > 0, "Amount zero");
        IERC20(fromToken).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router
        IERC20(fromToken).safeIncreaseAllowance(address(dexRouter), amountIn);
        amounts = dexRouter.swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline);
        emit SwapExecuted(msg.sender, fromToken, path[path.length - 1], amountIn, amounts[amounts.length - 1]);
    }

    /// @notice Swap ETH (sent with call) to tokens via router, send tokens to `to`.
    function swapETHForTokens(
        address[] calldata path,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external payable nonReentrant whenNotPaused returns (uint[] memory amounts) {
        require(address(dexRouter) != address(0), "Router not set");
        require(path.length >= 2, "Path too short");
        require(msg.value > 0, "Must send ETH");

        amounts = dexRouter.swapExactETHForTokens{value: msg.value}(amountOutMin, path, to, deadline);
        emit SwapExecuted(msg.sender, address(0), path[path.length - 1], msg.value, amounts[amounts.length - 1]);
    }

    /// @notice Swap tokens (contract-held) for ETH and send to `to`.
    function swapTokensForETH(
        address fromToken,
        address[] calldata path,
        uint256 amountIn,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external onlyOwner nonReentrant whenNotPaused returns (uint[] memory amounts) {
        require(address(dexRouter) != address(0), "Router not set");
        require(path[path.length - 1] == dexRouter.WETH(), "Last path must be WETH");
        IERC20(fromToken).safeIncreaseAllowance(address(dexRouter), amountIn);
        amounts = dexRouter.swapExactTokensForETH(amountIn, amountOutMin, path, to, deadline);
        emit SwapExecuted(msg.sender, fromToken, address(0), amountIn, amounts[amounts.length - 1]);
    }

    // -------------------------
    // Rescue and Treasury functions
    // -------------------------
    /// @notice Owner withdraw ETH from contract
    function withdrawETH(uint256 amount, address payable to) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid address");
        require(address(this).balance >= amount, "Insufficient ETH");
        (bool success, ) = to.call{value: amount}("");
        require(success, "Withdraw failed");
    }

    /// @notice Owner can rescue ERC20 tokens accidentally sent to contract (except SADI itself unless intended)
    function rescueERC20(address token, uint256 amount, address to) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid address");
        require(token != address(this), "Use burn/withdraw for SADI");
        IERC20(token).safeTransfer(to, amount);
    }

    // -------------------------
    // Audit metadata
    // -------------------------
    /// @notice Owner registers audit metadata (URL, IPFS hash), plus timestamp
    function reportAudit(string calldata url, string calldata ipfsHash) external onlyOwner {
        auditReportURL = url;
        auditReportHash = ipfsHash;
        auditTimestamp = block.timestamp;
        emit AuditReported(url, ipfsHash, block.timestamp);
    }

    // -------------------------
    // Pausable overrides
    // -------------------------
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // -------------------------
    // Views and helpers
    // -------------------------
    /// @notice Returns whether more tokens can be minted (cap remaining)
    function capRemaining() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }
}

