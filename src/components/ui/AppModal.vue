<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  isOpen: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}>()

const emit = defineEmits(['close'])

// Controle de Scroll do Body (Trava a rolagem da página quando o modal abre)
watch(() => props.isOpen, (val) => {
  if (val) document.body.style.overflow = 'hidden'
  else document.body.style.overflow = ''
})

// Tecla ESC
function handleKey(e: KeyboardEvent) {
  if (props.isOpen && e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => document.addEventListener('keydown', handleKey))
onUnmounted(() => {
  document.removeEventListener('keydown', handleKey)
  document.body.style.overflow = '' // Garante destrava ao destruir
})

// Mapeamento de Tamanhos
const maxWidthClass = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw]'
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div 
        v-if="isOpen" 
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
      >
        
        <div 
          class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
          @click="emit('close')"
        ></div>

        <div 
          class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh] overflow-hidden transform transition-all"
          :class="maxWidthClass[size || 'md']"
        >
          
          <div v-if="title || $slots.header" class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 z-10">
            <h3 v-if="title" class="text-lg font-bold text-gray-800 dark:text-white truncate pr-4">
              {{ title }}
            </h3>
            <div v-else class="flex-1">
              <slot name="header"></slot>
            </div>
            
            <button 
              @click="emit('close')"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <i class="fa-solid fa-times text-xl"></i>
            </button>
          </div>

          <div class="p-6 overflow-y-auto custom-scrollbar">
            <slot />
          </div>

          <div v-if="$slots.footer" class="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
            <slot name="footer" />
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Animações de Entrada/Saída */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95) translateY(10px);
}
</style>