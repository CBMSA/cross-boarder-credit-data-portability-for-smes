
pragma solidity ^0.8.20;

// Minimal interface for EntryPoint interactions used by wallets/paymasters
interface IEntryPoint {
    struct UserOperation {
        address sender;
        uint256 nonce;
        bytes initCode;
        bytes callData;
        uint256 callGasLimit;
        uint256 verificationGasLimit;
        uint256 preVerificationGas;
        uint256 maxFeePerGas;
        uint256 maxPriorityFeePerGas;
        bytes paymasterAndData;
        bytes signature;
    }

    function handleOps(UserOperation[] calldata ops, address payable beneficiary) external;
    function getSenderAddress(bytes calldata initCode) external returns (address);
}

// Minimal ERC-1271 interface (for smart contract signatures)
interface IERC1271 {
    function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4 magicValue);
}

// OpenZeppelin imports assumed - include in your project
// import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
// import "@openzeppelin/contracts/utils/Create2.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";

library ECDSA {
    function toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }
    function recover(bytes32 hash, bytes memory sig) internal pure returns (address) {
        if (sig.length != 65) return address(0);
        bytes32 r; bytes32 s; uint8 v;
        assembly { r := mload(add(sig, 32)) s := mload(add(sig, 64)) v := byte(0, mload(add(sig, 96))) }
        return ecrecover(hash, v, r, s);
    }
}

contract SadiSmartWallet is IERC1271 {
    using ECDSA for bytes32;
    address public owner;
    address public entryPoint; // trusted EntryPoint
    bool public initialized;

    event OwnerChanged(address indexed previousOwner, address indexed newOwner);
    event ExecSucceeded(address indexed target, uint256 value, bytes data);
    event ExecFailed(address indexed target, uint256 value, bytes data);

    modifier onlyEntryPoint() {
        require(msg.sender == entryPoint, "SW: only EntryPoint");
        _;
    }

    constructor() {
        // empty constructor for factory CREATE2
    }

    function init(address _owner, address _entryPoint) external {
        require(!initialized, "SW: initialized");
        require(_owner != address(0), "SW: zero owner");
        owner = _owner;
        entryPoint = _entryPoint;
        initialized = true;
    }

    // ERC-1271 support for contract signature verification
    function isValidSignature(bytes32 hash, bytes memory signature) external view override returns (bytes4) {
        address recovered = ECDSA.recover(ECDSA.toEthSignedMessageHash(hash), signature);
        if (recovered == owner) {
            return 0x1626ba7e; // magic value
        }
        return 0xffffffff;
    }

    // simple owner change with owner signature via EntryPoint only
    function changeOwner(address newOwner) external onlyEntryPoint {
        require(newOwner != address(0), "SW: zero");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    // Execute transaction called by EntryPoint
    function execute(address target, uint256 value, bytes calldata data) external onlyEntryPoint returns (bool success) {
        (success, ) = target.call{value: value}(data);
        if (success) emit ExecSucceeded(target, value, data);
        else emit ExecFailed(target, value, data);
        return success;
    }

    // Allow receive native tokens (MATIC)
    receive() external payable {}
}

contract SadiWalletFactory {
    address public walletImplementation; // minimal proxy target or template
    address public entryPoint;
    event WalletCreated(address indexed wallet, address indexed owner);

    constructor(address _entryPoint) {
        require(_entryPoint != address(0), "FW: entrypoint zero");
        entryPoint = _entryPoint;
        // deploy a template implementation
        walletImplementation = address(new SadiSmartWallet());
    }

    function computeAddress(bytes32 salt, address owner) public view returns (address predicted) {
        bytes memory initCode = abi.encodePacked(type(SadiSmartWallet).creationCode);
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(initCode)));
        predicted = address(uint160(uint256(hash)));
    }

    function createWallet(bytes32 salt, address owner) external returns (address wallet) {
        bytes memory initCode = type(SadiSmartWallet).creationCode;
        bytes32 finalSalt = keccak256(abi.encodePacked(salt, owner));
        assembly {
            wallet := create2(0, add(initCode, 0x20), mload(initCode), finalSalt)
            if iszero(extcodesize(wallet)) { revert(0, 0) }
        }
        SadiSmartWallet(payable(wallet)).init(owner, entryPoint);
        emit WalletCreated(wallet, owner);
    }
}

// Simplified Paymaster skeleton
contract SadiPaymaster {
    using SafeERC20 for IERC20;
    IERC20 public sadi;
    address public owner;
    IEntryPoint public entryPoint;

    event Deposited(address indexed from, uint256 amount);
    event PaidForGas(address indexed wallet, uint256 maticAmount, uint256 sadiAmount);

    modifier onlyOwner() {
        require(msg.sender == owner, "PM: only owner");
        _;
    }

    constructor(address _sadi, address _entryPoint) {
        require(_sadi != address(0) && _entryPoint != address(0), "PM: zero addr");
        sadi = IERC20(_sadi);
        entryPoint = IEntryPoint(_entryPoint);
        owner = msg.sender;
    }

    // Users or owner can deposit SADI to fund the paymaster
    function depositSadi(uint256 amount) external {
        sadi.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount);
    }

    // Simplified validate entrypoint hook - in real EntryPoint integration this has specific signature
    // Here we sketch: validatePaymasterUserOp and postOp handlers would be required by EntryPoint.

    // This contract would need logic to swap SADI -> MATIC or hold MATIC to pay gas.
    // For simplicity we assume owner monitors deposits and ensures there is MATIC for gas.

    // Owner can withdraw SADI
    function withdrawSadi(address to, uint256 amount) external onlyOwner {
        sadi.safeTransfer(to, amount);
    }
}



