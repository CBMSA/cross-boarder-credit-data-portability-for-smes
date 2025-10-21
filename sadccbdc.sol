
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
  SadiCoin (SADI) - Polygon-ready (fixed)
  - Initial supply minted to deployer: 1,000,000 SADI (18 decimals)
  - Deposit (MATIC) -> mint 1:1 (1 wei MATIC -> 1 token unit)
  - Redeem -> burn tokens and send MATIC 1:1 (requires contract MATIC)
  - Transfer tax (default 3.00%) sent to taxRecipient (owner by default)
  - Swap helpers for UniswapV2-style routers (QuickSwap)
  - Monthly mint (every 25 days) triggerable on-chain; mints configurable amount to taxRecipient
  - Audit metadata and events
  - Improvements: tax exclusions, owner mint respects MAX_SUPPLY, events
*/

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IUniswapV2Router02 {
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable;

    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);

    function WETH() external pure returns (address);
}

contract SadiCoin is ERC20, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ----- Token parameters -----
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10 ** 18; // 1,000,000 SADI
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18; // optional hard cap (1B)
    uint256 public constant BPS_DIV = 10_000;
    uint256 public taxBasisPoints = 300; // default 3.00%
    uint256 public constant MAX_TAX_BPS = 1000; // 10%

    // ----- Deposit / Redeem control -----
    bool public depositsEnabled = true;
    bool public redemptionsEnabled = true;

    // ----- Swap router -----
    IUniswapV2Router02 public dexRouter;
    address public WETH; // router.WETH()

    // ----- Tax recipient and exclusions -----
    address public taxRecipient;
    mapping(address => bool) public excludeFromTax;

    // ----- Monthly mint (regeneration) -----
    uint256 public monthlyMintAmount; // amount in token units (18 decimals)
    uint256 public lastMonthlyMint;   // timestamp of last mint
    uint256 public constant MONTH_PERIOD = 25 days; // 25-day period

    // ----- Audit metadata -----
    string public auditReportURL;
    string public auditReportHash;
    uint256 public auditTimestamp;

    // ----- Events -----
    event Deposit(address indexed user, uint256 maticAmount, uint256 tokensMinted);
    event Redeem(address indexed user, uint256 tokenAmount, uint256 maticReturned);
    event TaxPaid(address indexed from, address indexed to, uint256 taxAmount);
    event SwapExecuted(address indexed user, address tokenOut, uint256 amountIn, uint256 amountOutMin);
    event MonthlyMint(address indexed to, uint256 amount, uint256 timestamp);
    event AuditReported(string url, string hash, uint256 timestamp);
    event RouterUpdated(address indexed router, address indexed weth);
    event OwnerMinted(address indexed to, uint256 amount);
    event OwnerBurned(address indexed from, uint256 amount);
    event ExcludeFromTaxUpdated(address indexed account, bool excluded);
    event TaxRecipientUpdated(address indexed recipient);

    constructor(address _router, uint256 _monthlyMintAmount) ERC20("SadiCoin", "SADI") {
        // set router if provided
        if (_router != address(0)) {
            dexRouter = IUniswapV2Router02(_router);
            WETH = dexRouter.WETH();
            emit RouterUpdated(_router, WETH);
        }

        // initial mint to deployer (owner) - respect MAX_SUPPLY
        require(INITIAL_SUPPLY <= MAX_SUPPLY, "Initial exceeds max supply");
        _mint(msg.sender, INITIAL_SUPPLY);
        emit OwnerMinted(msg.sender, INITIAL_SUPPLY);

        // set tax recipient to owner initially
        taxRecipient = msg.sender;
        excludeFromTax[msg.sender] = true;
        excludeFromTax[address(this)] = true;
        excludeFromTax[taxRecipient] = true;

        // initialize monthly mint amount and timestamp (owner can adjust later)
        monthlyMintAmount = _monthlyMintAmount;
        lastMonthlyMint = block.timestamp;

        emit AuditReported("DEPLOY", "", block.timestamp);
    }

    // -------------------------
    // Deposit (MATIC -> SADI) — 1:1
    // -------------------------
    function deposit() external payable nonReentrant whenNotPaused {
        require(depositsEnabled, "Deposits disabled");
        require(msg.value > 0, "Must send MATIC");
        // respect MAX_SUPPLY
        require(totalSupply() + msg.value <= MAX_SUPPLY, "Exceeds max supply");

        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value, msg.value);
    }

    // -------------------------
    // Redeem (SADI -> MATIC) — 1:1
    // -------------------------
    function redeem(uint256 amount) external nonReentrant whenNotPaused {
        require(redemptionsEnabled, "Redemptions disabled");
        require(amount > 0, "Amount zero");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        require(address(this).balance >= amount, "Contract MATIC insufficient");

        _burn(msg.sender, amount);
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "MATIC send failed");

        emit Redeem(msg.sender, amount, amount);
    }

    // -------------------------
    // ERC20 transfer override with tax to taxRecipient
    // -------------------------
    function _transfer(address sender, address recipient, uint256 amount) internal virtual override {
        require(sender != address(0) && recipient != address(0), "Zero address");
        require(amount > 0, "Zero amount");

        // Exemptions: tax disabled, taxRecipient, contract and excluded addresses
        if (
            taxBasisPoints == 0 ||
            sender == address(this) ||
            recipient == address(this) ||
            excludeFromTax[sender] ||
            excludeFromTax[recipient]
        ) {
            super._transfer(sender, recipient, amount);
            return;
        }

        // compute tax with rounding
        uint256 tax = ((amount * taxBasisPoints) + (BPS_DIV / 2)) / BPS_DIV;
        if (tax > 0) {
            uint256 net = amount - tax;
            super._transfer(sender, taxRecipient, tax);      // tax to taxRecipient
            super._transfer(sender, recipient, net);         // rest to recipient
            emit TaxPaid(sender, taxRecipient, tax);
        } else {
            super._transfer(sender, recipient, amount);
        }
    }

    // -------------------------
    // Swap helpers (SADI <-> MATIC)
    // -------------------------
    // Note: router must support fee-on-transfer supporting functions.
    function swapSADIForMATIC(uint256 amountIn, uint256 amountOutMin) external nonReentrant whenNotPaused {
        require(address(dexRouter) != address(0), "Router not set");
        require(amountIn > 0, "amountIn=0");

        // record contract balance before
        uint256 before = balanceOf(address(this));
        // pull tokens from user (user must approve)
        IERC20(address(this)).safeTransferFrom(msg.sender, address(this), amountIn);
        uint256 received = balanceOf(address(this)) - before;
        require(received > 0, "No tokens received (after tax)");

        // approve router
        IERC20(address(this)).safeIncreaseAllowance(address(dexRouter), received);

        address;
        path[0] = address(this);
        path[1] = WETH;

        // swap tokens -> MATIC (ETH) to msg.sender
        dexRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
            received,
            amountOutMin,
            path,
            msg.sender,
            block.timestamp
        );

        emit SwapExecuted(msg.sender, WETH, received, amountOutMin);
    }

    function swapMATICForSADI(uint256 amountOutMin) external payable nonReentrant whenNotPaused {
        require(address(dexRouter) != address(0), "Router not set");
        require(msg.value > 0, "Send MATIC");

        address;
        path[0] = WETH;
        path[1] = address(this);

        dexRouter.swapExactETHForTokensSupportingFeeOnTransferTokens{ value: msg.value }(
            amountOutMin,
            path,
            msg.sender,
            block.timestamp
        );

        emit SwapExecuted(msg.sender, address(this), msg.value, amountOutMin);
    }

    // -------------------------
    // Monthly mint (regeneration) — triggerable on-chain
    // -------------------------
    /// @notice Trigger monthly mint to taxRecipient. Can be called by anyone only after 25 days since last mint.
    function triggerMonthlyMint() external nonReentrant whenNotPaused {
        require(monthlyMintAmount > 0, "Monthly mint amount not set");
        require(block.timestamp >= lastMonthlyMint + MONTH_PERIOD, "Too early: must wait 25 days");
        require(totalSupply() + monthlyMintAmount <= MAX_SUPPLY, "Exceeds max supply");

        lastMonthlyMint = block.timestamp;
        _mint(taxRecipient, monthlyMintAmount);
        emit MonthlyMint(taxRecipient, monthlyMintAmount, block.timestamp);
    }

    // -------------------------
    // Owner / Admin functions
    // -------------------------
    /// @notice Owner can mint (respecting MAX_SUPPLY)
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
        emit OwnerMinted(to, amount);
    }

    /// @notice Owner can burn (from any address with allowance or own tokens)
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
        emit OwnerBurned(from, amount);
    }

    function setTaxBps(uint256 _bps) external onlyOwner {
        require(_bps <= MAX_TAX_BPS, "Tax exceeds max");
        taxBasisPoints = _bps;
    }

    function setTaxRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Invalid recipient");
        taxRecipient = _recipient;
        excludeFromTax[_recipient] = true;
        emit TaxRecipientUpdated(_recipient);
    }

    function setRouter(address _router) external onlyOwner {
        require(_router != address(0), "Router zero");
        dexRouter = IUniswapV2Router02(_router);
        WETH = dexRouter.WETH();
        emit RouterUpdated(_router, WETH);
    }

    function setMonthlyMintAmount(uint256 amount) external onlyOwner {
        monthlyMintAmount = amount;
    }

    function setDepositsEnabled(bool enabled) external onlyOwner {
        depositsEnabled = enabled;
    }

    function setRedemptionsEnabled(bool enabled) external onlyOwner {
        redemptionsEnabled = enabled;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Owner can withdraw contract MATIC (treasury management)
    function withdrawMATIC(uint256 amount, address payable to) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid to");
        require(address(this).balance >= amount, "Insufficient MATIC");
        (bool ok, ) = to.call{ value: amount }("");
        require(ok, "Send failed");
    }

    /// @notice Rescue ERC20 tokens accidentally sent to contract (not SADI)
    function rescueERC20(address token, uint256 amount, address to) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid to");
        require(token != address(this), "Cannot rescue SADI");
        IERC20(token).safeTransfer(to, amount);
    }

    // -------------------------
    // Tax exclusion management
    // -------------------------
    function setExcludeFromTax(address account, bool excluded) external onlyOwner {
        excludeFromTax[account] = excluded;
        emit ExcludeFromTaxUpdated(account, excluded);
    }

    // -------------------------
    // Audit metadata
    // -------------------------
    function reportAudit(string calldata url, string calldata ipfsHash) external onlyOwner {
        auditReportURL = url;
        auditReportHash = ipfsHash;
        auditTimestamp = block.timestamp;
        emit AuditReported(url, ipfsHash, block.timestamp);
    }

    // -------------------------
    // Fallback to accept MATIC
    // -------------------------
    receive() external payable {
        // accept MATIC sent directly to contract
    }
}



