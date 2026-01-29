import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';

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
}

export interface ConfirmOptions {
  title: string;
  message: string;
  okButtonText?: string;
  cancelButtonText?: string;
  isDangerous?: boolean;
  onConfirm: () => Promise<void> | void;
}

export type ThemeName = 'light' | 'dark' | 'system';

// --- STORE ---

export const useUiStore = defineStore('ui', () => {
  
  // =========================================
  // 1. STATE (ESTADO)
  // =========================================

  // Modais (Gestão centralizada)
  const modals = reactive({
    evaluation: false,
    admin: false,
    auth: false,
    confirm: false,
  });

  // Auth Modal (Estado interno)
  const authModalMode = ref<'login' | 'register' | 'update_password'>('login');

  // Toasts
  const toasts = ref<Toast[]>([]);
  let toastIdCounter = 0;

  // Confirmação
  const confirmState = ref<ConfirmOptions | null>(null);
  const isConfirmLoading = ref(false);

  // Tema
  const theme = ref<ThemeName>('system');

  // =========================================
  // 2. ACTIONS: TOASTS
  // =========================================

  function add(input: ToastInput) {
    const id = toastIdCounter++;
    const duration = input.duration || 4000;
    
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

  // Alias rápido
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

  function openModal(name: keyof typeof modals) {
    closeAllModals(); // Fecha outros para evitar sobreposição
    modals[name] = true;
    document.body.style.overflow = 'hidden'; // Trava scroll
  }

  function closeAllModals() {
    modals.evaluation = false;
    modals.admin = false;
    modals.auth = false; // Isso garante que o modal de login suma
    modals.confirm = false;
    
    document.body.style.overflow = ''; // Destrava scroll
    
    // Reseta estados
    isConfirmLoading.value = false;
    confirmState.value = null;
  }

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
    modals,
    authModalMode,
    toasts,
    confirmState,
    isConfirmLoading,
    theme,
    add,
    notify,
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

export const useNotificationStore = useUiStore;