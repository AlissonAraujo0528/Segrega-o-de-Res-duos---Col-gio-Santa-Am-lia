<script setup lang="ts">
import { useUiStore } from '../stores/uiStore'
const uiStore = useUiStore()

// a11y: Recebe o ID do 'slot' do BaseModal
defineProps<{
 titleId?: string
}>()
</script>

<template>
  <div class="flex flex-shrink-0 items-center justify-between border-b border-border-light p-6">
    <h2 :id="titleId" class="text-2xl font-semibold text-text-primary">
   <slot />
  </h2>
  
    <button
   @click="uiStore.closeModal()"
   class="rounded-sm text-2xl text-text-secondary/50 outline-none transition-all 
      hover:text-text-primary
      focus-ring:ring-2 focus-ring:ring-primary"
   title="Fechar"
  >
   &times;
  </button>
 </div>
</template>