/* eslint-disable @typescript-eslint/no-explicit-any */
import { extendConfig, subtask, task } from "hardhat/config";
import { crossdeployConfigExtender } from "./config";
import { networks, Network } from "./networks";
import {
  PLUGIN_NAME,
  TASK_VERIFY_SUPPORTED_NETWORKS,
  TASK_VERIFY_SIGNER,
  TASK_VERIFY_CONTRACT,
  TASK_VERIFY_GASLIMIT,
} from "./constants";
import "./type-extensions";
import { InitializeCalldataStruct, StrategyStruct } from "../../types/contracts/target/Space";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import "@nomicfoundation/hardhat-ethers";

import { expect } from "chai";
// import { ethers } from "hardhat";
import { createInstances } from "./instance";
import { getSigners } from "./signers";
import { createTransaction } from "./utils";
import fhevmjs, { FhevmInstance } from "fhevmjs";

import { AbiCoder } from "ethers";

import axios from 'axios';

extendConfig(crossdeployConfigExtender);

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function postToken(ciphertext: string): Promise<void> {
  const data = {
      ciphertext: ciphertext
  };

  try {
      const response = await axios.post('https://hyperlane-ccip.vercel.app/token', data, {
          headers: {
              'Content-Type': 'application/json'
          }
      });
      console.log(response.data);
  } catch (error) {
      console.error(error);
  }
}


task(
  "crossdeploy",
  "Deploys the contract across all predefined networks",
).setAction(async (_, hre) => {
  await hre.run(TASK_VERIFY_SUPPORTED_NETWORKS);
  await hre.run(TASK_VERIFY_SIGNER);
  await hre.run(TASK_VERIFY_CONTRACT);
  await hre.run(TASK_VERIFY_GASLIMIT);

  await hre.run("compile");

  if (hre.config.crossdeploy.contracts) {
    const providers: any[] = [];
    const wallets: any[] = [];
    const signers: any[] = [];
   
    // console.info("Deploying to:", hre.network.name);

    const incoNetwork: Network = networks["inco"] as Network;
    const targetNetwork: Network = networks["sepolia"] as Network;
    const nets = [incoNetwork, targetNetwork];
    
    [0, 1].map((i) => {
      providers[i] = new hre.ethers.JsonRpcProvider(
        nets[i].rpcUrl,
      );
      wallets[i] = new hre.ethers.Wallet(
        hre.config.crossdeploy.signer,
        providers[i],
      );
      signers[i] = wallets[i].connect(providers[i]);
    });

    // console.log("signers array -> " + signers[0].address);

    const IncoContract = await hre.ethers.getContractFactory(
      hre.config.crossdeploy.contracts[0],
    );
    const TargetContract = await hre.ethers.getContractFactory(
      hre.config.crossdeploy.contracts[1],
    );
    const Space = await hre.ethers.getContractFactory(
      hre.config.crossdeploy.contracts[2],
    );
    const VanillaAuthenticator = await hre.ethers.getContractFactory(
      hre.config.crossdeploy.contracts[3],
    );
    const VanillaProposalValidationStrategy = await hre.ethers.getContractFactory(
      hre.config.crossdeploy.contracts[4],
    );
    const VanillaVotingStrategy = await hre.ethers.getContractFactory(
      hre.config.crossdeploy.contracts[5],
    );
    const VanillaExecutionStrategy = await hre.ethers.getContractFactory(
      hre.config.crossdeploy.contracts[6],
    );

    // let defaultSigners = await hre.ethers.getSigners();
    // console.log("default signers -> " + await defaultSigners[0]);

    try {

      console.info("\n 1) Deploying contracts on sepolia...");

      const targetContractInstance: any = await TargetContract.connect(signers[1]).deploy();
      const targetContractAddr = await targetContractInstance.getAddress();
      await targetContractInstance.waitForDeployment();
      console.info("TargetContract -> ", targetContractAddr);

      const VanillaProposalValidationStrategyInstance: any = await VanillaProposalValidationStrategy.connect(signers[1]).deploy();
      const VanillaProposalValidationStrategyAddr = await VanillaProposalValidationStrategyInstance.getAddress();
      await VanillaProposalValidationStrategyInstance.waitForDeployment();
      console.info("VanillaProposalValidationStrategy -> ", VanillaProposalValidationStrategyAddr);

      const VanillaVotingStrategyInstance: any = await VanillaVotingStrategy.connect(signers[1]).deploy();
      const VanillaVotingStrategyAddr = await VanillaVotingStrategyInstance.getAddress();
      await VanillaVotingStrategyInstance.waitForDeployment();
      console.info("VanillaVotingStrategy -> ", VanillaVotingStrategyAddr);

      const SpaceInstance: any = await Space.connect(signers[1]).deploy();
      const SpaceAddr = await SpaceInstance.getAddress();
      await SpaceInstance.waitForDeployment();
      console.info("Space -> ", SpaceAddr);

      const VanillaAuthenticatorInstance: any = await VanillaAuthenticator.connect(signers[1]).deploy();
      const VanillaAuthenticatorAddr = await VanillaAuthenticatorInstance.getAddress();
      await VanillaAuthenticatorInstance.waitForDeployment();
      console.info("VanillaAuthenticator -> ", VanillaAuthenticatorAddr);


      console.info("\n 2) Deploying contracts on Inco...");
      
      const incoContractInstance: any = await IncoContract.connect(signers[0]).deploy();
      const incoContractAddr = await incoContractInstance.getAddress();
      await incoContractInstance.waitForDeployment();
      console.info("IncoContract -> ", incoContractAddr);

      let defaultsigners = await getSigners(hre.ethers);
      // console.log("default signers -> " + defaultsigners.alice.address);
      let fhevmInstance = await createInstances(incoContractAddr, hre.ethers, defaultsigners);

      const VanillaExecutionStrategyInstance: any = await VanillaExecutionStrategy.connect(signers[0]).deploy(signers[0].address, 1);   // random address as the address is of no use during testing
      const VanillaExecutionStrategyAddr = await VanillaExecutionStrategyInstance.getAddress();
      await VanillaExecutionStrategyInstance.waitForDeployment();
      console.info("VanillaExecutionStrategy -> ", VanillaExecutionStrategyAddr);

    {
        console.log("\n 3) Initializing Space contract \n");
        
        let data0 : StrategyStruct = {
          addr: VanillaProposalValidationStrategyAddr,
          params: "0x"
        }
    
        let data1 : StrategyStruct = {
          addr: VanillaVotingStrategyInstance,
          params: "0x"
        }
    
    
        let data : InitializeCalldataStruct = {
          owner: signers[1].address, // Example address
          votingDelay: 0,
          minVotingDuration: 0,
          maxVotingDuration: 1000,
          proposalValidationStrategy: data0,
          proposalValidationStrategyMetadataURI: "proposalValidationStrategyMetadataURI",
          daoURI: "SOC Test DAO",
          metadataURI: "SOC Test Space",
          votingStrategies: [data1],
          votingStrategyMetadataURIs: ["votingStrategyMetadataURIs"],
          authenticators: [VanillaAuthenticatorAddr],
          _targetEndpoint: targetContractAddr
        };
        // console.log("owner before initialize: " + await contractSpace.owner());
        try {
          const txn = await SpaceInstance.initialize(data);
          console.log("Transaction hash:", txn.hash);
        
          // Wait for 1 confirmation (adjust confirmations as needed)
          await txn.wait(1);
          console.log("Transaction successful!");
        } catch (error) {
          console.error("Transaction failed:", error);
          // Handle the error appropriately (e.g., retry, notify user)
        }
    
    }

  {
      console.log("\n 4) Making a proposal \n");
  
      let data2propose =
        [
          signers[1].address,
          "",
          [
            VanillaExecutionStrategyAddr, "0x"
          ],
          "0x",
        ];

      let codedPropose = AbiCoder.defaultAbiCoder().encode(["address", "string", "tuple(address, bytes)", "bytes"], data2propose);

      try {
        const txn = await VanillaAuthenticatorInstance.authenticate(SpaceAddr, '0xaad83f3b', codedPropose);
        console.log("Transaction hash:", txn.hash);
  
        // Wait for 1 confirmation (adjust confirmations as needed)
        await txn.wait(1);
        console.log("Transaction2 successful!");
      } catch (error) {
        console.error("Transaction failed:", error);
        // Handle the error appropriately (e.g., retry, notify user)
      }
      
      // console.log("new proposal -> " + await SpaceInstance.proposals(1));

      let codedProposal = AbiCoder.defaultAbiCoder().encode(["address", "uint32", "address", "uint32", "uint32", "uint8", "bytes32", "uint256"], await SpaceInstance.proposals(1));
      // console.log("coded proposal - " + codedProposal);
      // console.log("hash  of proposal - " + hre.ethers.keccak256(codedProposal));
      postToken(codedProposal);
  
  }

  {
    console.log("\n 5) Initializing incoEndpoint and targetEndpoint \n");
    try {
      const txn = await incoContractInstance.initialize(targetContractAddr);
      console.log("Transaction hash:", txn.hash);
    
      // Wait for 1 confirmation (adjust confirmations as needed)
      await txn.wait(1);
      console.log("inco endpoint initization successful!");
    } catch (error) {
      console.error("Transaction failed:", error);
      // Handle the error appropriately (e.g., retry, notify user)
    }

    try {
      const txn = await targetContractInstance.initialize(incoContractAddr);
      console.log("Transaction hash:", txn.hash);
    
      // Wait for 1 confirmation (adjust confirmations as needed)
      await txn.wait(1);
      console.log("target endpoint initialization successful!");
    } catch (error) {
      console.error("Transaction failed:", error);
      // Handle the error appropriately (e.g., retry, notify user)
    }

  }

  {
    console.log("\n 6) Voting \n");

    const eAbstain = fhevmInstance.alice.encrypt8(2);
    const eFor1 = fhevmInstance.alice.encrypt8(1);
    const eFor2 = fhevmInstance.alice.encrypt8(1);
    const eAgainst = fhevmInstance.alice.encrypt8(0);

    const bytesAbstain = AbiCoder.defaultAbiCoder().encode(["bytes"], [eAbstain]);
    const bytesFor1 = AbiCoder.defaultAbiCoder().encode(["bytes"], [eFor1]);
    const bytesFor2 = AbiCoder.defaultAbiCoder().encode(["bytes"], [eFor2]);
    const bytesAgainst = AbiCoder.defaultAbiCoder().encode(["bytes"], [eAgainst]);

    let paddedBytesAbstain : string = "0x" + bytesAbstain.slice(130, 33146);
    let paddedBytesFor1 : string = "0x" + bytesFor1.slice(130, 33146);
    let paddedBytesFor2 : string = "0x" + bytesFor2.slice(130, 33146);
    let paddedBytesAgainst : string = "0x" + bytesAgainst.slice(130, 33146);

    postToken(paddedBytesAbstain);
    postToken(paddedBytesFor1);
    postToken(paddedBytesFor2);
    postToken(paddedBytesAgainst);


    let defaultSigners = await hre.ethers.getSigners();
    // console.log("default signers -> " + await defaultSigners[0].address);

    let data2voteAbstain = [
      await defaultSigners[0].address,
      1,
      eAbstain,
      [[0,"0x"]],
      ""
    ];

    let data2voteFor1 = [
      await defaultSigners[1].address,
      1,
      eFor1,
      [[0,"0x"]],
      ""
    ];
    let data2voteFor2 = [
      await defaultSigners[2].address,
      1,
      eFor2,
      [[0,"0x"]],
      ""
    ];

    let data2voteAgainst = [
      await defaultSigners[3].address,
      1,
      eAgainst,
      // "0xdead",
      [[0,"0x"]],
      ""
    ];

    try {
      const txn = await VanillaAuthenticatorInstance.authenticate(SpaceAddr, '0x954ee6da', AbiCoder.defaultAbiCoder().encode(["address", "uint256", "bytes", "tuple(uint8, bytes)[]", "string"], data2voteAgainst), {value : 1000000000});
      console.log("Transaction hash:", txn.hash);

      // Wait for 1 confirmation (adjust confirmations as needed)
      await txn.wait(1);
      console.log("Against successful!");
    } catch (error) {
      console.error("Transaction failed:", error);
      // Handle the error appropriately (e.g., retry, notify user)
    }
    try {
      const txn = await VanillaAuthenticatorInstance.authenticate(SpaceAddr, '0x954ee6da', AbiCoder.defaultAbiCoder().encode(["address", "uint256", "bytes", "tuple(uint8, bytes)[]", "string"], data2voteFor1), {value : 1000000000});
      console.log("Transaction hash:", txn.hash);

      // Wait for 1 confirmation (adjust confirmations as needed)
      await txn.wait(1);
      console.log("For1 successful!");
    } catch (error) {
      console.error("Transaction failed:", error);
      // Handle the error appropriately (e.g., retry, notify user)
    }
    try {
      const txn = await VanillaAuthenticatorInstance.authenticate(SpaceAddr, '0x954ee6da', AbiCoder.defaultAbiCoder().encode(["address", "uint256", "bytes", "tuple(uint8, bytes)[]", "string"], data2voteFor2), {value : 1000000000});
      console.log("Transaction hash:", txn.hash);

      // Wait for 1 confirmation (adjust confirmations as needed)
      await txn.wait(1);
      console.log("For2 successful!");
    } catch (error) {
      console.error("Transaction failed:", error);
      // Handle the error appropriately (e.g., retry, notify user)
    }
    try {
      const txn = await VanillaAuthenticatorInstance.authenticate(SpaceAddr, '0x954ee6da', AbiCoder.defaultAbiCoder().encode(["address", "uint256", "bytes", "tuple(uint8, bytes)[]", "string"], data2voteAbstain), {value : 1000000000});
      console.log("Transaction hash:", txn.hash);

      // Wait for 1 confirmation (adjust confirmations as needed)
      await txn.wait(1);
      console.log("Abstain successful!");
    } catch (error) {
      console.error("Transaction failed:", error);
      // Handle the error appropriately (e.g., retry, notify user)
    }

    const token = fhevmInstance.alice.getPublicKey(incoContractAddr) || {
      signature: "",
      publicKey: "",
    };

        console.log("waiting for 50 seconds");
        await delay(20000);
        await delay(20000);
        await delay(10000);
      
        console.log(" 7) Looking at the votes ")

        let For_votes = (await incoContractInstance.getVotePower(1, 1, token.publicKey)).toString();
        let Abstain_votes = (await incoContractInstance.getVotePower(1, 2, token.publicKey)).toString();
        let Against_votes = (await incoContractInstance.getVotePower(1, 0, token.publicKey)).toString();
        
        console.log("For votes -> " +     fhevmInstance.alice.decrypt(incoContractAddr, For_votes));
        console.log("Abstain votes -> " + fhevmInstance.alice.decrypt(incoContractAddr, Abstain_votes));
        console.log("Against votes -> " + fhevmInstance.alice.decrypt(incoContractAddr, Against_votes));



    {
      console.log("\n 8) Execution \n");
      let executionPayload = "0x";
      try {
        const txn = await SpaceInstance.execute(1, executionPayload);
        console.log("Transaction hash:", txn.hash);
  
        // Wait for 1 confirmation (adjust confirmations as needed)
        await txn.wait(1);
        console.log("execution successful!");
      } catch (error) {
        console.error("Transaction failed:", error);
        // Handle the error appropriately (e.g., retry, notify user)
      }
    }

    console.log("9) Checking for execution status");

    console.log("waiting for 40 seconds");
    await delay(40000);
    // console.log("last proposal - " + await incoContractInstance.latestProposalData());
    console.log("isExecuted - " + await incoContractInstance.getIsExecuted(1));

}


    } catch (err) {
      console.error(err);
    }

  }
});


subtask(TASK_VERIFY_SUPPORTED_NETWORKS).setAction(async (_, hre) => {
  if (
    !Object.keys(networks).includes(hre.network.name) ||
    hre.network.name === "inco"
  ) {
    throw new NomicLabsHardhatPluginError(
      PLUGIN_NAME,
      `The network you are trying to deploy to is not supported by this plugin.
      The currently supported networks are ${Object.keys(networks).filter(n => n !== "inco")}.`,
    );
  }
});

subtask(TASK_VERIFY_SIGNER).setAction(async (_, hre) => {
  if (!hre.config.crossdeploy.signer || hre.config.crossdeploy.signer === "") {
    throw new NomicLabsHardhatPluginError(
      PLUGIN_NAME,
      `Please provide a signer private key. We recommend using Hardhat configuration variables.
      See https://hardhat.org/hardhat-runner/docs/guides/configuration-variables.
      E.g.: { [...], crossdeploy: { signer: vars.get("PRIVATE_KEY", "") }, [...] }.`,
    );
  }
});

subtask(TASK_VERIFY_CONTRACT).setAction(async (_, hre) => {
  if (!hre.config.crossdeploy.contracts) {
    throw new NomicLabsHardhatPluginError(
      PLUGIN_NAME,
      `Please specify a pair of contract names to be deployed.
      E.g.: { [...], crossdeploy: { contracts: ["WERC20", "ERC20"] }, [...] }.`,
    );
  }
});

subtask(TASK_VERIFY_GASLIMIT).setAction(async (_, hre) => {
  if (
    hre.config.crossdeploy.gasLimit &&
    hre.config.crossdeploy.gasLimit > 15 * 10 ** 6
  ) {
    throw new NomicLabsHardhatPluginError(
      PLUGIN_NAME,
      `Please specify a lower gasLimit. Each block has currently 
      a target size of 15 million gas.`,
    );
  }
});
