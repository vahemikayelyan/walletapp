<template>
  <!-- Skip link for a11y -->
  <a
    href="#main"
    class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow"
  >
    Skip to content
  </a>

  <header
    v-if="hasRequestedWallet"
    class="shadow-sm sticky top-0 z-50 border-b border-gray-300/90 bg-white backdrop-blur"
  >
    <nav class="container mx-auto px-4">
      <div class="flex h-16 items-center justify-between">
        <!-- Brand -->
        <NuxtLink to="/" class="group inline-flex items-center gap-2">
          <!-- Logo (inline SVG so no deps) -->
          <svg
            class="h-6 w-6 transition-transform group-hover:rotate-6"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 3l9 6-9 12L3 9l9-6z" class="fill-gray-900" />
          </svg>
          <span class="text-base font-semibold tracking-tight text-gray-900">
            YourBrand
          </span>
        </NuxtLink>

        <!-- Desktop nav -->
        <div class="flex items-center gap-6">
          <div class="hidden items-center gap-6 md:flex">
            <NuxtLink
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              class="relative inline-flex items-center text-sm transition text-gray-600 hover:text-gray-900"
              active-class="text-gray-900"
            >
              <span class="p-1">
                {{ link.label }}
                <span
                  :class="[
                    'absolute left-1 right-1 -bottom-0.5 h-px transition-all',
                    isActive(link.to)
                      ? 'bg-gray-900 w-[calc(100%-0.5rem)]'
                      : 'bg-transparent group-hover:w-full',
                  ]"
                />
              </span>
            </NuxtLink>
          </div>

          <!-- ConnectWallet: button -->
          <ConnectWallet />

          <!-- Mobile: menu button -->
          <button
            class="inline-flex transition border border-gray-300 items-center justify-center rounded-md p-2 outline-none ring-1 ring-transparent hover:bg-gray-100 focus-visible:ring-gray-300 md:hidden"
            :aria-expanded="open ? 'true' : 'false'"
            aria-controls="mobile-menu"
            aria-label="Toggle navigation"
            @click="open = !open"
          >
            <svg
              v-if="!open"
              viewBox="0 0 24 24"
              class="h-6 w-6"
              aria-hidden="true"
            >
              <path
                d="M4 7h16M4 12h16M4 17h16"
                class="stroke-gray-900"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
            <svg v-else viewBox="0 0 24 24" class="h-6 w-6" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                class="stroke-gray-900"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </nav>

    <!-- Mobile panel -->
    <div v-show="open" id="mobile-menu" class="md:hidden">
      <div class="container mx-auto px-4 pb-4">
        <div
          class="space-y-1 rounded-lg border border-gray-200/70 bg-white/95 p-2 shadow-sm"
        >
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="block transition rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            active-class="bg-gray-100 text-gray-900"
            @click="open = false"
          >
            {{ link.label }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const { hasRequestedWallet } = useWallet();
const links = [
  { label: "Home", to: "/" },
  { label: "Cryptos", to: "/cryptos" },
  { label: "About", to: "/about" },
  { label: "Docs", to: "/docs" },
];

const open = ref(false);
const route = useRoute();

const isActive = (to: string) => {
  return route.path === to || route.path.startsWith(`${to}/`);
};
</script>
