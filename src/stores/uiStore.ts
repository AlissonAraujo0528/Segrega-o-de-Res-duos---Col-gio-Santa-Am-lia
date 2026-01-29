import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';

// --- TIPOS ---
export type ToastType = 'success' | 'error' | 'info' | 'warning';
export interface Toast { id: number; message: string; type: ToastType; duration: number; }
export interface ToastInput { message: string; type?: ToastType; duration?: number; }
export interface ConfirmOptions { title: string; message: string; okButtonText?: string; cancelButtonText?: string; isDangerous?: boolean; onConfirm: () => Promise<void> | void; }
export type ThemeName = 'light' | 'dark' | 'system';

export const useUiStore = defineStore('ui', () => {
  
  // --- STATE ---

  // 1. Controle de Abas (NOVO: Essencial para navegação)
  const activeTab = ref<'evaluation' | 'ranking' | 'dashboard'>('evaluation');

  // 2. Modais
  const modals = reactive({
    evaluation: false,
    admin: false,
    auth: false,
    confirm: false,
  });

  const authModalMode = ref<'login' | 'register' | 'update_password'>('login');
  const toasts = ref<Toast[]>([]);
  let toastIdCounter = 0;
  const confirmState = ref<ConfirmOptions | null>(null);
  const isConfirmLoading = ref(false);
  const theme = ref<ThemeName>('system');

  // --- ACTIONS ---

  // Função para mudar aba e rolar para o topo
  function setActiveTab(tab: 'evaluation' | 'ranking' | 'dashboard') {
    activeTab.value = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Toasts
  function add(input: ToastInput) {
    const id = toastIdCounter++;
    const duration = input.duration || 4000;
    const toast: Toast = { id, message: input.message, type: input.type || 'info', duration };
    toasts.value.push(toast);
    if (duration > 0) setTimeout(() => removeToast(id), duration);
  }
  function notify(message: string, type: ToastType = 'info') { add({ message, type }); }
  function removeToast(id: number) { 
    const index = toasts.value.findIndex(t => t.id === id); 
    if (index !== -1) toasts.value.splice(index, 1); 
  }

  // Modais
  function closeAllModals() {
    modals.evaluation = false;
    modals.admin = false;
    modals.auth = false;
    modals.confirm = false;
    document.body.style.overflow = '';
    isConfirmLoading.value = false;
    confirmState.value = null;
  }
  function openModal(name: keyof typeof modals) { 
    closeAllModals(); 
    modals[name] = true; 
    document.body.style.overflow = 'hidden'; 
  }
  const openEvaluation = () => openModal('evaluation');
  const openAdmin = () => openModal('admin');
  const openAuth = (mode: 'login' | 'register' = 'login') => { authModalMode.value = mode; openModal('auth'); };

  // Confirmação
  function confirm(options: ConfirmOptions) {
    confirmState.value = options;
    openModal('confirm');
  }
  async function handleConfirmExecution() {
    if (!confirmState.value?.onConfirm) return;
    isConfirmLoading.value = true;
    try { await confirmState.value.onConfirm(); closeAllModals(); } 
    catch (error) { console.error(error); notify('Erro ao processar ação.', 'error'); } 
    finally { isConfirmLoading.value = false; }
  }

  // Tema
  function initTheme() { const saved = localStorage.getItem('theme') as ThemeName; applyTheme(saved || 'system'); }
  
  function applyTheme(newTheme: ThemeName) {
    theme.value = newTheme;
    localStorage.setItem('theme', newTheme);
    const isDark = newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    // Isso adiciona a classe 'dark' no <HTML>, que é o padrão do Tailwind v4
    const html = document.documentElement;
    if (isDark) html.classList.add('dark'); else html.classList.remove('dark');
  }
  
  function toggleTheme() {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    applyTheme(isCurrentlyDark ? 'light' : 'dark');
  }

  return {
    activeTab, setActiveTab, // Exportando para uso nas Views
    modals, authModalMode, toasts, confirmState, isConfirmLoading, theme,
    add, notify, removeToast, openModal, closeAllModals, openEvaluation, openAdmin, openAuth,
    confirm, handleConfirmExecution, initTheme, toggleTheme
  };
});

export const useNotificationStore = useUiStore;