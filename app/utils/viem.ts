// server/utils/viem.ts
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from "viem/chains";

const pk = process.env.NUXT_FROM_PRIVATE_KEY! as `0x${string}`;
const account = privateKeyToAccount(pk);

// Allowlist of supported chains (decimal IDs) with viem chain objects
export const SUPPORTED_CHAINS: Record<number, any> = {
  1: mainnet,
  11155111: sepolia,
  8453: base,
  137: polygon,
  42161: arbitrum,
  10: optimism,
};

// Map decimal chainId → RPC URL from env (fill what you need)
export function getRpcUrl(chainId: number) {
  const byId: Record<number, string | undefined> = {
    1: process.env.NUXT_RPC_URL_1,
    11155111: process.env.NUXT_RPC_URL_11155111,
    8453: process.env.NUXT_RPC_URL_8453,
    137: process.env.NUXT_RPC_URL_137,
    42161: process.env.NUXT_RPC_URL_42161,
    10: process.env.NUXT_RPC_URL_10,
  };
  const url = byId[chainId];
  if (!url) throw new Error(`Missing RPC URL for chainId ${chainId}`);
  return url;
}

export function makeClients(chainId: number) {
  const chain = SUPPORTED_CHAINS[chainId];
  if (!chain) throw new Error(`Unsupported chainId ${chainId}`);
  const rpc = getRpcUrl(chainId);

  const publicClient = createPublicClient({ chain, transport: http(rpc) });
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpc),
  });
  return { publicClient, walletClient, chain };
}
