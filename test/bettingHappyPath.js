import EVMThrow from './helpers/EVMThrow';
import revert from './helpers/revert';

import latestTime from './helpers/latestTime';
import { increaseTimeTo, duration } from './helpers/increaseTime';

const BetTwoOutcomes = artifacts.require("BetTwoOutcomes");
const BallotTwoOutcomes = artifacts.require("BallotTwoOutcomes");
const should = require('chai')
  .use(require('chai-as-promised'))
  .should();

contract('BetTwoOutcomes', function(accounts) {
  let startTime;
  describe('Before game starts', () => {
    let BetTwoOutcomesInstance;
    // start and end timestamps where investments are allowed (both inclusive)

    beforeEach(async () => {
      startTime = latestTime() + duration.minutes(3);
      BetTwoOutcomesInstance = await BetTwoOutcomes.new(startTime, 1, {from: accounts[0], gas:60000000});
    });

    // test will automatically fail after game time
    it("should be possible to bet before game time", async() => {
      await BetTwoOutcomesInstance.bet.sendTransaction(1, {from: accounts[1], value: "100"});
      let totalBets = await BetTwoOutcomesInstance.totalBets.call();
      assert.equal(totalBets, 100);
    });

    it("should be possible to bet for home team before game time", async() => {
      await BetTwoOutcomesInstance.bet.sendTransaction(1, {from: accounts[1], value: "100"});
      let userBets = await BetTwoOutcomesInstance.getHomeBets.call(accounts[1]);
      assert.equal(userBets, 100);
    });

    it("should be possible to bet for away team before game time", async() => {
      await BetTwoOutcomesInstance.bet.sendTransaction(2, {from: accounts[1], value: "100"});
      let userBets = await BetTwoOutcomesInstance.getAwayBets.call(accounts[1]);
      assert.equal(userBets, 100);
    });

    it("should be possible to bet for home team and away team before game time", async() => {
      await BetTwoOutcomesInstance.bet.sendTransaction(1, {from: accounts[1], value: "100"});
      await BetTwoOutcomesInstance.bet.sendTransaction(2, {from: accounts[1], value: "100"});
      let userBetsPHI = await BetTwoOutcomesInstance.getHomeBets.call(accounts[1]);
      let userBetsNE = await BetTwoOutcomesInstance.getAwayBets.call(accounts[1]);
      assert.equal(userBetsPHI, 100);
      assert.equal(userBetsNE, 100);
      let totalBets = await BetTwoOutcomesInstance.totalBets.call();
      assert.equal(totalBets, 200);
    });

    it("should not be possible to bet with a wrong team number", async() => {
      await BetTwoOutcomesInstance.bet.sendTransaction(3, {from: accounts[1], value: "100"}).should.be.rejectedWith(revert);
      let totalBets = await BetTwoOutcomesInstance.totalBets.call();
      assert.equal(totalBets, 0);
    });

    it("should be possible to bet twice", async() => {
      await BetTwoOutcomesInstance.bet.sendTransaction(1, {from: accounts[1], value: "100"});
      await BetTwoOutcomesInstance.bet.sendTransaction(1, {from: accounts[1], value: "100"});
      let totalBets = await BetTwoOutcomesInstance.totalBets.call();
      let userBetsPHI = await BetTwoOutcomesInstance.getHomeBets.call(accounts[1]);
      assert.equal(userBetsPHI, 200);
      assert.equal(totalBets, 200);
    });

  });

  describe('After game starts: happy path', () =>  {
    let BetTwoOutcomesInstance;
    // start and end timestamps where investments are allowed (both inclusive)
    let BallotTwoOutcomesInstance;

    before(async () => {
      startTime = latestTime() + duration.minutes(3);
      BetTwoOutcomesInstance = await BetTwoOutcomes.new(startTime, 1, {from: accounts[0], gas:60000000});
      await BetTwoOutcomesInstance.bet.sendTransaction(1, {from: accounts[1], value: "10000000000000000000000"});
      await BetTwoOutcomesInstance.bet.sendTransaction(2, {from: accounts[2], value: "10000000000000000000000"});
      await BetTwoOutcomesInstance.bet.sendTransaction(1, {from: accounts[3], value: "10000000000000000000000"});
      await BetTwoOutcomesInstance.bet.sendTransaction(2, {from: accounts[4], value: "10000000000000000000000"});
      await BetTwoOutcomesInstance.bet.sendTransaction(1, {from: accounts[5], value: "10000000000000000000000"});
      await BetTwoOutcomesInstance.bet.sendTransaction(1, {from: accounts[6], value: "10000000000000000000000"});
    });

    it("should not be possible to bet after game time", async() => {
      await increaseTimeTo(startTime + 1);
      await BetTwoOutcomesInstance.bet.sendTransaction(1, {from: accounts[1], value: "100"}).should.be.rejectedWith(revert);
    });

    it("should not be possible to set result before 8 hours passed since game time", async() => {
      await increaseTimeTo(startTime + duration.hours(7));
      await BetTwoOutcomesInstance.startVoting.sendTransaction({from: accounts[0]}).should.be.rejectedWith(revert);
    });

    it("should be possible to set result 8 hours after game time", async() => {
      await increaseTimeTo(startTime + duration.hours(8));
      await BetTwoOutcomesInstance.startVoting.sendTransaction({from: accounts[0]});
      let isVotingOpen = await BetTwoOutcomesInstance.votingOpen.call();
      assert.isTrue(isVotingOpen);
    });

    it("should be possible for anyone to vote", async() => {
      let ballot = await BetTwoOutcomesInstance.ballot.call();
      BallotTwoOutcomesInstance = BallotTwoOutcomes.at(ballot);
      await BallotTwoOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[1], value: "50000000000000000"});
      let phiVotes = await BallotTwoOutcomesInstance.homeWon.call();
      assert.equal(phiVotes, 1, "not enough philadelphia wins votes");
    });

    it("should be impossible for anyone to vote without or wrong value", async() => {
      await BallotTwoOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[2], value: 0}).should.be.rejectedWith(revert);
      await BallotTwoOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[3], value: "50000000000000001"}).should.be.rejectedWith(revert);
    });

    it("should be impossible for anyone to vote twice", async() => {
      await BallotTwoOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[1], value: "50000000000000000"}).should.be.rejectedWith(revert);
      let phiVotes = await BallotTwoOutcomesInstance.homeWon.call();
      assert.equal(phiVotes, 1, "not enough philadelphia wins votes");
    });

    it("multiple votes : consensus reached", async() => {
      await BallotTwoOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[0], value: "50000000000000000"});
      await BallotTwoOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[2], value: "50000000000000000"});
      await BallotTwoOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[3], value: "50000000000000000"});
      await BallotTwoOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[4], value: "50000000000000000"});
      await BallotTwoOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[5], value: "50000000000000000"});
      let phiVotes = await BallotTwoOutcomesInstance.homeWon.call();
      assert.equal(phiVotes, 6, "not enough philadelphia wins votes");
      let totalVotes = await BallotTwoOutcomesInstance.totalVoters.call();
      assert.equal(totalVotes, 6, "not enough votes");
    });

    it("shouldn't end votes if voting period is not finished", async() => {
      let result0 = await BetTwoOutcomesInstance.result.call();
      assert.equal(result0, 0, "no result should have been reached");
      await BetTwoOutcomesInstance.endVoting.sendTransaction({from:accounts[1]}).should.be.rejectedWith(revert);
      let withdrawalOpen = await BetTwoOutcomesInstance.withdrawalOpen.call();
      assert.isFalse(withdrawalOpen);
      let result = await BetTwoOutcomesInstance.result.call();
      assert.equal(result, 0, "no result should have been reached");
    });

    it("should end votes when voting period is finished", async() => {
      await increaseTimeTo(startTime + duration.hours(8) + duration.days(7)+100);
      let result0 = await BetTwoOutcomesInstance.result.call();
      assert.equal(result0, 0, "no result should have been reached");
      await BetTwoOutcomesInstance.endVoting.sendTransaction({from:accounts[1]});
      let withdrawalOpen = await BetTwoOutcomesInstance.withdrawalOpen.call();
      assert.isTrue(withdrawalOpen, "withdrawal should be open");
      let result = await BetTwoOutcomesInstance.result.call();
      assert.equal(result, 1, "result should have been reached");
    });

    it("should be possible to withdraw winnings", async() => {
      let balanceBefore = await web3.eth.getBalance(accounts[1]);
      await BetTwoOutcomesInstance.getWinnings.sendTransaction(0, {from:accounts[1]});
      let balanceAfter = await web3.eth.getBalance(accounts[1]);
      let hasClaimed = await BetTwoOutcomesInstance.hasClaimed(accounts[1]);
      assert.isTrue(hasClaimed);
      assert.isAbove(balanceAfter.toNumber(), balanceBefore.toNumber(), "should have won ether");
    });

    it("should not send anything to losers", async() => {
      let balanceBefore = await web3.eth.getBalance(accounts[2]);
      await BetTwoOutcomesInstance.getWinnings.sendTransaction(0, {from:accounts[2]});
      let balanceAfter = await web3.eth.getBalance(accounts[2]);
      let hasClaimed = await BetTwoOutcomesInstance.hasClaimed(accounts[2]);
      assert.isTrue(hasClaimed);
      let wins = await BetTwoOutcomesInstance.wins.call(accounts[2]);
      assert.equal(wins, 0, "should be equal to 0");
      assert.isAbove(balanceBefore.toNumber(), balanceAfter.toNumber(), "should have not won ether");
    });

    it("should not be possible to withdraw winnings twice", async() => {
      await BetTwoOutcomesInstance.getWinnings.sendTransaction(0, {from:accounts[1]}).should.be.rejectedWith(revert);
    });

    it("balance should be equal to 0 once everyone withdrew", async() => {
      await BetTwoOutcomesInstance.getWinnings.sendTransaction(0, {from:accounts[3]});
      await BetTwoOutcomesInstance.getWinnings.sendTransaction(0, {from:accounts[5]});
      await BetTwoOutcomesInstance.getWinnings.sendTransaction(0, {from:accounts[6]});
      let balanceContract = await web3.eth.getBalance(BetTwoOutcomesInstance.address);
      assert.equal(balanceContract.toNumber(), 0, "balance should be empty");
    });

    it("should be possible to withdraw ballot rewards", async() => {
      let balanceBefore = await web3.eth.getBalance(accounts[0]);
      await BallotTwoOutcomesInstance.getReward.sendTransaction(accounts[0]);
      let balanceAfter = await web3.eth.getBalance(accounts[0]);
      let hasClaimed = await BallotTwoOutcomesInstance.hasClaimed(accounts[0]);
      //let majorityReward = await BallotTwoOutcomesInstance.majorityReward.call();
      assert.isTrue(hasClaimed);
      assert.isAbove(balanceAfter.toNumber(), balanceBefore.toNumber(), "should have won ether");
    });

    it("should not be possible to withdraw ballot rewards twice", async() => {
      await BallotTwoOutcomesInstance.getReward.sendTransaction(accounts[0]).should.be.rejectedWith(revert);
    });

    it("balance should be equal at least < 10 once everyone got their rewards", async() => {
      await BallotTwoOutcomesInstance.getReward.sendTransaction(accounts[1]);
      await BallotTwoOutcomesInstance.getReward.sendTransaction(accounts[2]);
      await BallotTwoOutcomesInstance.getReward.sendTransaction(accounts[3]);
      await BallotTwoOutcomesInstance.getReward.sendTransaction(accounts[4]);
      await BallotTwoOutcomesInstance.getReward.sendTransaction(accounts[5]);

      let balanceContract = await web3.eth.getBalance(BallotTwoOutcomesInstance.address);
      assert.isAbove(10, balanceContract.toNumber(), "balance should be empty");
    });

  });
});
