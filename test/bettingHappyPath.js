import EVMThrow from './helpers/EVMThrow';
import revert from './helpers/revert';

import latestTime from './helpers/latestTime';
import { increaseTimeTo, duration } from './helpers/increaseTime';

const BetThreeOutcomes = artifacts.require("BetThreeOutcomes");
const BallotThreeOutcomes = artifacts.require("BallotThreeOutcomes");
const should = require('chai')
  .use(require('chai-as-promised'))
  .should();

contract('BetThreeOutcomes', function(accounts) {
  let startTime;
  describe('Before game starts', () => {
    let BetThreeOutcomesInstance;
    // start and end timestamps where investments are allowed (both inclusive)

    beforeEach(async () => {
      startTime = latestTime() + duration.minutes(3);
      BetThreeOutcomesInstance = await BetThreeOutcomes.new(startTime, 1, {from: accounts[0], gas:60000000});
    });

    // test will automatically fail after game time
    it("should be possible to bet before game time", async() => {
      await BetThreeOutcomesInstance.bet.sendTransaction(1, {from: accounts[1], value: "100"});
      let totalBets = await BetThreeOutcomesInstance.totalBets.call();
      assert.equal(totalBets, 100);
    });

    it("should be possible to bet for home team before game time", async() => {
      await BetThreeOutcomesInstance.bet.sendTransaction(1, {from: accounts[1], value: "100"});
      let userBets = await BetThreeOutcomesInstance.getHomeBets.call(accounts[1]);
      assert.equal(userBets, 100);
    });

    it("should be possible to bet for draw before game time", async() => {
      await BetThreeOutcomesInstance.bet.sendTransaction(2, {from: accounts[1], value: "100"});
      let userBets = await BetThreeOutcomesInstance.getDrawBets.call(accounts[1]);
      assert.equal(userBets, 100);
    });

    it("should be possible to bet for away team before game time", async() => {
      await BetThreeOutcomesInstance.bet.sendTransaction(3, {from: accounts[1], value: "100"});
      let userBets = await BetThreeOutcomesInstance.getAwayBets.call(accounts[1]);
      assert.equal(userBets, 100);
    });

    it("should be possible to bet for home team and away team before game time", async() => {
      await BetThreeOutcomesInstance.bet.sendTransaction(1, {from: accounts[1], value: "100"});
      await BetThreeOutcomesInstance.bet.sendTransaction(3, {from: accounts[1], value: "100"});
      let userBetsHome = await BetThreeOutcomesInstance.getHomeBets.call(accounts[1]);
      let userBetsAway = await BetThreeOutcomesInstance.getAwayBets.call(accounts[1]);
      assert.equal(userBetsHome, 100);
      assert.equal(userBetsAway, 100);
      let totalBets = await BetThreeOutcomesInstance.totalBets.call();
      assert.equal(totalBets, 200);
    });

    it("should be possible to bet for home team and draw before game time", async() => {
      await BetThreeOutcomesInstance.bet.sendTransaction(1, {from: accounts[1], value: "100"});
      await BetThreeOutcomesInstance.bet.sendTransaction(2, {from: accounts[1], value: "100"});
      let userBetsHome = await BetThreeOutcomesInstance.getHomeBets.call(accounts[1]);
      let userBetsDraw = await BetThreeOutcomesInstance.getDrawBets.call(accounts[1]);
      assert.equal(userBetsHome, 100);
      assert.equal(userBetsDraw, 100);
      let totalBets = await BetThreeOutcomesInstance.totalBets.call();
      assert.equal(totalBets, 200);
    });

    it("should be possible to bet for away team and draw before game time", async() => {
      await BetThreeOutcomesInstance.bet.sendTransaction(3, {from: accounts[1], value: "100"});
      await BetThreeOutcomesInstance.bet.sendTransaction(2, {from: accounts[1], value: "100"});
      let userBetsAway = await BetThreeOutcomesInstance.getAwayBets.call(accounts[1]);
      let userBetsDraw = await BetThreeOutcomesInstance.getDrawBets.call(accounts[1]);
      assert.equal(userBetsAway, 100);
      assert.equal(userBetsDraw, 100);
      let totalBets = await BetThreeOutcomesInstance.totalBets.call();
      assert.equal(totalBets, 200);
    });

    it("should be possible to bet for every outcomes before game time", async() => {
      await BetThreeOutcomesInstance.bet.sendTransaction(3, {from: accounts[1], value: "100"});
      await BetThreeOutcomesInstance.bet.sendTransaction(2, {from: accounts[1], value: "100"});
      await BetThreeOutcomesInstance.bet.sendTransaction(1, {from: accounts[1], value: "100"});
      let userBetsHome = await BetThreeOutcomesInstance.getHomeBets.call(accounts[1]);
      let userBetsAway = await BetThreeOutcomesInstance.getAwayBets.call(accounts[1]);
      let userBetsDraw = await BetThreeOutcomesInstance.getDrawBets.call(accounts[1]);
      assert.equal(userBetsHome, 100);
      assert.equal(userBetsAway, 100);
      assert.equal(userBetsDraw, 100);
      let totalBets = await BetThreeOutcomesInstance.totalBets.call();
      assert.equal(totalBets, 300);
    });

    it("should not be possible to bet with a wrong team number", async() => {
      await BetThreeOutcomesInstance.bet.sendTransaction(4, {from: accounts[1], value: "100"}).should.be.rejectedWith(revert);
      let totalBets = await BetThreeOutcomesInstance.totalBets.call();
      assert.equal(totalBets, 0);
    });

    it("should be possible to bet twice", async() => {
      await BetThreeOutcomesInstance.bet.sendTransaction(1, {from: accounts[1], value: "100"});
      await BetThreeOutcomesInstance.bet.sendTransaction(1, {from: accounts[1], value: "100"});
      let totalBets = await BetThreeOutcomesInstance.totalBets.call();
      let userBetsHome = await BetThreeOutcomesInstance.getHomeBets.call(accounts[1]);
      assert.equal(userBetsHome, 200);
      assert.equal(totalBets, 200);
    });

  });

  describe('After game starts: happy path', () =>  {
    let BetThreeOutcomesInstance;
    // start and end timestamps where investments are allowed (both inclusive)
    let BallotThreeOutcomesInstance;

    before(async () => {
      startTime = latestTime() + duration.minutes(3);
      BetThreeOutcomesInstance = await BetThreeOutcomes.new(startTime, 1, {from: accounts[0], gas:60000000});
      await BetThreeOutcomesInstance.bet.sendTransaction(1, {from: accounts[1], value: "10000000000000000000000"});
      await BetThreeOutcomesInstance.bet.sendTransaction(2, {from: accounts[2], value: "10000000000000000000000"});
      await BetThreeOutcomesInstance.bet.sendTransaction(1, {from: accounts[3], value: "10000000000000000000000"});
      await BetThreeOutcomesInstance.bet.sendTransaction(2, {from: accounts[4], value: "10000000000000000000000"});
      await BetThreeOutcomesInstance.bet.sendTransaction(1, {from: accounts[5], value: "10000000000000000000000"});
      await BetThreeOutcomesInstance.bet.sendTransaction(1, {from: accounts[6], value: "10000000000000000000000"});
    });

    it("should not be possible to bet after game time", async() => {
      await increaseTimeTo(startTime + 1);
      await BetThreeOutcomesInstance.bet.sendTransaction(1, {from: accounts[1], value: "100"}).should.be.rejectedWith(revert);
    });

    it("should not be possible to set result before 4 hours passed since game time", async() => {
      await increaseTimeTo(startTime + duration.hours(3));
      await BetThreeOutcomesInstance.startVoting.sendTransaction({from: accounts[0]}).should.be.rejectedWith(revert);
    });

    it("should be possible to set result 8 hours after game time", async() => {
      await increaseTimeTo(startTime + duration.hours(8));
      await BetThreeOutcomesInstance.startVoting.sendTransaction({from: accounts[0]});
      let isVotingOpen = await BetThreeOutcomesInstance.votingOpen.call();
      assert.isTrue(isVotingOpen);
    });

    it("should be possible for anyone to vote", async() => {
      let ballot = await BetThreeOutcomesInstance.ballot.call();
      BallotThreeOutcomesInstance = BallotThreeOutcomes.at(ballot);
      await BallotThreeOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[1], value: "50000000000000000"});
      let phiVotes = await BallotThreeOutcomesInstance.homeWon.call();
      assert.equal(phiVotes, 1, "not enough philadelphia wins votes");
    });

    it("should be impossible for anyone to vote without or wrong value", async() => {
      await BallotThreeOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[2], value: 0}).should.be.rejectedWith(revert);
      await BallotThreeOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[3], value: "50000000000000001"}).should.be.rejectedWith(revert);
    });

    it("should be impossible for anyone to vote twice", async() => {
      await BallotThreeOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[1], value: "50000000000000000"}).should.be.rejectedWith(revert);
      let phiVotes = await BallotThreeOutcomesInstance.homeWon.call();
      assert.equal(phiVotes, 1, "not enough philadelphia wins votes");
    });

    it("multiple votes : consensus reached", async() => {
      await BallotThreeOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[0], value: "50000000000000000"});
      await BallotThreeOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[2], value: "50000000000000000"});
      await BallotThreeOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[3], value: "50000000000000000"});
      await BallotThreeOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[4], value: "50000000000000000"});
      await BallotThreeOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[5], value: "50000000000000000"});
      let phiVotes = await BallotThreeOutcomesInstance.homeWon.call();
      assert.equal(phiVotes, 6, "not enough philadelphia wins votes");
      let totalVotes = await BallotThreeOutcomesInstance.totalVoters.call();
      assert.equal(totalVotes, 6, "not enough votes");
    });

    it("shouldn't end votes if voting period is not finished", async() => {
      let result0 = await BetThreeOutcomesInstance.result.call();
      assert.equal(result0, 0, "no result should have been reached");
      await BetThreeOutcomesInstance.endVoting.sendTransaction({from:accounts[1]}).should.be.rejectedWith(revert);
      let withdrawalOpen = await BetThreeOutcomesInstance.withdrawalOpen.call();
      assert.isFalse(withdrawalOpen);
      let result = await BetThreeOutcomesInstance.result.call();
      assert.equal(result, 0, "no result should have been reached");
    });

    it("should end votes when voting period is finished", async() => {
      await increaseTimeTo(startTime + duration.hours(8) + duration.days(7)+100);
      let result0 = await BetThreeOutcomesInstance.result.call();
      assert.equal(result0, 0, "no result should have been reached");
      await BetThreeOutcomesInstance.endVoting.sendTransaction({from:accounts[1]});
      let withdrawalOpen = await BetThreeOutcomesInstance.withdrawalOpen.call();
      assert.isTrue(withdrawalOpen, "withdrawal should be open");
      let result = await BetThreeOutcomesInstance.result.call();
      assert.equal(result, 1, "result should have been reached");
    });

    it("should be possible to withdraw winnings", async() => {
      let balanceBefore = await web3.eth.getBalance(accounts[1]);
      await BetThreeOutcomesInstance.getWinnings.sendTransaction(0, {from:accounts[1]});
      let balanceAfter = await web3.eth.getBalance(accounts[1]);
      let hasClaimed = await BetThreeOutcomesInstance.hasClaimed(accounts[1]);
      assert.isTrue(hasClaimed);
      assert.isAbove(balanceAfter.toNumber(), balanceBefore.toNumber(), "should have won ether");
    });

    it("should not send anything to losers", async() => {
      let balanceBefore = await web3.eth.getBalance(accounts[2]);
      await BetThreeOutcomesInstance.getWinnings.sendTransaction(0, {from:accounts[2]});
      let balanceAfter = await web3.eth.getBalance(accounts[2]);
      let hasClaimed = await BetThreeOutcomesInstance.hasClaimed(accounts[2]);
      assert.isTrue(hasClaimed);
      let wins = await BetThreeOutcomesInstance.wins.call(accounts[2]);
      assert.equal(wins, 0, "should be equal to 0");
      assert.isAbove(balanceBefore.toNumber(), balanceAfter.toNumber(), "should have not won ether");
    });

    it("should not be possible to withdraw winnings twice", async() => {
      await BetThreeOutcomesInstance.getWinnings.sendTransaction(0, {from:accounts[1]}).should.be.rejectedWith(revert);
    });

    it("balance should be equal to 0 once everyone withdrew", async() => {
      await BetThreeOutcomesInstance.getWinnings.sendTransaction(0, {from:accounts[3]});
      await BetThreeOutcomesInstance.getWinnings.sendTransaction(0, {from:accounts[5]});
      await BetThreeOutcomesInstance.getWinnings.sendTransaction(0, {from:accounts[6]});
      let balanceContract = await web3.eth.getBalance(BetThreeOutcomesInstance.address);
      assert.equal(balanceContract.toNumber(), 0, "balance should be empty");
    });

    it("should be possible to withdraw ballot rewards", async() => {
      let balanceBefore = await web3.eth.getBalance(accounts[0]);
      await BallotThreeOutcomesInstance.getReward.sendTransaction(accounts[0]);
      let balanceAfter = await web3.eth.getBalance(accounts[0]);
      let hasClaimed = await BallotThreeOutcomesInstance.hasClaimed(accounts[0]);
      //let majorityReward = await BallotThreeOutcomesInstance.majorityReward.call();
      assert.isTrue(hasClaimed);
      assert.isAbove(balanceAfter.toNumber(), balanceBefore.toNumber(), "should have won ether");
    });

    it("should not be possible to withdraw ballot rewards twice", async() => {
      await BallotThreeOutcomesInstance.getReward.sendTransaction(accounts[0]).should.be.rejectedWith(revert);
    });

    it("balance should be equal at least < 10 once everyone got their rewards", async() => {
      await BallotThreeOutcomesInstance.getReward.sendTransaction(accounts[1]);
      await BallotThreeOutcomesInstance.getReward.sendTransaction(accounts[2]);
      await BallotThreeOutcomesInstance.getReward.sendTransaction(accounts[3]);
      await BallotThreeOutcomesInstance.getReward.sendTransaction(accounts[4]);
      await BallotThreeOutcomesInstance.getReward.sendTransaction(accounts[5]);

      let balanceContract = await web3.eth.getBalance(BallotThreeOutcomesInstance.address);
      assert.isAbove(10, balanceContract.toNumber(), "balance should be empty");
    });

  });
});
