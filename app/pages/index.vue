<!-- pages/index.vue -->
<script setup lang="ts">
import { ref } from "vue";

const {
  connectWallet,
  disconnectWallet,
  reselectAccounts,
  switchNetwork,
  chainList,
  chainId,
  address,
  accounts,
  isConnected,
  hasRequested,
} = useWallet();

const wallets = [
  {
    key: "metamask",
    name: "MetaMask",
    desc: "The most popular browser wallet.",
    icon: "/icons/metamask.svg",
    connectable: true,
  },
  {
    key: "walletconnect",
    name: "WalletConnect",
    desc: "Connect 100+ mobile wallets via QR.",
    icon: "/icons/walletconnect.svg",
    connectable: false,
  },
  {
    key: "coinbase",
    name: "Coinbase Wallet",
    desc: "Mobile & extension wallet.",
    icon: "/icons/coinbasewallet.svg",
    connectable: false,
  },
  {
    key: "okx",
    name: "OKX Wallet",
    desc: "Multichain, dApp store.",
    icon: "/icons/okx.svg",
    connectable: false,
  },
];
const activeTab = ref<"send" | "swap" | "bridge" | "receive">("send");

const shortAddress = computed(() => short(address.value));

function short(a?: string | null): string {
  return a ? `${a.slice(0, 7)}...${a.slice(-5)}` : "";
}

function onNetworkChange(e: Event) {
  const id = (e.target as HTMLSelectElement).value;
  switchNetwork(id);
}

function handleConnect(key: string) {
  if (key === "metamask") connectWallet();
}

function copyText(text?: string | null) {
  if (!text) return;
  if (import.meta.client && typeof navigator !== "undefined") {
    navigator.clipboard?.writeText(text);
  }
}
</script>

<template>
  <div v-if="hasRequested" class="text-slate-900">
    <!-- Hero -->
    <section class="mx-auto max-w-6xl px-6 pb-6">
      <h1 class="text-3xl md:text-5xl font-semibold tracking-tight">
        Connect a wallet to get started
      </h1>
      <p class="mt-3 max-w-2xl text-slate-600">
        Pick a wallet you trust. You can disconnect anytime. For now, MetaMask
        is supported.
      </p>
    </section>

    <!-- Wallet cards (disconnected) -->
    <section v-if="!isConnected" class="mx-auto max-w-6xl px-6 pb-24">
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="w in wallets"
          :key="w.key"
          class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div class="flex items-center gap-3">
            <img :src="w.icon" :alt="w.name" class="h-8 w-8" />
            <h3 class="text-lg font-semibold">{{ w.name }}</h3>
          </div>
          <p class="mt-2 text-sm text-slate-600">{{ w.desc }}</p>

          <button
            class="mt-4 inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition ring-1 disabled:opacity-60 disabled:cursor-not-allowed"
            :class="
              w.connectable
                ? 'bg-amber-400 text-slate-900 ring-amber-300 hover:bg-amber-500'
                : 'bg-slate-100 text-slate-500 ring-slate-200'
            "
            :disabled="!w.connectable"
            @click="handleConnect(w.key)"
          >
            {{ w.connectable ? "Connect" : "Coming soon" }}
          </button>
        </article>
      </div>
    </section>

    <!-- Dashboard (connected) -->
    <section v-else class="mx-auto max-w-6xl px-6">
      <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <!-- Top bar -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span
              class="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"
            ></span>
            <span class="font-mono text-sm">{{ shortAddress }}</span>
            <span class="text-xs text-slate-500">MetaMask</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"
              @click="reselectAccounts()"
            >
              Change accounts…
            </button>
            <button
              class="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"
              @click="disconnectWallet()"
            >
              Disconnect
            </button>
          </div>
        </div>

        <!-- Accounts + current address -->
        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <div class="rounded-2xl border p-4">
            <h4 class="text-sm font-semibold text-slate-800">Accounts</h4>
            <div class="mt-2 max-h-56 overflow-auto divide-y">
              <div
                v-for="a in accounts"
                :key="a"
                class="flex items-center justify-between py-2"
              >
                <span class="font-mono text-sm truncate">{{ short(a) }}</span>
                <span v-if="a === address" class="text-xs text-emerald-600"
                  >Current</span
                >
                <button
                  class="rounded-md border px-2 py-1 text-xs hover:bg-slate-50"
                  @click="copyText(a)"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border p-4">
            <h4 class="text-sm font-semibold text-slate-800">Network</h4>
            <div class="mt-2 flex items-center gap-3">
              <div class="relative">
                <select
                  :value="chainId || ''"
                  class="rounded-lg border px-3 py-1.5 text-sm bg-white"
                  @change="onNetworkChange"
                >
                  <option disabled value="">Select…</option>
                  <option v-for="o in chainList" :key="o.id" :value="o.id">
                    {{ o.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Action tabs -->
        <div class="mt-8">
          <div
            class="flex gap-2 rounded-xl bg-slate-100 p-1 text-sm font-medium w-fit"
          >
            <button
              class="rounded-lg px-3 py-1.5"
              :class="activeTab === 'send' ? 'bg-white shadow' : ''"
              @click="activeTab = 'send'"
            >
              Send
            </button>
            <button
              class="rounded-lg px-3 py-1.5"
              :class="activeTab === 'swap' ? 'bg-white shadow' : ''"
              @click="activeTab = 'swap'"
            >
              Swap
            </button>
            <button
              class="rounded-lg px-3 py-1.5"
              :class="activeTab === 'bridge' ? 'bg-white shadow' : ''"
              @click="activeTab = 'bridge'"
            >
              Bridge
            </button>
            <button
              class="rounded-lg px-3 py-1.5"
              :class="activeTab === 'receive' ? 'bg-white shadow' : ''"
              @click="activeTab = 'receive'"
            >
              Receive
            </button>
          </div>

          <div class="mt-4 rounded-2xl border p-4">
            <!-- Send -->
            <div v-if="activeTab === 'send'" class="grid gap-3 md:grid-cols-2">
              <label class="text-sm">
                <span class="block text-slate-600">To address</span>
                <input
                  type="text"
                  class="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="0x…"
                />
              </label>
              <label class="text-sm">
                <span class="block text-slate-600">Amount</span>
                <input
                  type="number"
                  step="any"
                  class="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="0.00"
                />
              </label>
              <button
                class="mt-2 inline-flex w-full md:w-auto items-center justify-center rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-900 ring-1 ring-amber-300 hover:bg-amber-500"
              >
                Send
              </button>
            </div>

            <!-- Swap -->
            <div
              v-else-if="activeTab === 'swap'"
              class="grid gap-3 md:grid-cols-2"
            >
              <label class="text-sm">
                <span class="block text-slate-600">From token</span>
                <input
                  type="text"
                  class="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="e.g., ETH"
                />
              </label>
              <label class="text-sm">
                <span class="block text-slate-600">To token</span>
                <input
                  type="text"
                  class="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="e.g., USDC"
                />
              </label>
              <label class="text-sm md:col-span-2">
                <span class="block text-slate-600">Amount</span>
                <input
                  type="number"
                  step="any"
                  class="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="0.00"
                />
              </label>
              <button
                class="mt-2 inline-flex w-full md:w-auto items-center justify-center rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-900 ring-1 ring-amber-300 hover:bg-amber-500"
              >
                Swap
              </button>
            </div>

            <!-- Bridge -->
            <div
              v-else-if="activeTab === 'bridge'"
              class="grid gap-3 md:grid-cols-2"
            >
              <label class="text-sm">
                <span class="block text-slate-600">From chain</span>
                <input
                  type="text"
                  class="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="e.g., Ethereum"
                />
              </label>
              <label class="text-sm">
                <span class="block text-slate-600">To chain</span>
                <input
                  type="text"
                  class="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="e.g., Polygon"
                />
              </label>
              <label class="text-sm md:col-span-2">
                <span class="block text-slate-600">Amount</span>
                <input
                  type="number"
                  step="any"
                  class="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="0.00"
                />
              </label>
              <button
                class="mt-2 inline-flex w-full md:w-auto items-center justify-center rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-900 ring-1 ring-amber-300 hover:bg-amber-500"
              >
                Bridge
              </button>
            </div>

            <!-- Receive -->
            <div v-else-if="activeTab === 'receive'">
              <p class="text-sm text-slate-600">
                Share your address to receive funds.
              </p>
              <div class="mt-2 flex items-center gap-3">
                <span class="font-mono text-sm truncate">{{ address }}</span>
                <button
                  class="rounded-md border px-2 py-1 text-xs hover:bg-slate-50"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
