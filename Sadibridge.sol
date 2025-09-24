// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Context.sol";

contract SadiBridge is Context, ERC20, AccessControl, Pausable, ReentrancyGuard {
    using SafeMath for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant RATE_MANAGER = keccak256("RATE_MANAGER");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant DEFAULT_ADMIN_ROLE = AccessControl.DEFAULT_ADMIN_ROLE; // Fixed: Explicit import

    uint8 public immutable override decimals = 18;
    string private constant _RATE_PAIR_SADI_ETH = "SADI/ETH";

    mapping(address => uint256) public escrow;
    mapping(string => uint256) public ratePairs;

    // Events
    event OnRampRequested(address indexed user, uint256 amount, string fiatRef);
    event OnRampFinalized(address indexed to, uint256 amount, string fiatRef);
    event OffRampRequested(address indexed user, uint256 amount, string fiatRef);
    event OffRampFinalized(address indexed user, uint256 amount, string fiatRef);
    event OffRampCancelled(address indexed user, uint256 amount, string fiatRef);
    event SwapSadiForEth(address indexed user, uint256 sadiAmount, uint256 ethAmount);
    event SwapEthForSadi(address indexed user, uint256 ethAmount, uint256 sadiAmount);
    event RateUpdated(string pair, uint256 rate);
    event EthWithdrawn(address indexed to, uint256 amount);
    event Erc20Rescued(address indexed token, address indexed to, uint256 amount);

    constructor(string memory name_, string memory symbol_, address admin, uint256 initialSupply)
        ERC20(name_, symbol_)
    {
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(MINTER_ROLE, admin);
        _setupRole(PAUSER_ROLE, admin);
        _setupRole(RATE_MANAGER, admin);
        _setupRole(OPERATOR_ROLE, admin);

        if (initialSupply > 0) {
            _mint(admin, initialSupply);
        }
    }

    // --- Pause/Unpause ---
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // --- Mint (on-ramp finalization) ---
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        _mint(to, amount);
    }

    // --- On-Ramp Flow ---
    function requestOnRamp(uint256 amount, string calldata fiatRef) external whenNotPaused {
        emit OnRampRequested(_msgSender(), amount, fiatRef);
    }

    function finalizeOnRamp(address to, uint256 amount, string calldata fiatRef)
        external
        onlyRole(OPERATOR_ROLE)
        whenNotPaused
    {
        _mint(to, amount);
        emit OnRampFinalized(to, amount, fiatRef);
    }

    // --- Off-Ramp Flow ---
    function requestOffRamp(uint256 amount, string calldata fiatRef) external whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        require(balanceOf(_msgSender()) >= amount, "Insufficient balance");

        _transfer(_msgSender(), address(this), amount);
        escrow[_msgSender()] += amount;
        emit OffRampRequested(_msgSender(), amount, fiatRef);
    }

    function finalizeOffRamp(address user, uint256 amount, string calldata fiatRef)
        external
        onlyRole(OPERATOR_ROLE)
        whenNotPaused
    {
        require(escrow[user] >= amount, "Insufficient escrow");
        escrow[user] -= amount;
        _burn(address(this), amount);
        emit OffRampFinalized(user, amount, fiatRef);
    }

    function cancelOffRamp(address user, uint256 amount, string calldata fiatRef)
        external
        onlyRole(OPERATOR_ROLE)
        whenNotPaused
    {
        require(escrow[user] >= amount, "Insufficient escrow");
        escrow[user] -= amount;
        _transfer(address(this), user, amount);
        emit OffRampCancelled(user, amount, fiatRef);
    }

    // --- Swap Functions ---
    function setRate(string calldata pair, uint256 rate) external onlyRole(RATE_MANAGER) {
        require(rate > 0, "Rate must be > 0");
        ratePairs[pair] = rate;
        emit RateUpdated(pair, rate);
    }

    function swapSadiForEth(uint256 sadiAmount, uint256 minEthOut)
        external
        whenNotPaused
        nonReentrant
    {
        require(sadiAmount > 0, "Amount must be > 0");
        uint256 rate = ratePairs[_RATE_PAIR_SADI_ETH];
        require(rate > 0, "Rate not set");

        uint256 ethOut = (sadiAmount * rate) / 1e18;
        require(ethOut >= minEthOut, "Slippage");

        _transfer(_msgSender(), address(this), sadiAmount);
        _burn(address(this), sadiAmount);

        require(address(this).balance >= ethOut, "Insufficient ETH");
        (bool success, ) = _msgSender().call{value: ethOut}("");
        require(success, "ETH transfer failed");

        emit SwapSadiForEth(_msgSender(), sadiAmount, ethOut);
    }

    function swapEthForSadi(uint256 minSadiOut)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        uint256 rate = ratePairs[_RATE_PAIR_SADI_ETH];
        require(rate > 0, "Rate not set");
        require(msg.value > 0, "ETH amount must be > 0");

        uint256 sadiOut = (msg.value * 1e18) / rate;
        require(sadiOut >= minSadiOut, "Slippage");

        _mint(_msgSender(), sadiOut);
        emit SwapEthForSadi(_msgSender(), msg.value, sadiOut);
    }

    // --- Admin Functions ---
    function withdrawEth(address payable to, uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        nonReentrant
    {
        require(to != address(0), "Zero address");
        require(address(this).balance >= amount, "Insufficient balance");

        to.transfer(amount);
        emit EthWithdrawn(to, amount);
    }

    function rescueERC20(address token, address to, uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(token != address(0), "Zero token address");
        require(to != address(0), "Zero recipient address");

        IERC20(token).transfer(to, amount);
        emit Erc20Rescued(token, to, amount);
    }

    // --- Overrides ---
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        override
        whenNotPaused
    {
        super._beforeTokenTransfer(from, to, amount);
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // --- Fallback ---
    receive() external payable {}
    fallback() external payable {}
}

// Helper interface for rescueERC20
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}

