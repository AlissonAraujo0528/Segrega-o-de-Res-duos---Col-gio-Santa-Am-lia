<script setup lang="ts">
import { useUiStore, type ToastType } from '../stores/uiStore'

const uiStore = useUiStore()

function getStyles(type: ToastType) {
  switch (type) {
    case 'success':
      return 'bg-green-600 dark:bg-green-700 text-white border-green-700'
    case 'error':
      return 'bg-red-600 dark:bg-red-700 text-white border-red-700'
    case 'warning':
      return 'bg-yellow-500 dark:bg-yellow-600 text-white border-yellow-600'
    case 'info':
    default:
      return 'bg-gray-800 dark:bg-gray-700 text-white border-gray-900'
  }
}

function getIcon(type: ToastType) {
  switch (type) {
    case 'success': return 'fa-solid fa-check-circle'
    case 'error': return 'fa-solid fa-triangle-exclamation'
    case 'warning': return 'fa-solid fa-bell'
    default: return 'fa-solid fa-info-circle'
  }
}
</script>

<template>
  <div class="fixed right-0 top-0 z-[9999] flex w-full max-w-sm flex-col gap-2 p-4 pointer-events-none">
    
    <TransitionGroup name="toast">
      <div
        v-for="toast in uiStore.toasts"
        :key="toast.id"
        :class="getStyles(toast.type)"
        class="pointer-events-auto flex items-start gap-3 rounded-lg p-4 shadow-xl border-l-4 transition-all"
        role="alert"
      >
        <div class="flex-shrink-0 pt-0.5 text-lg">
          <i :class="getIcon(toast.type)"></i>
        </div>
        
        <div class="flex-1 text-sm font-medium leading-tight">
          {{ toast.message }}
        </div>
        
        <button
          @click="uiStore.removeToast(toast.id)"
          class="flex-shrink-0 text-white/70 hover:text-white transition-colors"
          aria-label="Fechar notificação"
        >
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    </TransitionGroup>

  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
}
</style>