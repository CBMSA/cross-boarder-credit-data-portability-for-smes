// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * SadiBridge.sol
 * - ERC20 SADI token
 * - AccessControl roles for admin functions
 * - onRamp / offRamp request flow (emits events; escrow for offRamp)
 * - simple owner-managed FX rates for swaps
 *
 * SECURITY NOTE: For production use Chainlink or other secure oracles for price feeds.
 * Use multisig for admin roles and audit contract before mainnet deployment.
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

contract SadiBridge is Context, ERC20, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");   // can mint tokens (onRamp finalization)
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");   // can pause/unpause
    bytes32 public constant RATE_MANAGER = keccak256("RATE_MANAGER"); // set FX rates
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE"); // can finalize on/off ramps

    // Off-ramp escrow mapping: user -> amount locked awaiting fiat payout
    mapping(address => uint256) public escrow;

    // FX exchange rates stored as fixed-point with 18 decimals:
    // ratePairs["SADI/ETH"] = how many wei of ETH per smallest SADI unit * 1e18
    mapping(string => uint256) public ratePairs;

    event OnRampRequested(address indexed user, uint256 amount, string fiatRef);
    event OnRampFinalized(address indexed to, uint256 amount, string fiatRef);
    event OffRampRequested(address indexed user, uint256 amount, string fiatRef);
    event OffRampFinalized(address indexed user, uint256 amount, string fiatRef);
    event SwapSadiForEth(address indexed user, uint256 sadiAmount, uint256 ethAmount);
    event SwapEthForSadi(address indexed user, uint256 ethAmount, uint256 sadiAmount);
    event RateUpdated(string pair, uint256 rate);

    uint8 private constant _decimals = 18;

    constructor(string memory name_, string memory symbol_, address admin, uint256 initialSupply) ERC20(name_, symbol_) {
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(MINTER_ROLE, admin);
        _setupRole(PAUSER_ROLE, admin);
        _setupRole(RATE_MANAGER, admin);
        _setupRole(OPERATOR_ROLE, admin);

        if (initialSupply > 0) {
            _mint(admin, initialSupply);
        }
    }

    // decimals override
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    // Pause / unpause
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // Mint (used by operator after fiat on-ramp verified)
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        _mint(to, amount);
        // Optionally emit OnRampFinalized here if used as finalize function
    }

    // --- On-ramp flow: user requests on-ramp (fiat->SADI)
    // The frontend / backend will call this to create a request which operators watch off-chain.
    function requestOnRamp(uint256 amount, string calldata fiatRef) external whenNotPaused {
        // User is requesting SADI to be minted to their address after KYC/fiat settle
        emit OnRampRequested(_msgSender(), amount, fiatRef);
    }

    // Operator finalizes by minting
    function finalizeOnRamp(address to, uint256 amount, string calldata fiatRef) external onlyRole(OPERATOR_ROLE) whenNotPaused {
        _mint(to, amount);
        emit OnRampFinalized(to, amount, fiatRef);
    }

    // --- Off-ramp flow: user requests off-ramp (SADI -> fiat)
    // User must approve the contract to move tokens, then call requestOffRamp.
    // Tokens are moved to escrow inside contract.
    function requestOffRamp(uint256 amount, string calldata fiatRef) external whenNotPaused {
        require(balanceOf(_msgSender()) >= amount, "insufficient balance");
        // transfer tokens into contract as escrow
        _transfer(_msgSender(), address(this), amount);
        escrow[_msgSender()] += amount;
        emit OffRampRequested(_msgSender(), amount, fiatRef);
    }

    // Operator finalizes off-ramp after fiat sent to user: burns escrowed tokens
    function finalizeOffRamp(address user, uint256 amount, string calldata fiatRef) external onlyRole(OPERATOR_ROLE) whenNotPaused {
        require(escrow[user] >= amount, "not enough escrow");
        escrow[user] -= amount;
        _burn(address(this), amount);
        emit OffRampFinalized(user, amount, fiatRef);
    }

    // Operator can cancel off-ramp and return tokens to user
    function cancelOffRamp(address user, uint256 amount, string calldata fiatRef) external onlyRole(OPERATOR_ROLE) whenNotPaused {
        require(escrow[user] >= amount, "not enough escrow");
        escrow[user] -= amount;
        _transfer(address(this), user, amount);
        // emit an event — reuse OffRampFinalized with zero? better to add Cancel:
        emit OffRampFinalized(user, 0, fiatRef); // indicates cancellation if amount == 0 (optional)
    }

    // --- Swap (SADI <-> ETH) using owner-managed ratePairs
    // All rates are fixed-point with 18 decimals: amountEth = amountSadi * rate / 1e18
    // ratePairs["SADI/ETH"] = how many ETH per one SADI token (18 decimals)
    // Example: if 1 SADI = 0.001 ETH, rate = 0.001 * 1e18 = 1e15
    function setRate(string calldata pair, uint256 rate) external onlyRole(RATE_MANAGER) {
        ratePairs[pair] = rate;
        emit RateUpdated(pair, rate);
    }

    // Swap user's SADI for ETH (the contract must hold ETH liquidity)
    // user must approve contract to transfer SADI
    function swapSadiForEth(uint256 sadiAmount, uint256 minEthOut) external whenNotPaused {
        require(sadiAmount > 0, "zero amount");
        uint256 rate = ratePairs["SADI/ETH"];
        require(rate > 0, "rate not set");
        // compute ETH out with 18 decimals: ethOut = sadiAmount * rate / 1e18
        uint256 ethOut = (sadiAmount * rate) / (10**18);
        require(ethOut >= minEthOut, "slippage");
        // move SADI from user into contract and burn or keep as protocol reserve
        _transfer(_msgSender(), address(this), sadiAmount);
        // Here we choose to burn SADI to reduce supply on swap out, but you may prefer to keep in reserve
        _burn(address(this), sadiAmount);
        // pay ETH to user
        require(address(this).balance >= ethOut, "insufficient ETH liquidity");
        (bool ok, ) = _msgSender().call{value: ethOut}("");
        require(ok, "ETH transfer failed");
        emit SwapSadiForEth(_msgSender(), sadiAmount, ethOut);
    }

    // Swap ETH -> SADI. Send ETH with transaction; contract mints SADI to user using rate
    function swapEthForSadi(uint256 minSadiOut) external payable whenNotPaused {
        uint256 rate = ratePairs["SADI/ETH"];
        require(rate > 0, "rate not set");
        uint256 ethAmount = msg.value;
        require(ethAmount > 0, "no ETH sent");
        // sadiOut = ethAmount * 1e18 / rate (reverse)
        // sadiOut = ethAmount * (1e18) / rate
        uint256 sadiOut = (ethAmount * (10**18)) / rate;
        require(sadiOut >= minSadiOut, "slippage");
        // mint SADI to user
        _mint(_msgSender(), sadiOut);
        emit SwapEthForSadi(_msgSender(), ethAmount, sadiOut);
    }

    // Allow contract to receive ETH for liquidity, only admin or anyone can send via payable
    receive() external payable {}
    fallback() external payable {}

    // emergency withdraw ETH (admin only) to recover funds (use multisig in production)
    function withdrawEth(address payable to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(to != address(0), "zero address");
        require(address(this).balance >= amount, "insufficient balance");
        to.transfer(amount);
    }

    // Allow admin to withdraw ERC20 tokens accidentally sent
    function rescueERC20(address token, address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(to != address(0), "zero address");
        IERC20(token).transfer(to, amount);
    }

    // _beforeTokenTransfer override for pausability
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
}
