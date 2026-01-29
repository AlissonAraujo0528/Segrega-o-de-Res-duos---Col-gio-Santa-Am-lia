<script setup lang="ts">
import { useUiStore } from '../stores/uiStore'

const ui = useUiStore()
</script>

<template>
  <button 
    @click="ui.toggleTheme()" 
    class="p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/50"
    :class="ui.theme === 'dark' 
      ? 'text-gray-400 hover:bg-gray-700 hover:text-white' 
      : 'text-gray-500 hover:bg-teal-50 hover:text-teal-600'"
    :title="ui.theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'"
  >
    <i v-if="ui.theme === 'light'" class="fa-solid fa-sun text-yellow-500 text-lg"></i>

    <i v-else class="fa-solid fa-moon text-blue-400 text-lg"></i>
  </button>
</template>