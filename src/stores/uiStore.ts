import { defineStore } from 'pinia'
import { ref } from 'vue'

// --- Tipos ---
// Adicionado 'auth' e alterado para aceitar null
export type ModalName = 'auth' | 'ranking' | 'dashboard' | 'admin' | null
export type ThemeName = 'light' | 'dark' | 'system'
export type AuthModalMode = 'login' | 'register' | 'update_password'

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
  const activeModal = ref<ModalName>(null)
  const authModalMode = ref<AuthModalMode>('login')
  const theme = ref<ThemeName>('system')

  // Notificações e Confirmação (Mantido do seu código original)
  const notifications = ref<Notification[]>([])
  const isConfirmModalOpen = ref(false)
  const confirmOptions = ref<ConfirmOptions | null>(null)
  const isRecoveryMode = ref(false)

  // --- ACTIONS ---

  function openModal(name: ModalName) {
    activeModal.value = name
    document.body.style.overflow = 'hidden'
  }

  function closeModal() {
    activeModal.value = null
    // Só libera o scroll se não houver um modal de confirmação por cima
    if (!isConfirmModalOpen.value) {
      document.body.style.overflow = ''
    }
  }

  // --- Helpers Específicos (CORREÇÃO DE ERROS DE BUILD) ---
  // Estes métodos conectam os componentes específicos às ações genéricas
  const closeAuthModal = () => closeModal()
  const closeDashboardModal = () => closeModal()
  
  // Getters como funções para reatividade
  const isAuthModalOpen = () => activeModal.value === 'auth'
  const isDashboardModalOpen = () => activeModal.value === 'dashboard'

  // --- Tema ---
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

  function toggleTheme() {
    const next = theme.value === 'dark' ? 'light' : 'dark' // Simples toggle, ignora system para forçar a troca
    applyTheme(next)
  }

  // --- Notificações ---
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

  // --- Confirmação ---
  function showConfirmModal(options: ConfirmOptions) {
    confirmOptions.value = {
      ...options,
      okButtonText: options.okButtonText || 'Confirmar',
      okButtonClass: options.okButtonClass || 'bg-green-600 hover:bg-green-700',
    }
    isConfirmModalOpen.value = true
    document.body.style.overflow = 'hidden' 
  }

  function closeConfirmModal() {
    isConfirmModalOpen.value = false
    confirmOptions.value = null
    // Se não tiver modal de fundo, libera scroll
    if (activeModal.value === null) {
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
    // State
    activeModal,
    authModalMode,
    theme,
    notifications,
    isConfirmModalOpen,
    confirmOptions,
    isRecoveryMode,
    
    // Actions & Helpers
    openModal,
    closeModal,
    isAuthModalOpen,      // Novo
    closeAuthModal,       // Novo
    isDashboardModalOpen, // Novo
    closeDashboardModal,  // Novo
    
    applyTheme,
    toggleTheme,
    showToast,
    removeNotification,
    showConfirmModal,
    closeConfirmModal,
    executeConfirm
  }
})