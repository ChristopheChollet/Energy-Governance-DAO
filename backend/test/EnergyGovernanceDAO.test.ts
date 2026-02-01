import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("EnergyGovernanceDAO", function () {
  it("creates a proposal and votes", async function () {
    const [owner, voter] = await ethers.getSigners();
    const dao = await ethers.deployContract("EnergyGovernanceDAO");

    await expect(dao.propose("Test proposal", 60))
      .to.emit(dao, "ProposalCreated");

    await expect(dao.connect(voter).vote(0, true))
      .to.emit(dao, "Voted");

    const p = await dao.proposals(0);
    expect(p.yes).to.equal(1n);
  });
});