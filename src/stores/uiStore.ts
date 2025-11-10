// src/stores/uiStore.ts (Corrigido)

import { defineStore } from 'pinia'
import { ref } from 'vue'

// --- Tipos ---
export type ModalName = 'none' | 'ranking' | 'dashboard' | 'admin'
export type ThemeName = 'light' | 'dark' | 'system'

export interface Notification {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface ConfirmOptions {
  title: string
  message: string
  okButtonText?: string
  okButtonClass?: string
  onConfirm: () => void | Promise<void>
}

export const useUiStore = defineStore('ui', () => {
  // --- STATE ---
  const activeModal = ref<ModalName>('none')
  const notifications = ref<Notification[]>([])
  const isConfirmModalOpen = ref(false)
  const confirmOptions = ref<ConfirmOptions | null>(null)
  const theme = ref<ThemeName>('system')

  // --- ACTIONS ---
  
  function applyTheme(newTheme: ThemeName) {
    if (newTheme === 'system') {
      localStorage.removeItem('theme')
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    } else {
      localStorage.theme = newTheme
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
    theme.value = newTheme
  }

  // --- Ações de Modal ---
  function openModal(name: ModalName) {
    activeModal.value = name
    document.body.style.overflow = 'hidden' // ✅ CORREÇÃO: Trava o scroll do body
  }

  function closeModal() {
    activeModal.value = 'none'
    // ✅ CORREÇÃO: Só destrava o scroll se o modal de confirmação também estiver fechado
    if (!isConfirmModalOpen.value) {
      document.body.style.overflow = ''
    }
  }

  // --- Ações de Toast/Notificação ---
  function removeNotification(id: number) {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  function showToast(
    message: string, 
    type: 'success' | 'error' | 'info' = 'info', 
    duration: number = 4000
  ) {
    const id = Date.now() + Math.random()
    notifications.value.push({ id, message, type })
    setTimeout(() => {
      removeNotification(id)
    }, duration)
  }

  // --- Ações do Modal de Confirmação ---
  function showConfirmModal(options: ConfirmOptions) {
    confirmOptions.value = {
      ...options,
      okButtonText: options.okButtonText || 'Confirmar',
      okButtonClass: options.okButtonClass || 'bg-green-600 hover:bg-green-700',
    }
    isConfirmModalOpen.value = true
    document.body.style.overflow = 'hidden' // ✅ CORREÇÃO: Trava o scroll do body
  }

  function closeConfirmModal() {
    isConfirmModalOpen.value = false
    confirmOptions.value = null
    // ✅ CORREÇÃO: Só destrava o scroll se o modal principal também estiver fechado
    if (activeModal.value === 'none') {
      document.body.style.overflow = ''
    }
  }

  async function executeConfirm() {
    if (confirmOptions.value && typeof confirmOptions.value.onConfirm === 'function') {
      await confirmOptions.value.onConfirm()
    }
    closeConfirmModal()
  }

  return {
    activeModal,
    notifications,
    isConfirmModalOpen,
    confirmOptions,
    theme,
    
    openModal,
    closeModal,
    showToast,
    removeNotification,
    showConfirmModal,
    closeConfirmModal,
    executeConfirm,
    applyTheme,
  }
})