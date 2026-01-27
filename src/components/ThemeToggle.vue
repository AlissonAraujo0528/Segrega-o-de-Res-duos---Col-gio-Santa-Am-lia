<script setup lang="ts">
import { computed } from 'vue'
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

const currentLabel = computed(() => {
  switch (uiStore.theme) {
    case 'light': return 'Tema Claro'
    case 'dark': return 'Tema Escuro'
    default: return 'Tema do Sistema'
  }
})
</script>

<template>
  <button
    @click="cycleTheme"
    :title="`Alterar tema (${currentLabel})`"
    class="p-2 rounded-lg text-gray-500 hover:bg-teal-50 hover:text-teal-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/50"
  >
    <i v-if="uiStore.theme === 'system'" class="fa-solid fa-desktop text-lg"></i>

    <i v-else-if="uiStore.theme === 'light'" class="fa-solid fa-sun text-yellow-500 text-lg"></i>

    <i v-else-if="uiStore.theme === 'dark'" class="fa-solid fa-moon text-blue-400 text-lg"></i>
  </button>
</template>