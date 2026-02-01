// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract EnergyGovernanceDAO is Ownable {
    struct Proposal {
        string description;
        uint256 yes;
        uint256 no;
        uint256 deadline;
        bool executed;
    }

    Proposal[] public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(uint256 indexed id, string description, uint256 deadline);
    event Voted(uint256 indexed id, address indexed voter, bool support);
    event Executed(uint256 indexed id);

    constructor() Ownable(msg.sender) {}

    function propose(string memory description, uint256 durationSeconds) external onlyOwner {
        require(bytes(description).length > 0, "Empty description");
        require(durationSeconds > 0, "Invalid duration");

        uint256 deadline = block.timestamp + durationSeconds;
        proposals.push(Proposal(description, 0, 0, deadline, false));

        emit ProposalCreated(proposals.length - 1, description, deadline);
    }

    function vote(uint256 proposalId, bool support) external {
        require(proposalId < proposals.length, "Invalid proposal");
        Proposal storage p = proposals[proposalId];

        require(block.timestamp < p.deadline, "Voting closed");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            p.yes += 1;
        } else {
            p.no += 1;
        }

        emit Voted(proposalId, msg.sender, support);
    }

    function execute(uint256 proposalId) external onlyOwner {
        require(proposalId < proposals.length, "Invalid proposal");
        Proposal storage p = proposals[proposalId];

        require(block.timestamp >= p.deadline, "Voting not finished");
        require(!p.executed, "Already executed");

        p.executed = true;
        emit Executed(proposalId);
    }

    function proposalCount() external view returns (uint256) {
        return proposals.length;
    }
}
