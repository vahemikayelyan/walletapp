<template>
  <div v-if="isClient" class="flex items-center space-x-4">
    <!-- Connect Button -->
    <button
      v-if="!isConnected && !isConnecting"
      @click="connectWallet"
      class="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition"
    >
      Connect Wallet
    </button>

    <!-- Connecting Indicator -->
    <button
      v-else-if="isConnecting"
      class="px-4 py-2 rounded bg-gray-500 text-white cursor-not-allowed"
      disabled
    >
      Connecting...
    </button>

    <!-- Connected State -->
    <template v-else>
      <div class="flex items-center space-x-2">
        <span class="text-green-700 font-mono text-sm">
          {{ shortAddress }}
        </span>

        <button
          @click="disconnectWallet"
          class="text-sm text-red-500 hover:underline"
        >
          Disconnect
        </button>

        <span class="text-xs text-gray-500 ml-2">
          Connected via {{ walletType?.toUpperCase() }}
        </span>

        <button
          @click="openMetaMask"
          class="text-sm text-blue-500 hover:underline ml-2"
        >
          Open MetaMask
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useWallet } from "~/composables/useWallet";

const isClient = ref(false);

onMounted(() => {
  isClient.value = true;
});

const openMetaMask = () => {
  if (typeof window !== "undefined") {
    window.open("https://metamask.app.link/", "_blank");
  }
};

const {
  connectWallet,
  disconnectWallet,
  address,
  isConnected,
  isConnecting,
  walletType,
} = useWallet();

const shortAddress = computed(() =>
  address.value
    ? `${address.value.slice(0, 6)}...${address.value.slice(-4)}`
    : ""
);
</script>
