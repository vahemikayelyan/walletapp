// /chains.ts
export type RawChain = {
  name: string;
  rpc: string[];
  explorers?: string[];
  currency: { name: string; symbol: string; decimals: number };
};

// Keys are HEX chainIds because MetaMask uses hex
export const RAW_CHAINS: Record<string, RawChain> = {
  "0x1": {
    name: "Ethereum Mainnet",
    currency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpc: ["https://rpc.ankr.com/eth"],
    explorers: ["https://etherscan.io"],
  },
  "0x2105": {
    name: "Base Mainnet",
    currency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpc: ["https://mainnet.base.org"],
    explorers: ["https://basescan.org"],
  },
  "0xa4b1": {
    name: "Arbitrum One",
    currency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpc: ["https://arb1.arbitrum.io/rpc"],
    explorers: ["https://arbiscan.io"],
  },
  "0x89": {
    name: "Polygon Mainnet",
    currency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    rpc: ["https://polygon-rpc.com"],
    explorers: ["https://polygonscan.com"],
  },
  "0x38": {
    name: "BNB Smart Chain",
    currency: { name: "BNB", symbol: "BNB", decimals: 18 },
    rpc: ["https://bsc-dataseed.binance.org"],
    explorers: ["https://bscscan.com"],
  },
  "0xe708": {
    name: "Linea",
    currency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpc: ["https://rpc.linea.build"],
    explorers: ["https://lineascan.build"],
  },
  "0xaa36a7": {
    name: "Sepolia Testnet",
    currency: { name: "SepoliaETH", symbol: "SepoliaETH", decimals: 18 },
    rpc: ["https://rpc.sepolia.org"],
    explorers: ["https://sepolia.etherscan.io"],
  },
};
