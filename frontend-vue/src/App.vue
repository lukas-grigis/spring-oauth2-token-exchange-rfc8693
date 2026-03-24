<script setup lang="ts">
import { oidc } from "./oidc"
import LoginPage from "./components/LoginPage.vue"
import DashboardPage from "./components/DashboardPage.vue"
</script>

<template>
  <DashboardPage v-if="oidc.isUserLoggedIn" />
  <LoginPage v-else />
</template>
