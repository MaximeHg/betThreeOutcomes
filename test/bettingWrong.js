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
  describe('After game starts: consensus not reached on first try', () =>  {
    let BetThreeOutcomesInstance;
    // start and end timestamps where investments are allowed (both inclusive)
    let BallotThreeOutcomesInstance;

    before(async () => {
      startTime = latestTime() + duration.weeks(2);
      BetThreeOutcomesInstance = await BetThreeOutcomes.new(startTime, 1, {from: accounts[0], gas:60000000});
      await BetThreeOutcomesInstance.bet.sendTransaction(1, {from: accounts[1], value: "10000000000000000000000"});
      await BetThreeOutcomesInstance.bet.sendTransaction(2, {from: accounts[2], value: "10000000000000000000000"});
      await BetThreeOutcomesInstance.bet.sendTransaction(1, {from: accounts[3], value: "10000000000000000000000"});
      await BetThreeOutcomesInstance.bet.sendTransaction(2, {from: accounts[4], value: "10000000000000000000000"});
      await BetThreeOutcomesInstance.bet.sendTransaction(1, {from: accounts[5], value: "10000000000000000000000"});
      await BetThreeOutcomesInstance.bet.sendTransaction(1, {from: accounts[6], value: "10000000000000000000000"});
      await BetThreeOutcomesInstance.bet.sendTransaction(1, {from: accounts[6], value: "10000000000000000000000"});
      await BetThreeOutcomesInstance.bet.sendTransaction(3, {from: accounts[6], value: "10000000000000000000000"});
      await BetThreeOutcomesInstance.bet.sendTransaction(3, {from: accounts[6], value: "10000000000000000000000"});
    });

    it("should be possible to set result 4 hours after game time", async() => {
      await increaseTimeTo(startTime + duration.hours(4));
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

    it("multiple votes : consensus not reached", async() => {
      await BallotThreeOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[0], value: "50000000000000000"});
      await BallotThreeOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[2], value: "50000000000000000"});
      await BallotThreeOutcomesInstance.voteResult.sendTransaction(2, {from: accounts[3], value: "50000000000000000"});
      await BallotThreeOutcomesInstance.voteResult.sendTransaction(2, {from: accounts[4], value: "50000000000000000"});
      await BallotThreeOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[5], value: "50000000000000000"});
      let phiVotes = await BallotThreeOutcomesInstance.homeWon.call();
      assert.equal(phiVotes, 4, "not enough philadelphia wins votes");
      let totalVotes = await BallotThreeOutcomesInstance.totalVoters.call();
      assert.equal(totalVotes, 6, "not enough votes");
    });

    it("should end votes when voting period is finished but create a new ballot", async() => {
      let first_ballot = await BetThreeOutcomesInstance.ballot.call();
      await increaseTimeTo(startTime + duration.hours(8) + duration.days(7)+100);
      let result0 = await BetThreeOutcomesInstance.result.call();
      assert.equal(result0, 0, "no result should have been reached");
      await BetThreeOutcomesInstance.endVoting.sendTransaction({from:accounts[1]});
      let withdrawalOpen = await BetThreeOutcomesInstance.withdrawalOpen.call();
      assert.isFalse(withdrawalOpen, "withdrawal should be open");
      let result = await BetThreeOutcomesInstance.result.call();
      assert.equal(result, 0, "result should not have been reached");
      let new_ballot = await BetThreeOutcomesInstance.ballot.call();
      let ballots = new_ballot == first_ballot;
      assert.isFalse(ballots);
      BallotThreeOutcomesInstance = BallotThreeOutcomes.at(new_ballot);
    });

    it("multiple votes : consensus reached at around 85%", async() => {
      await BallotThreeOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[0], value: "50000000000000000"});
      await BallotThreeOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[2], value: "50000000000000000"});
      await BallotThreeOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[3], value: "50000000000000000"});
      await BallotThreeOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[6], value: "50000000000000000"});
      await BallotThreeOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[7], value: "50000000000000000"});
      await BallotThreeOutcomesInstance.voteResult.sendTransaction(2, {from: accounts[4], value: "50000000000000000"});
      await BallotThreeOutcomesInstance.voteResult.sendTransaction(1, {from: accounts[5], value: "50000000000000000"});
      let phiVotes = await BallotThreeOutcomesInstance.homeWon.call();
      assert.equal(phiVotes, 6, "not enough philadelphia wins votes");
      let totalVotes = await BallotThreeOutcomesInstance.totalVoters.call();
      assert.equal(totalVotes, 7, "not enough votes");
    });

    it("should end votes when voting period is finished", async() => {
      await increaseTimeTo(startTime + duration.hours(8) + duration.days(14)+200);
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

    it("balance should be equal to 0 once everyone withdrew", async() => {
      let balanceOwner = await web3.eth.getBalance(accounts[0]);
      await BetThreeOutcomesInstance.getWinnings.sendTransaction(0, {from:accounts[3]});
      await BetThreeOutcomesInstance.getWinnings.sendTransaction(0, {from:accounts[5]});
      await BetThreeOutcomesInstance.getWinnings.sendTransaction(1, {from:accounts[6]});
      let balanceOwner2 = await web3.eth.getBalance(accounts[0]);
      let balanceContract = await web3.eth.getBalance(BetThreeOutcomesInstance.address);
      assert.isAbove(balanceOwner2.toNumber(), balanceOwner.toNumber(), "should have donations");
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

    it("balance should be equal at least < 10 once everyone got their rewards", async() => {
      await BallotThreeOutcomesInstance.getReward.sendTransaction(accounts[2]);
      await BallotThreeOutcomesInstance.getReward.sendTransaction(accounts[3]);
      await BallotThreeOutcomesInstance.getReward.sendTransaction(accounts[4]);
      await BallotThreeOutcomesInstance.getReward.sendTransaction(accounts[5]);
      await BallotThreeOutcomesInstance.getReward.sendTransaction(accounts[6]);
      await BallotThreeOutcomesInstance.getReward.sendTransaction(accounts[7]);

      let balanceContract = await web3.eth.getBalance(BallotThreeOutcomesInstance.address);
      assert.isAbove(10, balanceContract.toNumber(), "balance should be empty");
    });

  });
});
