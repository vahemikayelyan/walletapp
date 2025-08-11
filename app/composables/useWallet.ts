// composables/useWallet.client.ts
import type { MetaMaskInpageProvider } from "@metamask/providers";
import { BrowserProvider } from "ethers";
import { computed, onMounted, ref, shallowRef } from "vue";

/* ----------------------------- Module-level refs ---------------------------- */
const provider = shallowRef<BrowserProvider | null>(null);
const walletType = ref<"evm" | null>(null);
const accounts = ref<string[]>([]);
const address = ref<string | null>(null);
const chainId = ref<string | null>(null);
const isConnecting = ref(false);
const hasRequested = ref(false); // true after first eth_accounts check
const hasAutoRan = ref(false); // ensure autoConnect runs once per page load

/* --------------------------------- Helpers --------------------------------- */
function getEth(): MetaMaskInpageProvider | null {
  return (window as any)?.ethereum ?? null;
}

async function setupProvider(
  eth: MetaMaskInpageProvider,
  initialAccs?: string[]
) {
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
  };
  onChain = () => window.location.reload();
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
      attachListeners(eth);
    }
  } catch (e) {
    console.warn("Auto-connect failed:", e);
  } finally {
    hasRequested.value = true;
  }
};

/* --------------------------------- Public ---------------------------------- */
export function useWallet() {
  onMounted(() => {
    void autoConnectOnce();
  });

  const isConnected = computed(() => !!address.value);
  const shortAddress = computed(() =>
    address.value
      ? `${address.value.slice(0, 7)}...${address.value.slice(-5)}`
      : null
  );

  return {
    // actions
    connectWallet,
    disconnectWallet,
    reselectAccounts,

    // state
    provider,
    walletType,
    chainId,
    accounts,
    address,
    isConnecting,
    hasRequested,
    isConnected,
    shortAddress,
  };
}

/* ------------------------------ Global typing ------------------------------ */
declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}
