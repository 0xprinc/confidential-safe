pragma solidity 0.8.20;

import {IMailbox} from "@hyperlane-xyz/core/contracts/interfaces/IMailbox.sol";
import {IInterchainSecurityModule} from "@hyperlane-xyz/core/contracts/interfaces/IInterchainSecurityModule.sol";

contract TargetContract {
    address public mailbox = 0xfFAEF09B3cd11D9b20d1a19bECca54EEC2884766;
    address public lastSender;
    bytes public lastData;
    uint32 public domainId = 9090;
    address public destinationContract;
    event ReceivedMessage(uint32, bytes32, uint256, string);

    uint256 public counter;
    bytes public sentData;

    address public token;

    struct depositStruct {
        address to;
        bytes cipherAmount;
    }

    
    function setHook(address _hook) public {
        // hook = IPostDispatchHook(_hook);
    }

    function initialize(address _destinationContract) public {
        destinationContract = _destinationContract;
    }

    // function setInterchainSecurityModule(address _module) public {
    //     interchainSecurityModule = IInterchainSecurityModule(_module);
    // }

    // Modifier so that only mailbox can call particular functions
    modifier onlyMailbox() {
        require(
            msg.sender == mailbox,
            "Only mailbox can call this function !!!"
        );
        _;
    }

    // handle function which is called by the mailbox to bridge votes from other chains
    function handle(
        uint32 _origin,
        bytes32 _sender,
        bytes calldata _data
    ) external payable {
        emit ReceivedMessage(_origin, _sender, msg.value, string(_data));
        lastSender = bytes32ToAddress(_sender);
        lastData = _data;
        (address to, uint256 amount) = abi.decode(_data, (address, uint256));
        token.call(abi.encodeWithSignature("transfer(address,uint256)", to, amount));
    }

    // alignment preserving cast
    function bytes32ToAddress(bytes32 _buf) internal pure returns (address) {
        return address(uint160(uint256(_buf)));
    }
    function sendMessage(bytes memory data) payable public {
        uint256 quote = IMailbox(mailbox).quoteDispatch(domainId,addressToBytes32(destinationContract),data);
        IMailbox(mailbox).dispatch{value: quote}(domainId, addressToBytes32(destinationContract), data);
    }

    // converts address to bytes32
    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    function claimTokens() public {
        bytes memory data = abi.encode(keccak256(abi.encode(msg.sender)), uint8(2), msg.sender);
        sendMessage(data);
    }

    function distribute(depositStruct[] memory data) public {
        for (uint256 i = 0; i < data.length; ++i) {
            _distribute(data[i]);
        }
    }

    function wrap(uint256 amount) public {
        token.call(abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, address(this), amount));
        bytes memory data = abi.encode(keccak256(abi.encode(msg.sender)), uint8(0), msg.sender, amount);
        sendMessage(data);
    }

    function _distribute(depositStruct memory _depositStruct) public {
        bytes32 amounthash = keccak256(_depositStruct.cipherAmount);
        bytes memory data = abi.encode(amounthash, uint8(1), msg.sender, _depositStruct.to);
        sendMessage(data);
    }
}