<script setup lang="ts">
import { useUiStore } from '../stores/uiStore'

const uiStore = useUiStore()

function getTypeClasses(type: string) {
  switch (type) {
    case 'success':
      return 'bg-success border-success/50 text-white'
    case 'error':
      return 'bg-danger border-danger/50 text-white'
    default:
      return 'bg-primary-dark border-primary/50 text-white'
  }
}

function getIconClass(type: string) {
  switch (type) {
    case 'success':
      return 'fa-solid fa-check-circle'
    case 'error':
      return 'fa-solid fa-exclamation-triangle'
    default:
      return 'fa-solid fa-info-circle'
  }
}
</script>

<template>
  <div class="fixed right-4 top-4 z-[9999] w-full max-w-sm space-y-3">
    
    <transition-group name="fade">

      <div
        v-for="notification in uiStore.notifications"
        :key="notification.id"
        :class="getTypeClasses(notification.type)"
        class="flex w-full items-start gap-4 rounded-lg border-l-4 p-4 shadow-xl"
        :role="notification.type === 'error' ? 'alert' : 'status'"
      >
        <div class="flex-shrink-0 pt-1 text-xl">
          <i :class="getIconClass(notification.type)"></i>
        </div>
        
        <div class="flex-1">
          <p class="font-semibold">{{ notification.message }}</p>
        </div>
        
        <button
          @click="uiStore.removeNotification(notification.id)"
          class="flex-shrink-0 rounded-sm text-xl text-white/70 outline-none transition-all 
                 hover:text-white
                 focus-ring:ring-1 focus-ring:ring-white"
          title="Fechar"
        >
          &times;
        </button>
      </div>
    </transition-group>
  </div>
</template> 

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>