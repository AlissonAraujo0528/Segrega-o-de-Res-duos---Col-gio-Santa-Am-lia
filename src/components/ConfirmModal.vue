<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '../stores/uiStore'
import AppModal from './ui/AppModal.vue'
import AppButton from './ui/AppButton.vue'

const uiStore = useUiStore()

// Computa o ícone baseado na classe do botão (ex: vermelho = perigo)
const confirmIcon = computed(() => {
  const cls = uiStore.confirmState?.okButtonClass || ''
  if (cls.includes('red') || cls.includes('danger')) {
    return 'fa-solid fa-triangle-exclamation'
  }
  return 'fa-solid fa-check'
})

function handleCancel() {
  uiStore.closeModal()
}

function handleConfirm() {
  uiStore.executeConfirm()
}
</script>

<template>
  <AppModal 
    :isOpen="uiStore.modals.confirm"
    :title="uiStore.confirmState?.title || 'Confirmação'"
    size="sm"
    @close="handleCancel"
  >
    
    <div class="text-gray-700 dark:text-gray-300 text-base leading-relaxed">
      {{ uiStore.confirmState?.message }}
    </div>

    <template #footer>
      <AppButton 
        variant="secondary" 
        @click="handleCancel"
        :disabled="uiStore.isConfirmLoading"
      >
        {{ uiStore.confirmState?.cancelButtonText || 'Cancelar' }}
      </AppButton>
      
      <AppButton 
        @click="handleConfirm" 
        :loading="uiStore.isConfirmLoading"
        :class="uiStore.confirmState?.okButtonClass" 
        :icon="confirmIcon"
      >
        {{ uiStore.confirmState?.okButtonText || 'Confirmar' }}
      </AppButton>
    </template>

  </AppModal>
</template>