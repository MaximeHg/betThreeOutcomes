pragma solidity ^0.4.24;

import "./SafeMath.sol";
import "./BetThreeOutcomes.sol";

/**
* @dev This contract is an oracle linked to a BetThreeOutcomes betting contract.
* @author @maximehg
**/

contract BallotThreeOutcomes {
  using SafeMath for uint;

  // votes for home
  uint public homeWon;
  // votes for draw
  uint public drawWon;
  // votes for away
  uint public awayWon;

  // answering to which betting contract
  BetThreeOutcomes bettingContract;

  // mapping stocking who has voted
  mapping (address => bool) voted;
  // mapping stocking the votes
  mapping (address => uint) votes;

  // voting period
  uint public constant votingPeriod = 1 days;
  // how much you need to stake to vote
  uint public constant oracleStake = 50 finney;

  // date of voting start
  uint public votingStart;
  // date of voting end : votingStart + votingPeriod
  uint public votingEnd;

  // what is our valid result : 1=home,2=draw,3=away
  uint public validResult;
  // is our oracle closed?
  bool public closed;
  // number of voters
  uint public totalVoters;
  // XX.XXX% majority that needs to be reached
  uint public threshold;
  // what you will earn from the betting contract if you report the correct score
  uint public votingReward;
  // what you will earn from the minority voters if you report the correct score
  uint public majorityReward;
  // do we have a tie?
  bool public tie;

  // what has been staked
  mapping (address => uint) stake;
  // has the reward been claimed?
  mapping (address => bool) claimed;

  /**
  * @dev initiates the contract with a majority threshold
  * @param th the threshold
  **/
  constructor(uint th) public payable {
    validResult = 0;
    closed = false;
    votingStart = now;
    votingEnd = now + votingPeriod;
    bettingContract = BetThreeOutcomes(msg.sender);
    totalVoters = 0;
    threshold = th;
    tie = false;
    votingReward = 0;
  }

  /**
  * @dev the function used to vote for a result, can be called only once
  * @param team the team that won
  **/
  function voteResult(uint team) public payable {
    require(votingStart <= now && votingEnd >= now);
    require(voted[msg.sender] == false);
    require(msg.value == oracleStake);
    require(!closed);
    if(team == 1) {
      homeWon += 1;
    }
    else if (team == 2) {
      drawWon += 1;
    }
    else if (team == 3) {
      awayWon += 1;
    } else revert();
    voted[msg.sender] = true;
    votes[msg.sender] = team;
    totalVoters += 1;
    stake[msg.sender] = msg.value;
  }

  /**
  * @dev check the results and closes the ballot
  **/
  function closeBallot() public returns (uint) {
    require(!closed);
    require(now > votingEnd);
    // there was no majority above 50% ; we need a manual tiebreaker
    if((homeWon.mul(100000).div(totalVoters) < threshold) &&
        (awayWon.mul(100000).div(totalVoters) < threshold) &&
        (drawWon.mul(100000).div(totalVoters) < threshold) &&
        (threshold == 50000))
    {
      validResult = 9;
      closed = true;
      tie = true;
      return validResult;
    } // home has won
    else if(homeWon.mul(100000).div(totalVoters) >= threshold) {
      validResult = 1;
      votingReward = bettingContract.getLosersPercentage(1);
      majorityReward = (awayWon.add(drawWon).mul(oracleStake)).add(votingReward).div(homeWon);
    } // away has won
    else if (awayWon.mul(100000).div(totalVoters) >= threshold) {
      validResult = 3;
      votingReward = bettingContract.getLosersPercentage(3);
      majorityReward = (homeWon.add(drawWon).mul(oracleStake)).add(votingReward).div(awayWon);
    } // draw has won
    else if (drawWon.mul(100000).div(totalVoters) >= threshold) {
      validResult = 2;
      votingReward = bettingContract.getLosersPercentage(2);
      majorityReward = (homeWon.add(awayWon).mul(oracleStake)).add(votingReward).div(awayWon);
    } // no one has won, tie, create a new oracle
    else {
      if (awayWon>homeWon && awayWon>drawWon) majorityReward = (homeWon.mul(oracleStake)).div(awayWon.add(drawWon));
      else if (homeWon>awayWon && homeWon>drawWon) majorityReward = (awayWon.mul(oracleStake)).div(homeWon.add(drawWon));
      else if (drawWon>homeWon && drawWon>awayWon) majorityReward = (drawWon.mul(oracleStake)).div(awayWon.add(homeWon));
      else {
        // send back stack to everyone
        tie = true;
        majorityReward = 0;
      }
      validResult = 0;
    }
    closed = true;
    return validResult;
  }

  /**
  * @dev sends the reward to the oracle voter
  * @param voter the voter
  **/
  function getReward(address voter) public {
    require(closed);
    require(voted[voter]);
    require(claimed[voter] == false);
    if(tie) {
      voter.transfer(stake[voter]);
    }
    // majority gets rewarded
    if(votes[voter] == validResult) {
      voter.transfer(stake[voter] + majorityReward);
    } // minority loses all
    claimed[voter] = true;
  }

  function hasClaimed(address voter) public constant returns (bool) {
    return claimed[voter];
  }

  function () public payable {}
}
