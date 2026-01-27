import { defineStore } from 'pinia'
import { ref } from 'vue'

// --- TIPOS ---

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: number
  message: string
  type: ToastType
  duration?: number
}

// Definição clara de quais modais existem no sistema
// REMOVIDO: ranking e dashboard (agora são rotas)
export interface ModalState {
  evaluation: boolean
  admin: boolean
  auth: boolean
  confirm: boolean
}

// Tipo para as opções do Modal de Confirmação
export interface ConfirmOptions {
  title: string
  message: string
  okButtonText?: string
  cancelButtonText?: string
  okButtonClass?: string
  onConfirm: () => Promise<void> | void
}

export type ThemeName = 'light' | 'dark' | 'system'

export const useUiStore = defineStore('ui', () => {
  
  // --- STATE ---
  
  // 1. Modais
  const modals = ref<ModalState>({
    evaluation: false,
    admin: false,
    auth: false,
    confirm: false
  })

  // 2. Auth Modal Mode
  const authModalMode = ref<'login' | 'register' | 'update_password'>('login')
  const isRecoveryMode = ref(false)

  // 3. Toasts
  const toasts = ref<Toast[]>([])
  let toastIdCounter = 0

  // 4. Confirmação
  const confirmState = ref<ConfirmOptions | null>(null)
  const isConfirmLoading = ref(false)

  // 5. Tema
  const theme = ref<ThemeName>('system')

  // --- ACTIONS: MODAIS ---

  function openModal(name: keyof ModalState) {
    closeModal() 
    modals.value[name] = true
    document.body.style.overflow = 'hidden'
  }

  function closeModal() {
    (Object.keys(modals.value) as Array<keyof ModalState>).forEach(key => {
      modals.value[key] = false
    })
    document.body.style.overflow = ''
    isRecoveryMode.value = false
  }

  // --- ACTIONS ESPECÍFICAS (Helpers) ---
  const openEvaluationModal = () => openModal('evaluation')
  const openAdminModal = () => openModal('admin')
  const openAuthModal = () => openModal('auth')
  
  // REMOVIDOS: openRankingModal e openDashboardModal

  // --- ACTIONS: TOASTS ---

  function showToast(message: string, type: ToastType = 'info', duration = 4000) {
    const id = toastIdCounter++
    const toast: Toast = { id, message, type, duration }
    
    toasts.value.push(toast)

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }

  function removeToast(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  // --- ACTIONS: CONFIRMAÇÃO ---

  function showConfirmModal(options: ConfirmOptions) {
    confirmState.value = options
    modals.value.confirm = true
    document.body.style.overflow = 'hidden'
  }

  async function executeConfirm() {
    if (confirmState.value?.onConfirm) {
      isConfirmLoading.value = true
      try {
        await confirmState.value.onConfirm()
      } finally {
        isConfirmLoading.value = false
        closeModal() 
        confirmState.value = null
      }
    }
  }

  // --- ACTIONS: TEMA ---

  function applyTheme(newTheme: ThemeName) {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)

    const isDark = 
      newTheme === 'dark' || 
      (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function toggleTheme() {
    const current = theme.value
    const next = current === 'light' ? 'dark' : 'light'
    applyTheme(next)
  }

  return {
    // State
    modals,
    authModalMode,
    isRecoveryMode,
    toasts,
    confirmState,
    isConfirmLoading,
    theme,

    // Actions Modais
    openModal,
    closeModal,
    openEvaluationModal,
    openAdminModal,
    openAuthModal,

    // Actions Toasts
    showToast,
    removeToast,

    // Actions Confirm
    showConfirmModal,
    executeConfirm,

    // Actions Theme
    applyTheme,
    toggleTheme
  }
})