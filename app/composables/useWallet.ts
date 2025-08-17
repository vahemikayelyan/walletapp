// composables/useWallet.client.ts — pure viem, UI powered by CHAIN_MAP
import type { MetaMaskInpageProvider } from "@metamask/providers";
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  hexToBigInt,
  http,
  type Address,
  type Chain,
  type Hex,
} from "viem";
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  linea,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from "viem/chains";
import { computed, onMounted, ref, shallowRef } from "vue";

/* ----------------------------- Chains (UI source of truth) ----------------------------- */
// Hex keys match MetaMask’s chainChanged payloads
export const CHAIN_MAP: Record<Hex, Chain> = {
  "0x1": mainnet,
  "0x2105": base,
  "0xa4b1": arbitrum,
  "0x89": polygon,
  "0x38": bsc,
  "0xe708": linea,
  "0xaa36a7": sepolia,
  "0xa": optimism,
  "0xa86a": avalanche,
};

const pickRpc = (c?: Chain) =>
  c?.rpcUrls?.default?.http?.[0] ?? c?.rpcUrls?.public?.http?.[0];
const pickExplorer = (c?: Chain) => c?.blockExplorers?.default?.url;

/* -------------------------------- State / refs -------------------------------- */
const walletClient = shallowRef<ReturnType<typeof createWalletClient> | null>(
  null
);
const publicClient = shallowRef<ReturnType<typeof createPublicClient> | null>(
  null
);

const accounts = ref<Address[]>([]);
const address = ref<Address | null>(null);
const chainId = ref<Hex | null>(null); // e.g. "0xaa36a7"
const balance = ref<string | null>(null);
const isConnecting = ref(false);
const hasRequested = ref(false);
const hasAutoRan = ref(false);

function getEth(): MetaMaskInpageProvider | null {
  return (window as any)?.ethereum ?? null;
}

function hexToDec(hex?: string | null): number | null {
  if (!hex) return null;
  return parseInt(hex, 16);
}

/* ----------------------------- Clients setup (per-chain) ----------------------------- */
function setClientsFor(chainHex: Hex, eth: MetaMaskInpageProvider) {
  chainId.value = chainHex;
  const chain = CHAIN_MAP[chainHex];
  const rpc = pickRpc(chain);

  walletClient.value = createWalletClient({
    chain, // set a chain: avoids needing `chain` on every call
    transport: custom(eth),
  });

  publicClient.value = createPublicClient({
    chain,
    transport: rpc ? http(rpc) : custom(eth), // fast reads via RPC, fallback to wallet
    batch: { multicall: true },
  });
}

/* --------------------------------- Setup ----------------------------------- */
async function setupProvider(
  eth: MetaMaskInpageProvider,
  initialAccs?: string[]
) {
  try {
    const cid = (await eth.request({ method: "eth_chainId" })) as Hex;
    setClientsFor(cid, eth);
  } catch {
    chainId.value = null;
    walletClient.value = null;
    publicClient.value = null;
  }

  if (initialAccs?.length) {
    accounts.value = initialAccs as Address[];
    address.value = (initialAccs[0] ?? null) as Address | null;
  } else {
    const accs = (await eth.request({ method: "eth_accounts" })) as string[];
    accounts.value = (accs ?? []) as Address[];
    address.value = (accs?.[0] ?? null) as Address | null;
  }
}

/* -------------------------------- Listeners -------------------------------- */
let onAcc: ((a: string[]) => void) | null = null;
let onChain: ((id: string) => void) | null = null;
let onDisc: ((e: unknown) => void) | null = null;

let _fetchScheduled = false;
const scheduleFetch = () => {
  if (_fetchScheduled) return;
  _fetchScheduled = true;
  queueMicrotask(() => {
    _fetchScheduled = false;
    void fetchBalance();
  });
};

function attachListeners(eth: MetaMaskInpageProvider) {
  if (onAcc || onChain || onDisc) return;

  onAcc = (a: string[]) => {
    accounts.value = (a ?? []) as Address[];
    address.value = (a?.[0] ?? null) as Address | null;
    if (!a?.length) void disconnectWallet();
    else scheduleFetch();
  };

  onChain = (newHexId: string) => {
    setClientsFor(newHexId as Hex, eth);
    scheduleFetch();
  };

  onDisc = () => {
    void disconnectWallet();
  };

  eth.on("accountsChanged", onAcc as any);
  eth.on("chainChanged", onChain as any);
  eth.on("disconnect", onDisc as any);
}

function detachListeners() {
  const eth = getEth();
  if (!eth) return;
  if (onAcc) {
    eth.removeListener("accountsChanged", onAcc as any);
    onAcc = null;
  }
  if (onChain) {
    eth.removeListener("chainChanged", onChain as any);
    onChain = null;
  }
  if (onDisc) {
    eth.removeListener("disconnect", onDisc as any);
    onDisc = null;
  }
}

/* --------------------------------- Actions --------------------------------- */
const connectWallet = async () => {
  const eth = getEth();
  if (!eth) {
    alert("MetaMask is not installed.");
    return;
  }
  if (isConnecting.value || !!address.value) return;

  isConnecting.value = true;
  try {
    const accs = (await eth.request({
      method: "eth_requestAccounts",
    })) as string[];
    if (!accs?.length) throw new Error("No accounts returned");
    await setupProvider(eth, accs);
    await fetchBalance();
    attachListeners(eth);
  } catch (err: any) {
    console.error("[Wallet] connect failed:", err);
    if (err?.code === -32002)
      alert("MetaMask popup is already open. Please respond to it.");
  } finally {
    isConnecting.value = false;
    hasRequested.value = true;
  }
};

const disconnectWallet = async (
  opts: { revoke?: boolean } = { revoke: true }
) => {
  detachListeners();
  accounts.value = [];
  address.value = null;
  chainId.value = null;
  balance.value = null;
  walletClient.value = null;
  publicClient.value = null;

  if (opts.revoke) {
    try {
      await getEth()?.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch (e) {
      console.warn("Revoke permission failed:", e);
    }
  }
};

function reselectAccounts() {
  const eth = getEth();
  if (!eth) return;
  eth.request({
    method: "wallet_requestPermissions",
    params: [{ eth_accounts: {} }],
  });
}

/* ------------------------------ Auto-connect ------------------------------- */
const autoConnectOnce = async () => {
  if (hasAutoRan.value) return;
  hasAutoRan.value = true;

  const eth = getEth();
  if (!eth) {
    hasRequested.value = true;
    return;
  }

  try {
    const accs = (await eth.request({ method: "eth_accounts" })) as string[];
    if (accs?.length) {
      await setupProvider(eth, accs);
      await fetchBalance();
      attachListeners(eth);
    }
  } catch (e) {
    console.warn("Auto-connect failed:", e);
  } finally {
    hasRequested.value = true;
  }
};

/* ------------------------------ Balances ----------------------------------- */
let _balReq: Promise<void> | null = null;

async function fetchBalance() {
  if (_balReq) return _balReq;

  const eth = getEth();
  const addr = address.value;
  if (!eth || !addr) {
    balance.value = null;
    return;
  }

  const ctxAddr = addr;
  const ctxChain = chainId.value;

  const once = async () => {
    if (publicClient.value) {
      const wei = await publicClient.value.getBalance({ address: ctxAddr });
      if (address.value === ctxAddr && chainId.value === ctxChain) {
        balance.value = formatEther(wei);
      }
    } else {
      const hex = (await eth.request({
        method: "eth_getBalance",
        params: [ctxAddr, "latest"],
      })) as Hex;
      if (address.value === ctxAddr && chainId.value === ctxChain) {
        balance.value = formatEther(hexToBigInt(hex));
      }
    }
  };

  _balReq = once()
    .catch(async (e: any) => {
      if (String(e?.message).includes("network changed")) {
        await new Promise((r) => setTimeout(r, 150));
        return once();
      }
      console.error("[Wallet] fetchBalance:", e);
      if (address.value === ctxAddr && chainId.value === ctxChain)
        balance.value = null;
    })
    .finally(() => {
      _balReq = null;
    });

  return _balReq;
}

/* ------------------------------ Networks ----------------------------------- */
async function switchNetwork(chainIdHex: Hex) {
  const eth = getEth();
  if (!eth) return;

  const trySwitch = () =>
    eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });

  try {
    await trySwitch();
  } catch (e: any) {
    if (e?.code === 4902 && CHAIN_MAP[chainIdHex]) {
      const c = CHAIN_MAP[chainIdHex];
      const rpcUrls = [
        ...(c.rpcUrls?.default?.http ?? []),
        ...(c.rpcUrls?.public?.http ?? []),
      ];
      const explorer = pickExplorer(c);

      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: c.name,
            nativeCurrency: c.nativeCurrency,
            rpcUrls,
            blockExplorerUrls: explorer ? [explorer] : [],
          },
        ],
      });
      await trySwitch();
    } else if (e?.code === 4001) {
      // user rejected
      return;
    } else {
      throw e;
    }
  }
}

/* ------------------------------- Computeds --------------------------------- */
const isConnected = computed(() => !!address.value);

const chainList = computed(() =>
  Object.entries(CHAIN_MAP)
    .map(([id, c]) => ({ id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
);

const numericChainId = computed(() => hexToDec(chainId.value));
const currentChainMeta = computed(() =>
  chainId.value ? CHAIN_MAP[chainId.value as Hex] ?? null : null
);
const currentExplorerTxBase = computed(() => {
  const base = pickExplorer(currentChainMeta.value || undefined);
  return base ? `${base.replace(/\/+$/, "")}/tx/` : null;
});

/* --------------------------------- Public ---------------------------------- */
export function useWallet() {
  onMounted(() => {
    void autoConnectOnce();
  });

  return {
    // actions
    connectWallet,
    disconnectWallet,
    reselectAccounts,
    switchNetwork,
    fetchBalance,

    // viem clients
    walletClient,
    publicClient,

    // state
    chainList,
    chainId, // hex (MetaMask)
    numericChainId, // decimal convenience
    currentChainMeta,
    currentExplorerTxBase,
    accounts,
    address,
    balance,
    isConnected,
    isConnecting,
    hasRequested,
  };
}
