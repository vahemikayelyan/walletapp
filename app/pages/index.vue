<!-- pages/index.vue — pure viem, driven by CHAIN_MAP -->
<script setup lang="ts">
import {
  erc20Abi,
  getAddress,
  isAddress,
  parseEther,
  parseUnits,
  type Address,
} from "viem";

const {
  walletClient,
  publicClient,

  connectWallet,
  disconnectWallet,
  reselectAccounts,
  switchNetwork,
  fetchBalance,
  waitForTx,

  balance,
  chainList,
  chainId,
  currentChainMeta,
  currentExplorerTxBase,
  address,
  accounts,
  isConnected,
  hasRequested,
} = useWallet();

/* ------------------------------- UI helpers ------------------------------- */
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
  if (id) void switchNetwork(id as any);
}

function handleConnect(key: string) {
  if (key === "metamask") void connectWallet();
}

function copyText(text?: string | null) {
  if (!text) return;
  if (process.client && navigator?.clipboard) {
    navigator.clipboard.writeText(text);
  }
}

/* ------------------------------- Send state -------------------------------- */
const to = ref("");
const amount = ref<string>("");
const token = ref<string>(""); // ERC-20 contract address; empty = native
const sending = ref(false);
const sendError = ref<string | null>(null);
const txHash = ref<`0x${string}` | null>(null);

const explorerUrl = computed(() =>
  txHash.value && currentExplorerTxBase.value
    ? currentExplorerTxBase.value + txHash.value
    : null
);

const balanceDisplay = computed(() => {
  const b = balance.value;
  if (b == null) return "—";
  const n = Number(b);
  if (n > 0 && n < 0.0001) return "<0.0001";
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(n);
});

const canSend = computed(
  () => isConnected.value && !!to.value && !!amount.value
);

/* --------------------------------- Send ------------------------------------ */
// helpers (put near your other refs)
const decimalsCache = new Map<string, number>();

async function postSend(hash: `0x${string}`) {
  txHash.value = hash;
  await waitForTx(hash); // waits for confirmation
  await fetchBalance(); // refresh balance after it's mined
  amount.value = ""; // clear inputs on success
  to.value = "";
}

// optimized onSend
async function onSend() {
  if (sending.value) return; // prevent double clicks

  sendError.value = null;
  txHash.value = null;

  if (!isConnected.value) {
    sendError.value = "Connect a wallet first.";
    return;
  }
  const from = address.value as Address | null;
  if (!from) {
    sendError.value = "No active account.";
    return;
  }

  if (!isAddress(to.value)) {
    sendError.value = "Invalid recipient address.";
    return;
  }

  const rawAmt = String(amount.value ?? "").trim();
  if (!rawAmt || Number(rawAmt) <= 0) {
    sendError.value = "Enter a valid amount.";
    return;
  }

  if (!walletClient.value || !publicClient.value) {
    sendError.value = "Wallet client not ready.";
    return;
  }

  try {
    sending.value = true;
    const recipient = getAddress(to.value);

    if (!token.value) {
      // Native send
      const valueWei = parseEther(rawAmt);
      const hash = await walletClient.value.sendTransaction({
        account: from,
        to: recipient,
        value: valueWei,
      });
      await postSend(hash);
      return;
    }

    // ERC-20 transfer
    if (!isAddress(token.value)) {
      sendError.value = "Invalid ERC-20 token address.";
      return;
    }
    const tokenAddr = getAddress(token.value);

    // decimals (cached)
    let decimals = decimalsCache.get(tokenAddr);
    if (decimals == null) {
      decimals = (await publicClient.value.readContract({
        address: tokenAddr,
        abi: erc20Abi,
        functionName: "decimals",
      })) as number;
      decimalsCache.set(tokenAddr, decimals);
    }

    const qty = parseUnits(rawAmt, decimals);
    const { request } = await publicClient.value.simulateContract({
      account: from,
      address: tokenAddr,
      abi: erc20Abi,
      functionName: "transfer",
      args: [recipient, qty],
    });

    const hash = await walletClient.value.writeContract(request);
    await postSend(hash);
  } catch (e: any) {
    sendError.value = e?.shortMessage ?? e?.message ?? "Failed to send.";
  } finally {
    sending.value = false;
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
          <div class="flex items-center gap-3">
            <span
              class="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"
            ></span>
            <span class="font-mono text-sm">{{ shortAddress }}</span>
            <span class="text-xs text-slate-500">MetaMask</span>
            <span class="text-xs text-slate-500">
              • Balance: {{ balanceDisplay }}
              {{ currentChainMeta?.nativeCurrency.name }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"
              @click="reselectAccounts()"
            >
              Change accounts…
            </button>
            <button
              class="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-300"
              @click="disconnectWallet()"
              aria-label="Disconnect wallet"
            >
              <svg
                viewBox="0 0 24 24"
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
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
                  id="networks"
                  :value="chainId || ''"
                  class="rounded-lg border px-2 py-1.5 bg-white"
                  :disabled="!isConnected"
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
                  v-model="to"
                  type="text"
                  class="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="0x…"
                />
              </label>
              <label class="text-sm">
                <span class="block text-slate-600"
                  >Amount ({{ currentChainMeta?.nativeCurrency.name }}) or token
                  units</span
                >
                <input
                  v-model="amount"
                  type="number"
                  step="any"
                  class="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="0.00"
                />
              </label>
              <label class="text-sm md:col-span-2">
                <span class="block text-slate-600"
                  >ERC-20 token (optional — leave empty for native
                  {{ currentChainMeta?.nativeCurrency.name }})</span
                >
                <input
                  v-model="token"
                  type="text"
                  class="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="ERC-20 contract address"
                />
              </label>

              <div class="md:col-span-2 flex items-center gap-3">
                <button
                  @click="onSend"
                  :disabled="sending || !canSend"
                  class="mt-2 inline-flex items-center justify-center rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-900 ring-1 ring-amber-300 hover:bg-amber-500 disabled:opacity-60"
                >
                  {{ sending ? "Sending…" : "Send" }}
                </button>

                <span v-if="sendError" class="text-sm text-rose-600">{{
                  sendError
                }}</span>
                <a
                  v-if="txHash && explorerUrl"
                  :href="explorerUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-emerald-700 underline"
                  >View tx</a
                >
              </div>
            </div>

            <!-- Swap -->
            <div
              v-else-if="activeTab === 'swap'"
              class="grid gap-3 md:grid-cols-2"
            >
              <p class="text-sm text-slate-600 md:col-span-2">Coming soon…</p>
            </div>

            <!-- Bridge -->
            <div
              v-else-if="activeTab === 'bridge'"
              class="grid gap-3 md:grid-cols-2"
            >
              <p class="text-sm text-slate-600 md:col-span-2">Coming soon…</p>
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
                  @click="copyText(address)"
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
