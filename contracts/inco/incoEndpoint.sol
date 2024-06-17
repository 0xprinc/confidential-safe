pragma solidity 0.8.20;

import {IMailbox} from "@hyperlane-xyz/core/contracts/interfaces/IMailbox.sol";

import {EncryptedWrapperERC20} from "./EncryptedWrapperERC20.sol";
import {IInterchainSecurityModule} from "@hyperlane-xyz/core/contracts/interfaces/IInterchainSecurityModule.sol";

import "fhevm/lib/TFHE.sol";

contract IncoContract is EncryptedWrapperERC20{
    // address public mailbox = 0xb2EF9249C4fDB9Eb4c105cE0C3AA47b33126A224;
    address public mailbox = 0x2f990fdD8318309DB1637aAbA145caA593616DB1;
    address public lastSender;
    bytes public lastData;
    uint public received;
    uint32 public domainId = 84532;

    address public destinationContract;
    event ReceivedMessage(uint32, bytes32, uint256, string);

    mapping(uint256 proposalId => mapping(uint8 choice => euint32 votePower)) private votePower;

    mapping(uint256 => bool) public isExecuted;

    bytes public latestProposalData;

    function getIsExecuted(uint256 proposalId) public view returns (bool) {
        return isExecuted[proposalId];
    }


    // IPostDispatchHook public hook;
    IInterchainSecurityModule public interchainSecurityModule = IInterchainSecurityModule(0xaA05bAd55c633B6D5F23e5050BeaCF7a4D7bBA15);


    
    function setHook(address _hook) public {
        // hook = IPostDispatchHook(_hook);
    }

    function initialize(address _destinationContract) public {
        destinationContract = _destinationContract;
    }

     function setInterchainSecurityModule(address _module) public {
         interchainSecurityModule = IInterchainSecurityModule(_module);
    }

    // Modifier so that only mailbox can call particular functions
    modifier onlyMailbox() {
        require(
            msg.sender == mailbox,
            "Only mailbox can call this function !!!"
        );
        _;
    }

    function handle(                    // message
        uint32 _origin,
        bytes32 _sender,
        bytes calldata _data
    ) external payable {
        (, uint8 selector) = abi.decode(_data, (bytes32, uint8));
        if (selector == 1) {
            (,, address from) = abi.decode(_data, (bytes32, uint8, address));
            euint32 eclaimable = burnAll(from);
            uint32 claimable = TFHE.decrypt(eclaimable);
            sendMessage(abi.encode(from, claimable));
        }
        emit ReceivedMessage(_origin, _sender, msg.value, string(_data));
    }

    // alignment preserving cast
    function bytes32ToAddress(bytes32 _buf) internal pure returns (address) {
        return address(uint160(uint256(_buf)));
    }

    function sendMessage(bytes memory data) payable public {
        // uint256 quote = IMailbox(mailbox).quoteDispatch(domainId, addressToBytes32(destinationContract), abi.encode(body));
        IMailbox(mailbox).dispatch(domainId, addressToBytes32(destinationContract), data);
    }

    // converts address to bytes32
    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    function getVotePower(uint256 proposalId, uint8 choice, bytes32 publicKey) public view returns (bytes memory) {             // @inco
        return TFHE.reencrypt(votePower[proposalId][choice], publicKey, 0);
    }


    function handleWithCiphertext( uint32 _origin,          // message + data
        bytes32 _sender,
        bytes memory _message) external{
            (bytes memory message, bytes memory data) = abi.decode(_message,(bytes , bytes));
            (, uint8 selector) = abi.decode(message, (bytes32, uint8));
            if (selector == 0){
                (, , address to) = abi.decode(message, (bytes32, uint8, address));
                mint(data, to);
            }
        }
}