import type { MetaMaskInpageProvider } from "@metamask/providers";
import { BrowserProvider } from "ethers";
import { computed, onMounted, ref } from "vue";

// Global reactive state
const provider = ref<BrowserProvider | null>();
const walletType = ref<"evm" | null>();
const address = ref<string | null>();
const isConnecting = ref(false);

const isConnected = computed(() => !!address.value);
const shortAddress = computed(() =>
  address.value
    ? `${address.value.slice(0, 7)}...${address.value.slice(-5)}`
    : null
);

export function useWallet() {
  let handleAccountsChanged: ((...args: unknown[]) => void) | null = null;
  let handleChainChanged: (() => void) | null = null;

  // Initializes provider, signer, and sets address
  const setupProvider = async (ethProvider: MetaMaskInpageProvider) => {
    const browserProvider = new BrowserProvider(ethProvider);
    const signer = await browserProvider.getSigner();
    const userAddress = await signer.getAddress();

    provider.value = browserProvider;
    address.value = userAddress;
  };

  // Attach wallet event listeners
  const attachListeners = (ethProvider: MetaMaskInpageProvider) => {
    if (handleAccountsChanged || handleChainChanged) return;

    handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];

      if (accounts?.length) {
        address.value = accounts[0];
      } else {
        disconnectWallet();
      }
    };

    handleChainChanged = () => {
      window.location.reload();
    };

    ethProvider.on("accountsChanged", handleAccountsChanged);
    ethProvider.on("chainChanged", handleChainChanged);
  };

  // Remove listeners
  const detachListeners = () => {
    const eth = window.ethereum;

    if (!eth) return;

    if (handleAccountsChanged) {
      eth.removeListener("accountsChanged", handleAccountsChanged);
      handleAccountsChanged = null;
    }

    if (handleChainChanged) {
      eth.removeListener("chainChanged", handleChainChanged);
      handleChainChanged = null;
    }
  };

  // Disconnect logic
  const disconnectWallet = async () => {
    address.value = null;
    provider.value = null;
    walletType.value = null;

    detachListeners();

    try {
      await window.ethereum?.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
      console.info("MetaMask permission revoked.");
    } catch (err) {
      console.warn("Revoke permission failed:", err);
    }
  };

  // Connect logic
  const connectWallet = async () => {
    const eth = window.ethereum;

    if (typeof window === "undefined" || !eth) {
      alert("MetaMask is not installed.");
      return;
    }

    if (isConnecting.value || isConnected.value) return;

    isConnecting.value = true;

    try {
      const accounts = (await eth.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts?.length) throw new Error("No accounts returned");

      setupProvider(eth);
      attachListeners(eth);
    } catch (err: any) {
      console.error("[!] Wallet connection failed:", err);

      if (err.code === -32002) {
        alert("MetaMask popup already open. Please respond to it.");
      }
    } finally {
      isConnecting.value = false;
    }
  };

  // Auto-connect on page load
  onMounted(async () => {
    const eth = window.ethereum;

    if (!eth) return;

    try {
      const accounts = (await eth.request({
        method: "eth_accounts",
      })) as string[];

      if (Array.isArray(accounts) && accounts.length > 0) {
        setupProvider(eth);
        attachListeners(eth);
      }
    } catch (err) {
      console.warn("Auto-connect failed:", err);
    }
  });

  return {
    connectWallet,
    disconnectWallet,
    address,
    shortAddress,
    isConnected,
    isConnecting,
    walletType,
    provider,
  };
}

// 🔒 Declare ethereum globally
declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}
