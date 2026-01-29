import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export type ThemeName = 'light' | 'dark' | 'system';

export interface Toast { id: number; message: string; type: ToastType; duration: number; }
export interface ToastInput { message: string; type?: ToastType; duration?: number; }
export interface ConfirmOptions { 
  title: string; 
  message: string; 
  okButtonText?: string; 
  cancelButtonText?: string; 
  isDangerous?: boolean; 
  onConfirm: () => Promise<void> | void; 
}

export const useUiStore = defineStore('ui', () => {
  
  // --- STATE ---
  const activeTab = ref<'evaluation' | 'ranking' | 'dashboard'>('evaluation');

  const modals = reactive({
    evaluation: false,
    admin: false,
    auth: false,
    confirm: false,
  });

  const authModalMode = ref('login');
  const toasts = ref<Toast[]>([]);
  let toastIdCounter = 0;
  
  const confirmState = ref<ConfirmOptions | null>(null);
  const isConfirmLoading = ref(false);
  const theme = ref<ThemeName>('system');

  // --- ACTIONS ---

  function setActiveTab(tab: 'evaluation' | 'ranking' | 'dashboard') {
    activeTab.value = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Notificações
  function add(input: ToastInput) {
    const id = toastIdCounter++;
    const duration = input.duration || 4000;
    toasts.value.push({ id, message: input.message, type: input.type || 'info', duration });
    if (duration > 0) setTimeout(() => removeToast(id), duration);
  }
  function notify(message: string, type: ToastType = 'info') { add({ message, type }); }
  function removeToast(id: number) { 
    const index = toasts.value.findIndex(t => t.id === id); 
    if (index !== -1) toasts.value.splice(index, 1); 
  }

  // --- MODAIS (A LÓGICA CRÍTICA ESTÁ AQUI) ---

  // Função para fechar tudo e LIMPAR dados (usada ao cancelar/fechar)
  function closeAllModals() {
    modals.evaluation = false;
    modals.admin = false;
    modals.auth = false;
    modals.confirm = false;
    document.body.style.overflow = '';
    
    // Limpa estados temporários
    isConfirmLoading.value = false;
    confirmState.value = null; // Isso estava apagando os dados antes da hora!
  }

  // Função para abrir um modal específico
  function openModal(name: keyof typeof modals) {
    // CORREÇÃO: Fecha os outros modais manualmente sem chamar closeAllModals
    // para não perder o state do confirmState que acabamos de definir.
    (Object.keys(modals) as Array<keyof typeof modals>).forEach(key => {
        if (key !== name) modals[key] = false;
    });
    
    modals[name] = true;
    document.body.style.overflow = 'hidden';
  }

  const openEvaluation = () => openModal('evaluation');
  const openAdmin = () => openModal('admin');
  const openAuth = (mode: string = 'login') => {
    authModalMode.value = mode;
    openModal('auth');
  };

  // --- CONFIRMAÇÃO ---
  function confirm(options: ConfirmOptions) {
    // 1. Define os dados PRIMEIRO
    confirmState.value = options;
    // 2. Abre o modal (agora seguro, pois openModal não limpa mais o state)
    openModal('confirm');
  }

  async function handleConfirmExecution() {
    if (!confirmState.value?.onConfirm) return;
    isConfirmLoading.value = true;
    try {
      await confirmState.value.onConfirm();
      closeAllModals(); // Aqui sim limpamos tudo (sucesso)
    } catch (error) {
      console.error(error);
      notify('Erro ao processar ação.', 'error');
    } finally {
      isConfirmLoading.value = false;
    }
  }

  // --- TEMA ---
  function initTheme() {
    const saved = localStorage.getItem('theme') as ThemeName;
    applyTheme(saved || 'system');
  }

  function applyTheme(newTheme: ThemeName) {
    theme.value = newTheme;
    localStorage.setItem('theme', newTheme);
    const isDark = newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const html = document.documentElement;
    if (isDark) html.classList.add('dark'); else html.classList.remove('dark');
  }

  function toggleTheme() {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    applyTheme(isCurrentlyDark ? 'light' : 'dark');
  }

  return {
    activeTab, setActiveTab,
    modals, authModalMode, toasts, confirmState, isConfirmLoading, theme,
    notify, removeToast, openModal, closeAllModals, openEvaluation, openAdmin, openAuth,
    confirm, handleConfirmExecution, initTheme, toggleTheme
  };
});

export const useNotificationStore = useUiStore;