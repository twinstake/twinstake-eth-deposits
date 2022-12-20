import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import mockData from "../depositData.json";
import multiMockData from "../multiDepositData.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

let depositContract: Contract,
  receiveDepositContract: Contract,
  deployer: SignerWithAddress,
  account1: SignerWithAddress,
  account2: SignerWithAddress,
  account3: SignerWithAddress;

describe("ReceiveBatchDeposit: Store Deposit Data Function", function () {
  beforeEach(async function () {
    [deployer, account1, account2, account3] = await ethers.getSigners();

    // deploy deposit contract
    const DepositContract = await hre.ethers.getContractFactory("DepositContract");
    depositContract = await DepositContract.deploy();
    // deploy preloaded batch deposit contract
    const ReceiveDepositContract = await hre.ethers.getContractFactory("ReceiveBatchDeposit");
    receiveDepositContract = await ReceiveDepositContract.deploy(depositContract.address);
  });

  it("should fail when owner is not the caller", async function () {
    await expect(
      receiveDepositContract
        .connect(account1)
        .addDepositData(
          account1.address,
          mockData.pubkey,
          mockData.withdrawal_credentials,
          mockData.signatures,
          mockData.deposit_data_roots,
        ),
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should store the data correctly", async function () {
    await receiveDepositContract
      .connect(deployer)
      .addDepositData(
        account1.address,
        mockData.pubkey,
        mockData.withdrawal_credentials,
        mockData.signatures,
        mockData.deposit_data_roots,
      );

    let data: any = await receiveDepositContract.getStakerData(account1.address);
    for (let i = 0; i < data.pubkeys.lenght; i++) {
      expect(data.pubkeys[i]).to.eq(mockData.pubkey[i]);
      expect(data.withdrawalCredentials[i]).to.eq(mockData.withdrawal_credentials[i]);
      expect(data.signatures[i]).to.eq(mockData.signatures[i]);
      expect(data.depositDataRoots[i]).to.eq(mockData.deposit_data_roots[i]);
    }
  });

  it("should emit the correct event", async function () {
    await expect(
      receiveDepositContract
        .connect(deployer)
        .addDepositData(
          account1.address,
          mockData.pubkey,
          mockData.withdrawal_credentials,
          mockData.signatures,
          mockData.deposit_data_roots,
        ),
    )
      .to.emit(receiveDepositContract, "AddDepositData")
      .withArgs(account1.address, 1);
  });

  it("should fail for empty data storage", async function () {
    await expect(
      receiveDepositContract.connect(deployer).addDepositData(account2.address, [], [], [], []),
    ).to.be.revertedWith("TwinStakeBatchDeposit: Failed comparison");
  });

  it("should save 100 validators at once", async function () {
    let pubkey = [];
    let withdrawal_credentials = [];
    let signature = [];
    let deposit_data_root = [];

    for (let i = 0; i < 100; i++) {
      pubkey.push(mockData.pubkey[0]);
      withdrawal_credentials.push(mockData.withdrawal_credentials[0]);
      signature.push(mockData.signatures[0]);
      deposit_data_root.push(mockData.deposit_data_roots[0]);
    }

    await expect(
      receiveDepositContract
        .connect(deployer)
        .addDepositData(account1.address, pubkey, withdrawal_credentials, signature, deposit_data_root, {
          gasLimit: 29999999,
        }),
    ).to.not.be.reverted;

    let arr: any = await receiveDepositContract.getStakerData(account1.address);

    expect(arr.pubkeys.length).to.eq(100);
    expect(arr.withdrawalCredentials.length).to.eq(100);
    expect(arr.signatures.length).to.eq(100);
    expect(arr.depositDataRoots.length).to.eq(100);
  });

  it("should save multiple deposit data", async () => {
    await expect(
      receiveDepositContract
        .connect(deployer)
        .addDepositData(
          account2.address,
          mockData.pubkey,
          mockData.withdrawal_credentials,
          mockData.signatures,
          mockData.deposit_data_roots,
        ),
    ).to.not.be.reverted;

    await expect(
      receiveDepositContract
        .connect(deployer)
        .addDepositData(
          account2.address,
          mockData.pubkey,
          mockData.withdrawal_credentials,
          mockData.signatures,
          mockData.deposit_data_roots,
        ),
    ).to.not.be.reverted;

    let arr: any = await receiveDepositContract.getStakerData(account2.address);

    expect(arr.pubkeys.length).to.eq(2);
    expect(arr.withdrawalCredentials.length).to.eq(2);
    expect(arr.signatures.length).to.eq(2);
    expect(arr.depositDataRoots.length).to.eq(2);
  });
});

describe("ReceiveBatchDeposit: Edit Function", function () {
  beforeEach(async function () {
    [deployer, account1, account2] = await ethers.getSigners();

    // deploy deposit contract
    const DepositContract = await hre.ethers.getContractFactory("DepositContract");
    depositContract = await DepositContract.deploy();
    // deploy preloaded batch deposit contract
    const ReceiveBatchDeposit = await hre.ethers.getContractFactory("ReceiveBatchDeposit");
    receiveDepositContract = await ReceiveBatchDeposit.deploy(depositContract.address);
    await receiveDepositContract
      .connect(deployer)
      .addDepositData(
        account1.address,
        mockData.pubkey,
        mockData.withdrawal_credentials,
        mockData.signatures,
        mockData.deposit_data_roots,
      );
  });

  it("should allow only owner to edit", async () => {
    await expect(
      receiveDepositContract
        .connect(account1)
        .editDepositData(
          account1.address,
          mockData.pubkey[0],
          mockData.withdrawal_credentials[0],
          mockData.signatures[0],
          mockData.deposit_data_roots[0],
          0,
        ),
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should give index out of range error", async () => {
    await expect(
      receiveDepositContract
        .connect(deployer)
        .editDepositData(
          account1.address,
          mockData.pubkey[0],
          mockData.withdrawal_credentials[0],
          mockData.signatures[0],
          mockData.deposit_data_roots[0],
          1,
        ),
    ).to.be.revertedWith("TwinStakeBatchDeposit: Failed comparison");
  });

  it("should edit the details successfully", async () => {
    let data: any = await receiveDepositContract.getStakerData(account1.address);

    expect(data.pubkeys[0]).to.eq(mockData.pubkey[0]);
    expect(data.withdrawalCredentials[0]).to.eq(mockData.withdrawal_credentials[0]);
    expect(data.signatures[0]).to.eq(mockData.signatures[0]);
    expect(data.depositDataRoots[0]).to.eq(mockData.deposit_data_roots[0]);

    // changed data
    const changedPubkey =
      "0xac90050d2fa1e874979f7a87d0a1fe0d5c35e68977a6a7ab4718dd1c6ca4bae5835c3cd0f5e1e8e00bbcd7aa9d5c08c8";
    await receiveDepositContract
      .connect(deployer)
      .editDepositData(
        account1.address,
        changedPubkey,
        mockData.withdrawal_credentials[0],
        mockData.signatures[0],
        mockData.deposit_data_roots[0],
        0,
      );

    let newData: any = await receiveDepositContract.getStakerData(account1.address);
    expect(data.pubkeys[0]).to.not.eq(newData.pubkeys[0]);
    expect(newData.pubkeys[0]).to.eq(changedPubkey);
  });

  it("should emit correct event", async () => {
    let data: any = await receiveDepositContract.getStakerData(account1.address);

    expect(data.pubkeys[0]).to.eq(mockData.pubkey[0]);
    expect(data.withdrawalCredentials[0]).to.eq(mockData.withdrawal_credentials[0]);
    expect(data.signatures[0]).to.eq(mockData.signatures[0]);
    expect(data.depositDataRoots[0]).to.eq(mockData.deposit_data_roots[0]);

    // changed data
    const changedPubkey =
      "0xac90050d2fa1e874979f7a87d0a1fe0d5c35e68977a6a7ab4718dd1c6ca4bae5835c3cd0f5e1e8e00bbcd7aa9d5c08c8";
    await expect(
      receiveDepositContract
        .connect(deployer)
        .editDepositData(
          account1.address,
          changedPubkey,
          mockData.withdrawal_credentials[0],
          mockData.signatures[0],
          mockData.deposit_data_roots[0],
          0,
        ),
    )
      .to.emit(receiveDepositContract, "EditDepositData")
      .withArgs(account1.address, 0);
  });
});

describe("ReceiveBatchDeposit: Delete Deposit Data Functions", function () {
  beforeEach(async function () {
    [deployer, account1, account2] = await ethers.getSigners();

    // deploy deposit contract
    const DepositContract = await hre.ethers.getContractFactory("DepositContract");
    depositContract = await DepositContract.deploy();
    // deploy preloaded batch deposit contract
    const ReceiveDepositContract = await hre.ethers.getContractFactory("ReceiveBatchDeposit");
    receiveDepositContract = await ReceiveDepositContract.deploy(depositContract.address);
  });

  it("should allow only owner to delete data", async () => {
    let pubkey = [];
    let withdrawal_credentials = [];
    let signature = [];
    let deposit_data_root = [];
    pubkey.push(mockData.pubkey[0]);
    withdrawal_credentials.push(mockData.withdrawal_credentials[0]);
    signature.push(mockData.signatures[0]);
    deposit_data_root.push(mockData.deposit_data_roots[0]);

    await expect(
      await receiveDepositContract
        .connect(deployer)
        .addDepositData(account2.address, pubkey, withdrawal_credentials, signature, deposit_data_root, {
          gasLimit: 29999999,
        }),
    ).to.not.be.reverted;

    await expect(
      receiveDepositContract.connect(account1).deleteLastnDepositEntries(account2.address, 1),
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should fail if out of bound deletion", async () => {
    await expect(
      receiveDepositContract
        .connect(deployer)
        .addDepositData(
          account2.address,
          mockData.pubkey,
          mockData.withdrawal_credentials,
          mockData.signatures,
          mockData.deposit_data_roots,
          { gasLimit: 29999999 },
        ),
    ).to.not.be.reverted;

    let data: any = await receiveDepositContract.getStakerData(account2.address);

    // delete more than present
    await expect(
      receiveDepositContract.deleteLastnDepositEntries(account2.address, data.pubkeys.length + 1),
    ).to.be.revertedWith("TwinStakeBatchDeposit: Failed comparison");

    // delete 0 entries
    await expect(receiveDepositContract.deleteLastnDepositEntries(account2.address, 0)).to.be.revertedWith(
      "TwinStakeBatchDeposit: Failed comparison",
    );
  });

  it("should delete last 99 deposits and leave 1", async () => {
    let pubkey = [];
    let withdrawal_credentials = [];
    let signature = [];
    let deposit_data_root = [];

    for (let i = 0; i < 100; i++) {
      pubkey.push(mockData.pubkey[0]);
      withdrawal_credentials.push(mockData.withdrawal_credentials[0]);
      signature.push(mockData.signatures[0]);
      deposit_data_root.push(mockData.deposit_data_roots[0]);
    }

    await expect(
      receiveDepositContract
        .connect(deployer)
        .addDepositData(account1.address, pubkey, withdrawal_credentials, signature, deposit_data_root, {
          gasLimit: 29999999,
        }),
    ).to.not.be.reverted;

    await receiveDepositContract.deleteLastnDepositEntries(account1.address, 99);

    let data: any = await receiveDepositContract.getStakerData(account1.address);

    expect(data.pubkeys.length).to.eq(1);
    expect(data.signatures.length).to.eq(1);
    expect(data.withdrawalCredentials.length).to.eq(1);
    expect(data.depositDataRoots.length).to.eq(1);
  });

  it("should emit correct event", async () => {
    await expect(
      receiveDepositContract
        .connect(deployer)
        .addDepositData(
          account2.address,
          mockData.pubkey,
          mockData.withdrawal_credentials,
          mockData.signatures,
          mockData.deposit_data_roots,
          { gasLimit: 29999999 },
        ),
    ).to.not.be.reverted;

    let data: any = await receiveDepositContract.getStakerData(account2.address);

    // delete more than present
    await expect(receiveDepositContract.deleteLastnDepositEntries(account2.address, data.pubkeys.length))
      .to.emit(receiveDepositContract, "DeleteDepositData")
      .withArgs(account2.address, data.pubkeys.length);
  });

  it("should delete all entries", async () => {
    let pubkey = [];
    let withdrawal_credentials = [];
    let signature = [];
    let deposit_data_root = [];

    for (let i = 0; i < 100; i++) {
      pubkey.push(mockData.pubkey[0]);
      withdrawal_credentials.push(mockData.withdrawal_credentials[0]);
      signature.push(mockData.signatures[0]);
      deposit_data_root.push(mockData.deposit_data_roots[0]);
    }

    await expect(
      receiveDepositContract
        .connect(deployer)
        .addDepositData(account1.address, pubkey, withdrawal_credentials, signature, deposit_data_root, {
          gasLimit: 29999999,
        }),
    ).to.not.be.reverted;

    await receiveDepositContract.deleteAllEntries(account1.address);

    let data: any = await receiveDepositContract.getStakerData(account1.address);

    expect(data.pubkeys.length).to.eq(0);
    expect(data.signatures.length).to.eq(0);
    expect(data.withdrawalCredentials.length).to.eq(0);
    expect(data.depositDataRoots.length).to.eq(0);
  });
});

describe("ReceiveBatchDeposit: Deposit Function", function () {
  beforeEach(async function () {
    [deployer, account1, account2, account3] = await ethers.getSigners();

    // deploy deposit contract
    const DepositContract = await hre.ethers.getContractFactory("DepositContract");
    depositContract = await DepositContract.deploy();
    // deploy preloaded batch deposit contract
    const ReceiveDepositContract = await hre.ethers.getContractFactory("ReceiveBatchDeposit");
    receiveDepositContract = await ReceiveDepositContract.deploy(depositContract.address);

    await receiveDepositContract
      .connect(deployer)
      .addDepositData(
        account1.address,
        mockData.pubkey,
        mockData.withdrawal_credentials,
        mockData.signatures,
        mockData.deposit_data_roots,
      );
  });

  it("Should fail deposit for non-whitelisted user", async function () {
    await expect(
      account2.sendTransaction({
        to: receiveDepositContract.address,
        value: ethers.utils.parseEther("32"),
      }),
    ).to.be.revertedWith("Twinstake: User is not whitelisted");
  });

  it("should fail deposit for less than 32 ETH", async function () {
    await expect(
      account1.sendTransaction({
        to: receiveDepositContract.address,
        value: ethers.utils.parseEther("30"),
      }),
    ).to.be.revertedWith("TwinStakeBatchDeposit: the amount of ETH does not match the amount of nodes");
  });

  it("Should revert if contract is paused", async () => {
    await receiveDepositContract.pause();
    await expect(
      account1.sendTransaction({
        to: receiveDepositContract.address,
        value: ethers.utils.parseEther("32"),
      }),
    ).to.be.revertedWith("Pausable: paused");
    await receiveDepositContract.unpause();
  });

  it("should pass deposit for 32 ETH and delete deposit data", async function () {
    expect(
      await account1.sendTransaction({
        to: receiveDepositContract.address,
        value: ethers.utils.parseEther("32"),
      }),
    ).to.not.be.reverted;

    let data: any = await receiveDepositContract.getStakerData(account1.address);
    expect(data.pubkeys).to.deep.eq([]);
    expect(data.withdrawalCredentials).to.deep.eq([]);
    expect(data.signatures).to.deep.eq([]);
    expect(data.depositDataRoots).to.deep.eq([]);
    expect(await depositContract.get_deposit_count()).to.eq("0x0100000000000000");
  });

  it("should increase count of deposit to 2 after double deposit", async function () {
    await receiveDepositContract
      .connect(deployer)
      .addDepositData(
        account2.address,
        multiMockData.pubkey,
        multiMockData.withdrawal_credentials,
        multiMockData.signature,
        multiMockData.deposit_data_root,
      );

    expect(
      await account2.sendTransaction({
        to: receiveDepositContract.address,
        value: ethers.utils.parseEther("64"),
      }),
    ).to.not.be.reverted;

    let count = await depositContract.get_deposit_count();

    let data: any = await receiveDepositContract.getStakerData(account2.address);
    expect(data.pubkeys).to.deep.eq([]);
    expect(data.withdrawalCredentials).to.deep.eq([]);
    expect(data.signatures).to.deep.eq([]);
    expect(data.depositDataRoots).to.deep.eq([]);
    expect(count).to.eq("0x0200000000000000");
  });

  it("should deposit 150 validators at once", async function () {
    let pubkeys = [];
    let withdrawal_credentials = [];
    let signatures = [];
    let deposit_data_roots = [];

    for (let i = 0; i < 50; i++) {
      pubkeys.push(mockData.pubkey[0]);
      withdrawal_credentials.push(mockData.withdrawal_credentials[0]);
      signatures.push(mockData.signatures[0]);
      deposit_data_roots.push(mockData.deposit_data_roots[0]);
    }

    await expect(
      receiveDepositContract
        .connect(deployer)
        .addDepositData(account3.address, pubkeys, withdrawal_credentials, signatures, deposit_data_roots),
    ).to.not.be.reverted;

    await expect(
      receiveDepositContract
        .connect(deployer)
        .addDepositData(account3.address, pubkeys, withdrawal_credentials, signatures, deposit_data_roots),
    ).to.not.be.reverted;

    await expect(
      receiveDepositContract
        .connect(deployer)
        .addDepositData(account3.address, pubkeys, withdrawal_credentials, signatures, deposit_data_roots),
    ).to.not.be.reverted;

    let data: any = await receiveDepositContract.getStakerData(account3.address);

    expect(
      await account3.sendTransaction({
        to: receiveDepositContract.address,
        value: ethers.utils.parseEther("4800"),
      }),
    ).to.not.be.reverted;
  });
});
