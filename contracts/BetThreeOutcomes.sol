pragma solidity ^0.4.23;

import "./SafeMath.sol";
import "./BallotThreeOutcomes.sol";

/**
* @dev This contract is a betting contract for three outcomes. 
* @author @maximehg
**/

contract BetThreeOutcomes {
  using SafeMath for uint;

  // bets close at this time
  uint public gameStartTime;
  // is the result confirmed ; is false by default, will change when oracle has reached a result
  bool public resultConfirmed = false;
  // percentage of losers stakes sent to the oracle to reward score reporters
  uint public losersPercentage;
  // owner of the contract ; used to break ties and to be rewarded if betters wish so
  address public owner;
  // duration of the event ; be safe!
  uint public constant eventDuration = 4 hours;

  // mapping containing all bets
  mapping(address => betting) public bets;

  // sum of all ethers bet
  uint public totalBets;
  // sum of all ethers bet on home team
  uint public homeBets;
  // sum of all ethers bet on draw
  uint public drawBets;
  // sum of all ethers bet on away team
  uint public awayBets;
  // the result, 1 : home, 2 : draw, 3 : away
  uint public result;
  // number of betters
  uint public betters;
  // is voting open?
  bool public votingOpen;
  // is withdrawal open? it never closes but opens only when result has been reported
  bool public withdrawalOpen;
  // we need a majority of XX% of score reporters to confirm outcome result
  uint public threshold;
  // total ethers won by winners
  uint public winningPot;

  // what has been won and sent to a better
  mapping(address => uint) public wins;

  // oracle address
  BallotThreeOutcomes public ballot;

  // structure with all bets from an address
  struct betting {
    uint homeBets;
    uint drawBets;
    uint awayBets;
    bool claimed;
  }

  /**
  * @dev initiates the contract with event date and reward to be sent to the oracle
  **/
  constructor(uint _gameStartTime, uint _losersPercentage) public {
    require(now<_gameStartTime);
    owner = msg.sender;
    result = 0;
    votingOpen = false;
    withdrawalOpen = false;
    // 90%
    threshold = 90000;
    winningPot = 0;
    gameStartTime = _gameStartTime;
    losersPercentage = _losersPercentage;
  }

  /**
  * @dev bet on a team
  * @param team : 1 = home, 2 = draw, 3 = away
  **/
  function bet(uint team) public payable {
    require(team == 1 || team == 2 || team == 3);
    require(now <= gameStartTime);
    require(msg.value > 0);
    if(!hasBet(msg.sender)) betters += 1;
    if(team == 1) {
      bets[msg.sender].homeBets += msg.value;
      homeBets += msg.value;
    } else if (team == 2) {
      bets[msg.sender].drawBets += msg.value;
      drawBets += msg.value;
    } else if (team == 3) {
      bets[msg.sender].awayBets += msg.value;
      awayBets += msg.value;
    }
    totalBets += msg.value;
  }

  function () public payable {
    revert();
  }

  function getHomeBets(address better) public view returns (uint) {
    return bets[better].homeBets;
  }

  function getDrawBets(address better) public view returns (uint) {
    return bets[better].drawBets;
  }

  function getAwayBets(address better) public view returns (uint) {
    return bets[better].awayBets;
  }

  function hasClaimed(address better) public view returns (bool) {
    return bets[better].claimed;
  }

  /**
  * @dev start the voting period
  **/
  function startVoting() public {
    require(votingOpen == false);
    require(withdrawalOpen == false);
    require(now >= gameStartTime + eventDuration);
    votingOpen = true;
    ballot = new BallotThreeOutcomes(threshold);
  }

  function hasBet(address better) public view returns (bool) {
    return (bets[better].homeBets + bets[better].awayBets + bets[better].drawBets) > 0;
  }

  /**
  * @dev voting period has ended ; triggers the opening of the withdrawal if majority has been reached
  **/
  function endVoting() public {
    require(votingOpen);
    result = ballot.closeBallot();
    // ballot ends with success
    if (result == 1 || result == 2 || result == 3) {
      withdrawalOpen = true;
      votingOpen = false;
    } else if (result == 9) {
      votingOpen = false;
      withdrawalOpen = false;
    } else {
      threshold = threshold - 5000;
      ballot = new BallotThreeOutcomes(threshold);
    }
    if(result == 1) winningPot = totalBets.sub(awayBets.add(drawBets).div(100).mul(losersPercentage));
    else if(result == 2) winningPot = totalBets.sub(awayBets.add(homeBets).div(100).mul(losersPercentage));
    else if(result == 3) winningPot = totalBets.sub(homeBets.add(drawBets).div(100).mul(losersPercentage));
  }

  /**
  * @dev calculates how much to send to the oracle to reward score reporters, called once by the oracle
  * @param winner the team that has won
  * @return total ethers sent to the oracle
  **/
  function getLosersPercentage(uint winner) external returns (uint) {
    require(votingOpen);
    require(msg.sender == address(ballot));
    uint total = 0;
    if(winner==1) {
      total = drawBets.add(awayBets).div(100).mul(losersPercentage);
    }
    else if (winner==2) {
      total = homeBets.add(awayBets).div(100).mul(losersPercentage);
    }
    else if (winner==3) {
      total = homeBets.add(drawBets).div(100).mul(losersPercentage);
    }
    address(ballot).transfer(total);
    return total;
  }

  /**
  * @dev if oracle has a 50/50 situation, owner can break it and report the score
  * @param side the team that has won
  **/
  function breakTie(uint side) public {
    require(result == 9);
    require(msg.sender == owner);
    result = side;
    withdrawalOpen = true;
  }

  /**
  * @dev withdraw winnings
  * @param donation optional donation to the owner
  **/
  function getWinnings(uint donation) public {
    require(donation<=100);
    require(withdrawalOpen);
    require(bets[msg.sender].claimed == false);
    uint winnings = 0;
    if (result == 1) winnings = (getHomeBets(msg.sender).mul(winningPot)).div(homeBets);
    else if (result == 2) winnings = (getDrawBets(msg.sender).mul(winningPot)).div(drawBets);
    else if (result == 3) winnings = (getAwayBets(msg.sender).mul(winningPot)).div(awayBets);
    else revert();
    wins[msg.sender] = winnings;
    uint donated = winnings.mul(donation).div(100);
    bets[msg.sender].claimed = true;
    owner.transfer(donated);
    msg.sender.transfer(winnings-donated);
  }

}
