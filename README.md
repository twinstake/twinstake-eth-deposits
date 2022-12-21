# Twinstake Batch Deposit Contract

This contract can be used to make multiple deposits to the Ethereum staking deposit [contract](https://etherscan.io/address/0x00000000219ab540356cbb839cbe05303d7705fa) in one transaction.

## Requirements
The product requirements for this contract are as follows.

1. As an institutional asset manager:
    1. I want to stake a large amount of ETH. Breaking this amount into individual 32 ETH transactions will be manual, tedious and error-prone.
    1. I want certainty before I send any ETH that the validators I am funding are “mine”, meaning the private key for the withdrawal and fee recipient addresses are held at my custodian.
1. As an institutional custodian, I may not necessarily support transactions that are smart contract function calls. Setting the hex data manually in the wallet app may be a problem for me. Straight transfers of ETH to a smart contract address are fine, however.

## Design
The contract is intended to be used as follows.

- Owner deploys the contract. Note that the owner of the contract may be the validator operator, but this is not required.
- Owner sets a whitelist of addresses that will be allowed to deposit to the contract.
- Owner agrees the deposit details with the delegator (institutional asset manager) and sets these on the contract.
- Delegator's custodian then sends a multiple of 32 ETH to the contract as a normal ETH transfer. No smart contract function execution is required here.
- The gas limit on this transaction will need to be high.

## Install
- Prerequisites:
    - [Node](https://nodejs.org/en/)
    - [Yarn](https://yarnpkg.com/)
- Installing packages:
```
git clone https://github.com/twinstake/batcher-smart-contract
cd batcher-smart-contract
yarn
```

## Usage

To run tests:

```
yarn hardhat test
```

## Maintainers

- [@sameer-nethermind](https://github.com/sameer-nethermind)
- [@andreitoma8](https://github.com/andreitoma8)

## Audit

This codebase has been internally reviewed by the Nethermind audit team and all the found issues were addressed. The code is still awaiting an external audit and is not yet recommended for production use.

## License

GPL-3.0
