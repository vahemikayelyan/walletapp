<template>
  <div class="flex items-center space-x-4">
    <!-- Connect Button -->
    <button
      v-if="!isConnected && !isConnecting"
      class="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition"
      @click="connectWallet"
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
  </div>
</template>

<script setup lang="ts">
const { connectWallet, isConnected, isConnecting } = useWallet();
</script>
