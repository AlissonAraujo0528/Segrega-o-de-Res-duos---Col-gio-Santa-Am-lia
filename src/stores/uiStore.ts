import { defineStore } from 'pinia';
import { ref } from 'vue';

// --- TIPOS ---

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

export interface ToastInput {
  message: string;
  type?: ToastType;
  duration?: number;
  timeout?: number; // Alias para duration (para compatibilidade)
}

export interface ConfirmOptions {
  title: string;
  message: string;
  okButtonText?: string;
  cancelButtonText?: string;
  isDangerous?: boolean; // Adicionado para estilizar botão vermelho
  onConfirm: () => Promise<void> | void;
}

export type ThemeName = 'light' | 'dark' | 'system';

// --- STORE ---

export const useUiStore = defineStore('ui', () => {
  
  // =========================================
  // 1. STATE (ESTADO)
  // =========================================

  // Modais (Gestão centralizada)
  const modals = ref({
    evaluation: false,
    admin: false,
    auth: false,
    confirm: false,
    // Adicione novos modais aqui conforme o app cresce
  });

  // Auth Modal (Estado interno do modal de login)
  const authModalMode = ref<'login' | 'register' | 'update_password'>('login');

  // Toasts (Notificações)
  const toasts = ref<Toast[]>([]);
  let toastIdCounter = 0;

  // Confirmação (Dialog)
  const confirmState = ref<ConfirmOptions | null>(null);
  const isConfirmLoading = ref(false);

  // Tema
  const theme = ref<ThemeName>('system');

  // =========================================
  // 2. ACTIONS: TOASTS (NOTIFICAÇÕES)
  // =========================================

  /**
   * Adiciona uma notificação.
   * Aceita objeto { message, type } para ser flexível.
   */
  function add(input: ToastInput) {
    const id = toastIdCounter++;
    const duration = input.duration || input.timeout || 4000;
    
    const toast: Toast = {
      id,
      message: input.message,
      type: input.type || 'info',
      duration
    };

    toasts.value.push(toast);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }

  // Alias para uso rápido: ui.notify('Olá')
  function notify(message: string, type: ToastType = 'info') {
    add({ message, type });
  }

  function removeToast(id: number) {
    const index = toasts.value.findIndex(t => t.id === id);
    if (index !== -1) toasts.value.splice(index, 1);
  }

  // =========================================
  // 3. ACTIONS: MODAIS
  // =========================================

  function openModal(name: keyof typeof modals.value) {
    closeAllModals(); // Fecha outros para evitar sobreposição em mobile
    modals.value[name] = true;
    document.body.style.overflow = 'hidden'; // Previne scroll no fundo
  }

  function closeAllModals() {
    (Object.keys(modals.value) as Array<keyof typeof modals.value>).forEach(key => {
      modals.value[key] = false;
    });
    document.body.style.overflow = '';
    
    // Reseta estados auxiliares
    isConfirmLoading.value = false;
    confirmState.value = null;
  }

  // Helpers semânticos
  const openEvaluation = () => openModal('evaluation');
  const openAdmin = () => openModal('admin');
  const openAuth = (mode: 'login' | 'register' = 'login') => {
    authModalMode.value = mode;
    openModal('auth');
  };

  // =========================================
  // 4. ACTIONS: CONFIRMAÇÃO
  // =========================================

  function confirm(options: ConfirmOptions) {
    confirmState.value = options;
    openModal('confirm');
  }

  async function handleConfirmExecution() {
    if (!confirmState.value?.onConfirm) return;

    isConfirmLoading.value = true;
    try {
      await confirmState.value.onConfirm();
      closeAllModals();
    } catch (error) {
      console.error(error);
      notify('Erro ao processar ação.', 'error');
    } finally {
      isConfirmLoading.value = false;
    }
  }

  // =========================================
  // 5. ACTIONS: TEMA
  // =========================================

  function initTheme() {
    const saved = localStorage.getItem('theme') as ThemeName;
    if (saved) applyTheme(saved);
    else applyTheme('system');
  }

  function applyTheme(newTheme: ThemeName) {
    theme.value = newTheme;
    localStorage.setItem('theme', newTheme);

    const isDark = 
      newTheme === 'dark' || 
      (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const html = document.documentElement;
    if (isDark) html.classList.add('dark');
    else html.classList.remove('dark');
  }

  function toggleTheme() {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    applyTheme(isCurrentlyDark ? 'light' : 'dark');
  }

  return {
    // State
    modals,
    authModalMode,
    toasts,
    confirmState,
    isConfirmLoading,
    theme,

    // Actions
    add,       // Usado pelo evaluationStore (Interface genérica)
    notify,    // Usado por componentes simples
    removeToast,
    
    openModal,
    closeAllModals,
    openEvaluation,
    openAdmin,
    openAuth,
    
    confirm,
    handleConfirmExecution,
    
    initTheme,
    toggleTheme
  };
});

// --- COMPATIBILIDADE ---
// Isso resolve o erro do evaluationStore: "has no exported member useNotificationStore"
// Agora ambas as importações apontam para a mesma store centralizada.
export const useNotificationStore = useUiStore;