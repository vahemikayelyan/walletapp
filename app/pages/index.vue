<template>
  <div v-if="isConnected" class="flex items-center space-x-2">
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

<script setup lang="ts">
const { disconnectWallet, shortAddress, isConnected, walletType } = useWallet();

const openMetaMask = () => {
  if (typeof window !== "undefined") {
    window.open("https://metamask.app.link/", "_blank");
  }
};
</script>
