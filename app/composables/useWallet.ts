// composables/useWallet.client.ts
import type { MetaMaskInpageProvider } from "@metamask/providers";
import { BrowserProvider } from "ethers";
import { formatEther, hexToBigInt, type Hex } from "viem";
import { computed, onMounted, ref, shallowRef } from "vue";

/* ----------------------------- Module-level refs ---------------------------- */
const provider = shallowRef<BrowserProvider | null>(null);
const walletType = ref<"evm" | null>(null);
const accounts = ref<string[]>([]);
const address = ref<string | null>(null);
const chainId = ref<string | null>(null); // HEX like "0xaa36a7"
const balance = ref<string | null>(null);
const isConnecting = ref(false);
const hasRequested = ref(false);
const hasAutoRan = ref(false);

/* --------------------------------- Helpers --------------------------------- */
function getEth(): MetaMaskInpageProvider | null {
  return (window as any)?.ethereum ?? null;
}
function hexToDec(hex?: string | null): number | null {
  if (!hex) return null;
  return parseInt(hex, 16);
}

/* --------------------------------- Setup ----------------------------------- */
async function setupProvider(
  eth: MetaMaskInpageProvider,
  initialAccs?: string[]
) {
  // Always recreate provider so it matches the wallet’s current network
  provider.value = new BrowserProvider(eth);
  walletType.value = "evm";

  try {
    chainId.value = (await eth.request({ method: "eth_chainId" })) as string;
  } catch {
    chainId.value = null;
  }

  if (initialAccs?.length) {
    accounts.value = initialAccs;
    address.value = initialAccs[0] ?? null;
  } else {
    const accs = (await eth.request({ method: "eth_accounts" })) as string[];
    accounts.value = accs ?? [];
    address.value = accs?.[0] ?? null;
  }
}

/* -------------------------------- Listeners -------------------------------- */
let onAcc: ((a: string[]) => void) | null = null;
let onChain: ((id: string) => void) | null = null;
let onDisc: ((e: unknown) => void) | null = null;

function attachListeners(eth: MetaMaskInpageProvider) {
  if (onAcc || onChain || onDisc) return;

  onAcc = (a: string[]) => {
    accounts.value = a ?? [];
    address.value = a?.[0] ?? null;
    if (!a?.length) void disconnectWallet();
    else void fetchBalance();
  };

  onChain = (newHexId: string) => {
    // Update chain id, re-init provider (bind to new chain), then fetch balance
    chainId.value = newHexId;
    fetchBalance();
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

const disconnectWallet = async () => {
  detachListeners();
  accounts.value = [];
  address.value = null;
  chainId.value = null;
  walletType.value = null;
  provider.value = null;
  balance.value = null;

  try {
    await getEth()?.request({
      method: "wallet_revokePermissions",
      params: [{ eth_accounts: {} }],
    });
  } catch (e) {
    console.warn("Revoke permission failed:", e);
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
/**
 * Fetch native balance using the wallet’s *current* network via raw JSON-RPC.
 * This avoids the ethers "network changed" race during chain switches.
 */
async function fetchBalance() {
  const eth = getEth();
  if (!eth || !address.value) {
    balance.value = null;
    return;
  }

  const ctxAddr = address.value;
  const ctxChain = chainId.value;

  const once = async () => {
    const hex = (await eth.request({
      method: "eth_getBalance",
      params: [ctxAddr, "latest"],
    })) as Hex;
    if (address.value === ctxAddr && chainId.value === ctxChain) {
      balance.value = formatEther(hexToBigInt(hex));
    }
  };

  // return this so callers can await; retry is now properly chained
  return once().catch(async (e: any) => {
    if (String(e?.message).includes("network changed")) {
      await new Promise((r) => setTimeout(r, 150));
      return once();
    }
    if (address.value === ctxAddr && chainId.value === ctxChain) {
      balance.value = null;
      return;
    }
    console.error("[Wallet] fetchBalance:", e);
  });
}

/* ------------------------------ Networks ----------------------------------- */
async function switchNetwork(chainIdHex: string) {
  const eth = getEth();
  if (!eth) return;
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    // onChain listener will re-init provider & refresh balance
  } catch (e: any) {
    // If chain isn’t added in the wallet
    if (e?.code === 4902 && RAW_CHAINS[chainIdHex]) {
      const c = RAW_CHAINS[chainIdHex];
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: c.name,
            nativeCurrency: c.currency,
            rpcUrls: c.rpc,
            blockExplorerUrls: c.explorers || [],
          },
        ],
      });
    } else {
      throw e;
    }
  }
}

/* ------------------------------- Computeds --------------------------------- */
const isConnected = computed(() => !!address.value);

const chainList = computed(() =>
  Object.entries(RAW_CHAINS)
    .map(([id, c]) => ({ id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
);

const numericChainId = computed(() => hexToDec(chainId.value));
const currentChainMeta = computed(() =>
  chainId.value ? RAW_CHAINS[chainId.value] ?? null : null
);
const nativeSymbol = computed(
  () => currentChainMeta.value?.currency.symbol ?? "ETH"
);
const currentExplorerTxBase = computed(() => {
  const base = currentChainMeta.value?.explorers?.[0];
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

    // state
    provider,
    walletType,
    chainList,
    chainId, // hex (MetaMask)
    numericChainId, // decimal (server)
    currentChainMeta,
    nativeSymbol,
    currentExplorerTxBase,
    accounts,
    address,
    balance,
    isConnected,
    isConnecting,
    hasRequested,
  };
}

/* ------------------------------ Global typing ------------------------------ */
declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}
