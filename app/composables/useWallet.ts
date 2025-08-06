// composables/useWallet.ts
import { ethers } from "ethers";
import { computed, ref } from "vue";

const provider = ref<ethers.BrowserProvider | null>(null);
const signer = ref<ethers.JsonRpcSigner | null>(null);
const address = ref<string | null>(null);
const chainId = ref<number | null>(null);
const isConnected = computed(() => !!address.value);

export function useWallet() {
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed");
      return;
    }

    provider.value = new ethers.BrowserProvider(window.ethereum);

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      signer.value = await provider.value.getSigner();
      address.value = accounts[0];
      const network = await provider.value.getNetwork();
      chainId.value = Number(network.chainId);
    } catch (err) {
      console.error("Connection error:", err);
    }
  };

  const disconnectWallet = () => {
    provider.value = null;
    signer.value = null;
    address.value = null;
    chainId.value = null;
  };

  return {
    connectWallet,
    disconnectWallet,
    provider,
    signer,
    address,
    chainId,
    isConnected,
  };
}
