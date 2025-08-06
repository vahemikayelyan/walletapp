import type { MetaMaskInpageProvider } from "@metamask/providers";
import { BrowserProvider } from "ethers";
import { computed, onMounted, ref } from "vue";

const provider = ref<BrowserProvider | null>(null);
const address = ref<string | null>(null);
const isConnecting = ref(false);
const walletType = ref<"evm" | "solana" | null>(null);

const isConnected = computed(() => !!address.value);

export function useWallet() {
  onMounted(async () => {
    // ✅ Safe client-side logic only
    const savedAddress = localStorage.getItem("wallet_address");
    const savedType = localStorage.getItem("wallet_type") as
      | "evm"
      | "solana"
      | null;

    if (savedAddress) {
      address.value = savedAddress;
      walletType.value = savedType;
    }

    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (Array.isArray(accounts) && accounts.length > 0) {
          const browserProvider = new BrowserProvider(window.ethereum);
          const signer = await browserProvider.getSigner();
          const userAddress = await signer.getAddress();

          address.value = userAddress;
          provider.value = browserProvider;
          walletType.value = "evm";

          localStorage.setItem("wallet_address", userAddress);
          localStorage.setItem("wallet_type", "evm");
        }
      } catch (err) {
        console.warn("Auto-connect failed:", err);
      }

      window.ethereum.on("accountsChanged", (...args: unknown[]) => {
        const accounts = args[0] as string[];
        if (!accounts?.length) {
          disconnectWallet();
          return;
        }
        address.value = accounts[0]!;
        localStorage.setItem("wallet_address", accounts[0]!);
      });

      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }
  });

  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("MetaMask is not installed.");
      return;
    }

    try {
      isConnecting.value = true;

      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });

      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts.length) throw new Error("No accounts returned");

      const browserProvider = new BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      const userAddress = await signer.getAddress();

      address.value = userAddress;
      provider.value = browserProvider;
      walletType.value = "evm";

      localStorage.setItem("wallet_address", userAddress);
      localStorage.setItem("wallet_type", "evm");
    } catch (err) {
      console.error("[!] Wallet connection failed:", err);
    } finally {
      isConnecting.value = false;
    }
  };

  const disconnectWallet = () => {
    address.value = null;
    provider.value = null;
    walletType.value = null;

    localStorage.removeItem("wallet_address");
    localStorage.removeItem("wallet_type");
  };

  return {
    connectWallet,
    disconnectWallet,
    address,
    isConnected,
    isConnecting,
    walletType,
    provider,
  };
}

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}
