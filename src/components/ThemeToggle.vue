<script setup lang="ts">
import { useUiStore } from '../stores/uiStore'

const uiStore = useUiStore()

function cycleTheme() {
  if (uiStore.theme === 'system') {
    uiStore.applyTheme('light')
  } else if (uiStore.theme === 'light') {
    uiStore.applyTheme('dark')
  } else {
    uiStore.applyTheme('system')
  }
}
</script>

<template>
  <button
    @click="cycleTheme"
    title="Alterar tema"
    class="rounded border border-border-light px-3 py-2 text-sm text-text-secondary
           transition-all outline-none hover:bg-tertiary
           focus-ring:ring-2 focus-ring:ring-primary"
  >
    <i v-if="uiStore.theme === 'system'" class="fa-solid fa-desktop text-primary"></i>

    <i v-if="uiStore.theme === 'light'" class="fa-solid fa-sun text-warning"></i>

    <i v-if="uiStore.theme === 'dark'" class="fa-solid fa-moon text-text-secondary"></i>
  </button>
</template>