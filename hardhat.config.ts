import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";
import "hardhat-contract-sizer";
import "hardhat-gas-reporter";
import "solidity-coverage";

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
    },
  },
  mocha: {
    timeout: 100000,
  },
  solidity: {
    compilers: [{ version: "0.8.17" }, { version: "0.8.14" }],
    settings: {
      optimizer: {
        enabled: false,
        runs: 100,
      },
    },
  },
  contractSizer: {
    runOnCompile: true,
  },
  gasReporter: {
    enabled: true,
  },
};

export default config;
