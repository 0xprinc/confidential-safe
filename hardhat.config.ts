import "@nomicfoundation/hardhat-toolbox";
import { config as dotenvConfig } from "dotenv";
import "hardhat-deploy";
import type { HardhatUserConfig } from "hardhat/config";
import type { NetworkUserConfig } from "hardhat/types";
import { resolve } from "path";

import "./plugins/crossdeploy";
import { networks } from "./plugins/crossdeploy/networks";

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || "./.env";
dotenvConfig({ path: resolve(__dirname, dotenvConfigPath) });

// Ensure that we have all the environment variables we need.
const mnemonic: string | undefined = process.env.MNEMONIC;
if (!mnemonic) {
  throw new Error("Please set your MNEMONIC in a .env file");
}

const chainIds = {
  local: 9090,
  inco: networks.inco.chainId,
  baseSepolia: networks.baseSepolia.chainId,
  edgeless: networks.edgeless.chainId,
  redstone: networks.redstone.chainId,
  sepolia: networks.sepolia.chainId,
};

function getChainConfig(chain: keyof typeof chainIds): NetworkUserConfig {
  let jsonRpcUrl: string;
  switch (chain) {
    case "local":
      jsonRpcUrl = "http://localhost:8545";
      break;

    case "inco":
      jsonRpcUrl = networks.inco.rpcUrl;
      break;
    case "baseSepolia":
      jsonRpcUrl = networks.baseSepolia.rpcUrl;
      break;
    case "edgeless":
      jsonRpcUrl = networks.edgeless.rpcUrl;
      break;
    case "redstone":
      jsonRpcUrl = networks.redstone.rpcUrl;
      break;
    case "sepolia":
      jsonRpcUrl = networks.sepolia.rpcUrl;
      break;
  }
  return {
    accounts: {
      count: 10,
      mnemonic,
      path: "m/44'/60'/0'/0",
    },
    chainId: chainIds[chain],
    url: jsonRpcUrl,
  };
}

const config: HardhatUserConfig = {
  defaultNetwork: "local",
  namedAccounts: {
    deployer: 0,
  },
  mocha: {
    timeout: 180000,
  },
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
    src: "./contracts",
  },
  networks: {
    inco: getChainConfig("inco"),
    baseSepolia: getChainConfig("baseSepolia"),
    edgeless: getChainConfig("edgeless"),
    redstone: getChainConfig("redstone"),
    local: getChainConfig("local"),
    sepolia: getChainConfig("sepolia"),
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.20",
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/hardhat-template/issues/31
        bytecodeHash: "none",
      },
      // Disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 300,
      },
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
  crossdeploy: {
    contracts: [
      "IncoContract",
      "TargetContract",
      "Space",
      "VanillaAuthenticator",
      "VanillaProposalValidationStrategy",
      "VanillaVotingStrategy",
      "VanillaExecutionStrategy",
    ],
    signer: process.env.PRIVATE_KEY || "",
  },
};

export default config;

// redstone
