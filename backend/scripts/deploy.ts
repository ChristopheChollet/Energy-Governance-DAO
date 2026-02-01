import { network } from "hardhat";

const { ethers } = await network.connect();

const dao = await ethers.deployContract("EnergyGovernanceDAO");
await dao.waitForDeployment();

console.log("EnergyGovernanceDAO deployed to:", await dao.getAddress());
