const { expect } = require("chai");
const { ethers } = require("hardhat");
const BigNumber = require("bignumber.js");

describe("Tests uStaking", function () {
  let owner;
  let _refWallet;
  let erc20Contract;
  let Erc20Factory;
  let StakingFactory;
  let stakingContract;
  let user1;
  let user2;
  let user3;
  let user4;

  before(async () => {
    [owner, _refWallet, user1, user2, user3, user4] = await ethers.getSigners();

    Erc20Factory = await ethers.getContractFactory("UStakingToken", owner);
    erc20Contract = await Erc20Factory.deploy();
    await erc20Contract.deployed();

    StakingFactory = await ethers.getContractFactory("UStaking", owner);
    stakingContract = await StakingFactory.deploy(
      erc20Contract.address,
      _refWallet.address
    );
    await stakingContract.deployed();
  });

  it("Should be deployed erc20 contract", async function () {
    expect(erc20Contract.address).to.be.properAddress;
  });

  it("Should be deployed staking contract", async function () {
    expect(stakingContract.address).to.be.properAddress;
  });

  it("Should give the role of minter for the stacking contract", async function () {
    const minter = await erc20Contract.MINTER_ROLE();
    await erc20Contract.grantRole(minter, stakingContract.address);
    const isRole = await erc20Contract.hasRole(minter, stakingContract.address);
    expect(isRole).to.be.true;
  });

  it("Should return the total amount at the first mint", async function () {
    const totalSupply = await erc20Contract.totalSupply();
    expect(totalSupply).to.eq(ethers.utils.parseEther("79000000"));
  });

  it("Should return the STK character", async function () {
    const characterToken = await erc20Contract.symbol();
    const nameToken = await erc20Contract.name();
    expect(characterToken).to.eq("uSTK");
    expect(nameToken).to.eq("uStaking");
  });

  it("Should return approve in allowance for owner address", async function () {
    const sumForApprove = ethers.utils.parseEther("1500");
    await erc20Contract.approve(
      "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
      sumForApprove
    );
    const allowanceSum = await erc20Contract.allowance(
      owner.address,
      "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2"
    );
    expect(allowanceSum).to.eq(sumForApprove);
  });

  it("Should transfer 2000 tokens from owner to user1", async function () {
    const sumForTransfer = ethers.utils.parseEther("2000");

    await erc20Contract.transfer(user1.address, sumForTransfer);

    const balanceOfUser1 = await erc20Contract.balanceOf(user1.address);

    expect(balanceOfUser1).to.eq(sumForTransfer);
  });

  it("Should approve and stake for staking contract", async function () {
    const sumForStake = ethers.utils.parseEther("1000");
    const sumStake = ethers.utils.parseEther("1320"); // + 32%, refferal 25%, staking 5% , cashback 2%
    const sumMinusForStake = ethers.utils.parseEther("-1000");

    await erc20Contract
      .connect(user1)
      .approve(stakingContract.address, sumForStake);

    const allowanceSum = await erc20Contract.allowance(
      user1.address,
      stakingContract.address
    );

    expect(allowanceSum).to.eq(sumForStake);

    await expect(() =>
      stakingContract.connect(user1).stake(1, sumForStake)
    ).to.changeTokenBalances(
      erc20Contract,
      [user1, stakingContract],
      [sumMinusForStake, sumStake]
    );

    const balanceOfUser1 = await erc20Contract.balanceOf(user1.address);

    expect(balanceOfUser1).to.eq(sumForStake);
  });

  it("Should return cashBack in 2% from 1000", async function () {
    const sumForStake = ethers.utils.parseEther("20");
    const sumMinusForStake = ethers.utils.parseEther("-20");

    await expect(() =>
      stakingContract.connect(user1).cashBack(1)
    ).to.changeTokenBalances(
      erc20Contract,
      [user1, stakingContract],
      [sumForStake, sumMinusForStake]
    );
  });

  it("Should return the percentage for the stake time", async function () {
    await expect(() =>
      stakingContract.connect(user1).claim(1)
    ).to.changeTokenBalances(
      erc20Contract,
      [user1, stakingContract],
      [38580000000000, -38580000000000]
    );
  });

  it("Should return that the stake under id 1 was", async function () {
    const isContains = await stakingContract.isContains(user1.address, 1);
    expect(isContains).to.be.true;
  });

  it("Should return the quantity of stake user1", async function () {
    const stakeLength = await stakingContract.stakeLength(user1.address);
    expect(stakeLength).to.be.eq(1);
  });

  it("Should returns Index in the array by id", async function () {
    const stakeAmount = await stakingContract.stakeAt(user1.address, 0);
    expect(stakeAmount).to.be.eq(1);
  });

  it("Should return all stake IDs to the address.", async function () {
    const stakeAmount = await stakingContract.stakeTotalIds(user1.address);
    expect(Number(stakeAmount[0]._hex)).to.be.eq(1);
  });

  it("Should return new refferal address", async function () {
    const refWallet = await stakingContract.refWallet();
    expect(refWallet).to.be.eq(_refWallet.address);

    await stakingContract.refWalletUpdate(user2.address);

    const newRefWallet = await stakingContract.refWallet();
    expect(newRefWallet).to.be.eq(user2.address);
  });

  it("Should withdraw stake amount", async function () {
    const sumForStake = ethers.utils.parseEther("1000");
    const sumMinusForStake = ethers.utils.parseEther("-1000");

    await ethers.provider.send("evm_increaseTime", [15778458]);
    await ethers.provider.send("evm_mine");

    await expect(() =>
      stakingContract.connect(user1).withdraw(1)
    ).to.changeTokenBalances(
      erc20Contract,
      [user1, stakingContract],
      [sumForStake, sumMinusForStake]
    );

    await expect(() =>
      stakingContract.connect(user1).claim(1)
    ).to.changeTokenBalances(
      erc20Contract,
      [user1, stakingContract],
      [299999961420000000000n, -299999961420000000000n]
    );
  });
});
