<script setup lang="ts">
import { useUiStore } from '../stores/uiStore'
import BaseModal from './BaseModal.vue'

const uiStore = useUiStore()

function getIconForButton(buttonClass: string | undefined) {
  if (buttonClass?.includes('bg-danger') || buttonClass?.includes('bg-red')) {
    return 'fa-solid fa-triangle-exclamation'
  }
  if (buttonClass?.includes('bg-success') || buttonClass?.includes('bg-green')) {
    return 'fa-solid fa-check'
  }
  return 'fa-solid fa-check'
}
</script>

<template>
  <BaseModal
    v-if="uiStore.isConfirmModalOpen && uiStore.confirmOptions"
    class="max-w-lg w-[90%]"
    v-slot="{ titleId }"
  >
    <div
      class="border-b border-border-light bg-bg-secondary p-6"
    >
      <h2
        :id="titleId"
        class="text-xl font-semibold text-text-primary"
      >
        {{ uiStore.confirmOptions.title }}
      </h2>
    </div>

    <div class="p-6 text-text-secondary">
      {{ uiStore.confirmOptions.message }}
    </div>

    <div
      class="flex flex-col gap-3 border-t border-border-light bg-bg-tertiary p-6"
    >
      <button
        @click="uiStore.closeConfirmModal()"
        class="w-full rounded-lg bg-gray-500 px-6 py-3 text-base font-semibold text-white outline-none transition-all hover:bg-gray-600 focus-ring:ring-2 focus-ring:ring-gray-400 sm:w-auto"
      >
        <i class="fa-solid fa-times mr-2"></i>
        Cancelar
      </button>

      <button
        @click="uiStore.executeConfirm()"
        :class="uiStore.confirmOptions.okButtonClass"
        class="w-full rounded-lg px-6 py-3 text-base font-semibold text-white outline-none transition-all hover:opacity-90 focus-ring:ring-2 focus-ring:ring-primary sm:w-auto"
      >
        <i :class="getIconForButton(uiStore.confirmOptions.okButtonClass)" class="mr-2"></i>
        {{ uiStore.confirmOptions.okButtonText }}
      </button>
    </div>
  </BaseModal>
</template>
