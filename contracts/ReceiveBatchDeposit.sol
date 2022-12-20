// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: © 2022 Twinstake
pragma solidity 0.8.14;

import { Pausable } from "@openzeppelin/contracts/security/Pausable.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IDepositContract } from "./interfaces/IDepositContract.sol";

/**
 * @title Receive Batch Deposit Contract
 * @author Twinstake
 * @notice This contract allows you to Stake ETH in the Deposit Contract in Batches (of 32). The owner of this contract will preset
 the deposit data for the staker which contains all the necessary params for the deposit function call and then the staker will just 
 need to send the right amount of ETH to this contract for the saved number of validators later on.
 * Website: https://twinstake.io
 * Github repository: https://github.com/twinstake/batcher-smart-contract
 * @dev All function calls are currently implemented without side effects
 */
contract ReceiveBatchDeposit is Pausable, Ownable {
    /**
     * @dev Eth2 Deposit Contract address.
     */
    IDepositContract public depositContract;

    /// @dev Holds deposit data details for each staker
    struct DepositData {
        bytes[] pubkeys;
        bytes[] withdrawalCredentials;
        bytes[] signatures;
        bytes32[] depositDataRoots;
    }

    /// @dev staker to DepositData
    mapping(address => DepositData) private stakerToDeposit;

    /**
     * @dev Collateral size of one node.
     */
    uint256 public constant COLLATERAL = 32 ether;
    /**
     * @dev Limit to number of depositor to save at once
     */
    uint16 public constant DEPOSITOR_ADD_LIMIT = 100;
    /**
     * @dev Limit to depositing in one go
     */
    uint16 public constant DEPOSIT_LIMIT = 150;
    /**
     * @dev Length of pubkey
     */
    uint256 constant PUBKEY_LENGTH = 48;
    /**
     * @dev Length of Signature
     */
    uint256 constant SIGNATURE_LENGTH = 96;
    /**
     * @dev Length of Signature
     */
    uint256 constant CREDENTIALS_LENGTH = 32;

    /**
     * @dev Receive will be used to trigger the deposit() function for deposit.
     * @notice Prior to sending ETH directly to this contract deposit data must be added
     */
    receive() external payable {
        // Check if the msg.sender is whitelisted
        require(stakerToDeposit[msg.sender].pubkeys.length != 0, "Twinstake: User is not whitelisted");
        DepositData memory depositData = stakerToDeposit[msg.sender];
        deposit(
            depositData.pubkeys,
            depositData.withdrawalCredentials,
            depositData.signatures,
            depositData.depositDataRoots
        );
        delete stakerToDeposit[msg.sender];
    }

    /**
     * @dev Setting Eth2 Smart Contract address during construction.
     * @param _depositContractAddr ETH2.0 deposit contract
     */
    constructor(IDepositContract _depositContractAddr) {
        depositContract = _depositContractAddr;
        emit SetDepositContract(_depositContractAddr);
    }

    /**
     * @dev Util Func: Used for all comparison checks
     * @param _A Smaller integer
     * @param _B Greater integer
     */
    function comparisonUtil(uint256 _A, uint256 _B) private pure {
        require(_A < _B, "TwinstakeBatchDeposit: Failed comparison");
    }

    /**
     * @dev Returns struct containing deposit data details for a staker
     * @param _addr Address of the staker
     */
    function getStakerData(address _addr) external view returns (DepositData memory) {
        return stakerToDeposit[_addr];
    }

    /**
     * @notice Store deposit data for validators - only allowed for owner
     *
     * @param _forAddress            - Address for which deposit data is stored
     * @param pubkeys                - Array of BLS12-381 public keys.
     * @param withdrawalCredentials - Array of commitments to a public keys for withdrawals.
     * @param signatures             - Array of BLS12-381 signatures.
     * @param depositDataRoots     - Array of the SHA-256 hashes of the SSZ-encoded DepositData objects.
     */
    function addDepositData(
        address _forAddress,
        bytes[] calldata pubkeys,
        bytes[] calldata withdrawalCredentials,
        bytes[] calldata signatures,
        bytes32[] calldata depositDataRoots
    ) external onlyOwner {
        uint256 count = pubkeys.length;
        // Check count> 0
        comparisonUtil(0, count);

        // Check if all the array/list are of same length to ensure consistency
        require(
            withdrawalCredentials.length == count && signatures.length == count && depositDataRoots.length == count,
            "TwinstakeBatchDeposit: amount of parameters do no match"
        );
        // Limit the size to 100 validators
        comparisonUtil(count, DEPOSITOR_ADD_LIMIT + 1);

        DepositData storage depositData = stakerToDeposit[_forAddress];
        for (uint256 i = 0; i < count; ) {
            depositData.pubkeys.push(pubkeys[i]);
            depositData.withdrawalCredentials.push(withdrawalCredentials[i]);
            depositData.signatures.push(signatures[i]);
            depositData.depositDataRoots.push(depositDataRoots[i]);
            unchecked {
                i++;
            }
        }

        emit AddDepositData(_forAddress, count);
    }

    /**
     * @dev Edit a singular deposit data by index
     *
     * @param _forAddress            - Address for which deposit data is stored.
     * @param _pubkey                - A BLS12-381 public key.
     * @param _withdrawal_credential - A commitment to a public key for withdrawals.
     * @param _signature             - A BLS12-381 signature.
     * @param _deposit_data_root     - A SHA-256 hashes of the SSZ-encoded DepositData object.
     * @param _index                 - Array index which is to be edited
     */
    function editDepositData(
        address _forAddress,
        bytes calldata _pubkey,
        bytes calldata _withdrawal_credential,
        bytes calldata _signature,
        bytes32 _deposit_data_root,
        uint256 _index
    ) external onlyOwner {
        uint256 length = stakerToDeposit[_forAddress].pubkeys.length;
        // Assert: _index < length
        comparisonUtil(_index, length);
        // Check size of each param
        require(
            _pubkey.length == PUBKEY_LENGTH &&
                _withdrawal_credential.length == CREDENTIALS_LENGTH &&
                _signature.length == SIGNATURE_LENGTH,
            "Invalid parameter length"
        );

        DepositData storage depositData = stakerToDeposit[_forAddress];
        depositData.pubkeys[_index] = _pubkey;
        depositData.withdrawalCredentials[_index] = _withdrawal_credential;
        depositData.signatures[_index] = _signature;
        depositData.depositDataRoots[_index] = _deposit_data_root;
        emit EditDepositData(_forAddress, _index);
    }

    /**
     * @dev Deletes/pops last 'n' entries from the deposit data struct
     * @param _forAddress Address for which deposit data is associated
     * @param _count Number of entries to delete/pop
     */
    function deleteLastnDepositEntries(address _forAddress, uint256 _count) external onlyOwner {
        uint256 length = stakerToDeposit[_forAddress].pubkeys.length;
        // Assert: _count < length & _count > 0
        comparisonUtil(_count, length + 1);
        comparisonUtil(0, _count);

        DepositData storage depositData = stakerToDeposit[_forAddress];
        for (uint256 i = 0; i < _count; ) {
            depositData.pubkeys.pop();
            depositData.withdrawalCredentials.pop();
            depositData.signatures.pop();
            depositData.depositDataRoots.pop();
            unchecked {
                i++;
            }
        }

        emit DeleteDepositData(_forAddress, _count);
    }

    /**
     * @dev Deletes/pops all entries from the deposit data struct
     * @param _forAddress Address for which deposit data is associated
     */
    function deleteAllEntries(address _forAddress) external onlyOwner {
        uint256 _count = stakerToDeposit[_forAddress].pubkeys.length;
        delete stakerToDeposit[_forAddress];

        emit DeleteDepositData(_forAddress, _count);
    }

    /**
     * @notice Deposits the staking ETH for specified validators and other inputs. Makes call to origin deposit contract
     * @dev Function that allows to deposit up to 150 nodes at once.
     */
    function deposit(
        bytes[] memory pubkeys,
        bytes[] memory withdrawalCredentials,
        bytes[] memory signatures,
        bytes32[] memory depositDataRoots
    ) internal whenNotPaused {
        uint256 nodesAmount = pubkeys.length;

        // Check if sent ETH is correct i.e.,  nodesAmount (= # of validators) * 32
        require(
            msg.value == COLLATERAL * nodesAmount,
            "TwinstakeBatchDeposit: the amount of ETH does not match the amount of nodes"
        );

        // check validator limit
        comparisonUtil(nodesAmount, DEPOSIT_LIMIT + 1);

        for (uint256 i = 0; i < nodesAmount; ) {
            depositContract.deposit{ value: COLLATERAL }(
                pubkeys[i],
                withdrawalCredentials[i],
                signatures[i],
                depositDataRoots[i]
            );
            unchecked {
                i++;
            }
        }

        emit DepositEvent(msg.sender, nodesAmount);
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    event DepositEvent(address indexed from, uint256 nodesAmount);
    event AddDepositData(address indexed user, uint256 count);
    event EditDepositData(address indexed user, uint256 index);
    event DeleteDepositData(address indexed user, uint256 count);
    event SetDepositContract(IDepositContract EthDepositContract);
}
