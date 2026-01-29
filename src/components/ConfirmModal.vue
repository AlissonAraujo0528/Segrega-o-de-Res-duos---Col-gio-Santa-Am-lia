<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '../stores/uiStore'
import AppModal from './ui/AppModal.vue'
import AppButton from './ui/AppButton.vue'

const ui = useUiStore()

// Computa o ícone baseado na flag 'isDangerous' da store
const confirmIcon = computed(() => {
  return ui.confirmState?.isDangerous 
    ? 'fa-solid fa-triangle-exclamation' 
    : 'fa-solid fa-check'
})

function handleCancel() {
  ui.closeAllModals()
}

function handleConfirm() {
  ui.handleConfirmExecution()
}
</script>

<template>
  <AppModal 
    :isOpen="ui.modals.confirm"
    :title="ui.confirmState?.title || 'Confirmação'"
    size="sm"
    @close="handleCancel"
  >
    
    <div class="text-gray-700 dark:text-gray-300 text-base leading-relaxed">
      {{ ui.confirmState?.message }}
    </div>

    <template #footer>
      <AppButton 
        variant="secondary" 
        @click="handleCancel"
        :disabled="ui.isConfirmLoading"
      >
        {{ ui.confirmState?.cancelButtonText || 'Cancelar' }}
      </AppButton>
      
      <AppButton 
        @click="handleConfirm" 
        :loading="ui.isConfirmLoading"
        :variant="ui.confirmState?.isDangerous ? 'danger' : 'primary'"
        :icon="confirmIcon"
      >
        {{ ui.confirmState?.okButtonText || 'Confirmar' }}
      </AppButton>
    </template>

  </AppModal>
</template>