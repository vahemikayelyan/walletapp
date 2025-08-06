<template>
  <div class="flex items-center gap-4">
    <button
      v-if="!isConnected"
      @click="connectWallet"
      class="px-4 py-2 bg-blue-600 text-white rounded"
    >
      Connect Wallet
    </button>

    <div v-else class="flex items-center gap-2">
      <span class="text-sm font-mono text-gray-700">
        {{ shortAddress }}
      </span>
      <button @click="disconnectWallet" class="text-sm text-red-500 underline">
        Disconnect
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWallet } from "~/composables/useWallet";

const { connectWallet, disconnectWallet, address, isConnected } = useWallet();

const shortAddress = computed(() =>
  address.value
    ? `${address.value.slice(0, 6)}...${address.value.slice(-4)}`
    : ""
);
</script>
