<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useUiStore } from '../stores/uiStore'

defineOptions({
  inheritAttrs: false
})

const uiStore = useUiStore()

function handleKey(e: KeyboardEvent) {
  if (e.key === 'Escape') uiStore.closeModal()
}

onMounted(() => document.addEventListener('keydown', handleKey))
onUnmounted(() => document.removeEventListener('keydown', handleKey))
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-colors duration-200 p-4"
    @click.self="uiStore.closeModal()"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="modal-fade-enter max-h-[90vh] rounded-2xl bg-bg-secondary shadow-xl overflow-hidden flex flex-col border border-border-light backdrop-blur-lg"
      :class="$attrs.class"
      tabindex="-1"
      >
      <slot :titleId="'modal-title'"></slot>
    </div>
  </div>
</template>

<style scoped>
.modal-fade-enter {
  opacity: 0;
  transform: scale(0.94);
  animation: modal-pop .18s ease-out forwards;
}

@keyframes modal-pop {
  0% { opacity: 0; transform: scale(0.94); }
  100% { opacity: 1; transform: scale(1); }
}

.modal-fade-leave-active {
  opacity: 0;
  transform: scale(0.96);
  transition: opacity .15s ease-in, transform .15s ease-in;
}
</style>