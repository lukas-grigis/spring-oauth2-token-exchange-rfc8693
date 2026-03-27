<script lang="ts" setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const auth = useAuth();
const router = useRouter();

onMounted(async () => {
  if (!auth.isInitialized.value) {
    await auth.init();
  }
  if (auth.isAuthenticated.value) {
    router.push('/dashboard');
  }
});
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center relative overflow-hidden"
    style="background: radial-gradient(ellipse at 50% 110%, #022c22 0%, #0c0c0f 55%)"
  >
    <!-- Ambient jade glows -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        class="absolute top-1/3 left-1/3 w-80 h-80 rounded-full blur-[100px] opacity-20"
        style="background: #10b981; animation: jade-pulse 5s ease-in-out infinite"
      />
      <div
        class="absolute bottom-1/4 right-1/4 w-60 h-60 rounded-full blur-[90px] opacity-15"
        style="background: #059669; animation: jade-pulse 7s ease-in-out infinite 2s"
      />
      <!-- Subtle scan line -->
      <div
        class="absolute left-0 right-0 h-px opacity-[0.03]"
        style="
          background: linear-gradient(90deg, transparent, #34d399, transparent);
          animation: scan-line 8s linear infinite;
        "
      />
    </div>

    <!-- Card -->
    <div class="relative z-10 w-full max-w-sm mx-4" style="animation: float-up 0.5s ease-out">
      <div
        class="rounded-2xl p-8 border border-void-800/70 backdrop-blur-xl"
        style="background: linear-gradient(160deg, rgba(25, 26, 31, 0.95), rgba(12, 12, 15, 0.98))"
      >
        <!-- Vue V-Chevron -->
        <div class="flex justify-center mb-8" style="animation: v-breathe 3s ease-in-out infinite">
          <svg fill="none" height="60" viewBox="0 0 261 226" width="68" xmlns="http://www.w3.org/2000/svg">
            <path d="M161.1 0.4H201.9L130.5 225.2L59.1 0.4H99.9L130.5 151.2L161.1 0.4Z" fill="url(#vue-outer)" />
            <path d="M0 0.4H59.1L130.5 151.2L201.9 0.4H261L130.5 225.2L0 0.4Z" fill="url(#vue-inner)" opacity="0.5" />
            <defs>
              <linearGradient id="vue-outer" gradientUnits="userSpaceOnUse" x1="130.5" x2="130.5" y1="0" y2="226">
                <stop stop-color="#34d399" />
                <stop offset="1" stop-color="#047857" />
              </linearGradient>
              <linearGradient id="vue-inner" gradientUnits="userSpaceOnUse" x1="130.5" x2="130.5" y1="0" y2="226">
                <stop stop-color="#6ee7b7" />
                <stop offset="1" stop-color="#064e3b" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <!-- Title -->
        <h1 class="text-center text-2xl font-bold tracking-tight text-void-50 mb-1">Token Exchange</h1>
        <p class="text-center text-sm text-void-400 mb-1 font-mono">RFC 8693</p>
        <p class="text-center text-xs text-void-500 mb-8">Vue Demo</p>

        <!-- Login button -->
        <button
          class="w-full py-3.5 px-6 rounded-xl font-semibold text-white text-sm cursor-pointer transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:scale-[1.02] active:scale-[0.98]"
          style="
            background: linear-gradient(135deg, #10b981, #047857);
            box-shadow:
              0 4px 20px rgba(5, 150, 105, 0.25),
              inset 0 1px 0 rgba(255, 255, 255, 0.08);
          "
          @click="auth.login()"
        >
          Login with Keycloak
        </button>

        <!-- Decorative -->
        <div class="mt-8 flex items-center gap-3">
          <div class="flex-1 h-px bg-gradient-to-r from-transparent via-void-700 to-transparent" />
          <span class="text-[10px] text-void-600 font-mono uppercase tracking-widest">OAuth 2.0</span>
          <div class="flex-1 h-px bg-gradient-to-r from-transparent via-void-700 to-transparent" />
        </div>
      </div>
    </div>
  </div>
</template>
