import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { supabaseClient } from '../lib/supabaseClient';
import { useUiStore } from './uiStore';
import type { User } from '@supabase/supabase-js';

// Tempo limite de inatividade (15 minutos)
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  const user = ref<User | null>(null);
  const userRole = ref<string>('user');
  const loading = ref(true);
  const sessionTimer = ref<ReturnType<typeof setTimeout> | null>(null);

  const ui = useUiStore();

  // --- GETTERS ---
  const isAuthReady = computed(() => !loading.value);
  const isAuthenticated = computed(() => !!user.value);

  // --- ACTIONS INTERNAS ---

  async function fetchUserRole(userId: string) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!error && data) {
        userRole.value = data.role;
      }
    } catch (e) {
      console.warn('Role não encontrada, assumindo "user".', e);
      userRole.value = 'user';
    }
  }

  function startInactivityTimer() {
    if (sessionTimer.value) clearTimeout(sessionTimer.value);

    if (user.value) {
      sessionTimer.value = setTimeout(() => {
        console.warn('Sessão expirada por inatividade.');
        // CORREÇÃO: Passando argumentos separados (string, string)
        ui.notify('Sessão expirada. Faça login novamente.', 'warning');
        signOut();
      }, INACTIVITY_TIMEOUT_MS);
    }
  }

  function resetTimer() {
    if (user.value) startInactivityTimer();
  }

  // --- ACTIONS PÚBLICAS ---

  async function initialize() {
    loading.value = true;

    // Detecção de link de recuperação de senha na URL
    if (window.location.hash && window.location.hash.includes('type=recovery')) {
      ui.authModalMode = 'update_password';
      ui.openModal('auth');
    }

    try {
      // Verifica sessão atual
      const { data } = await supabaseClient.auth.getSession();

      if (data.session?.user) {
        user.value = data.session.user;
        // Não usamos await aqui para não bloquear o render inicial da App
        fetchUserRole(user.value.id);
        startInactivityTimer();
      } else {
        user.value = null;
        userRole.value = 'user';
      }
    } catch (error) {
      console.error('Erro Auth Init:', error);
    } finally {
      loading.value = false;
    }

    // Listener de eventos do Supabase
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        ui.authModalMode = 'update_password';
        ui.openModal('auth');
      } else if (event === 'SIGNED_IN' && session?.user) {
        user.value = session.user;
        await fetchUserRole(session.user.id);
        startInactivityTimer();
      } else if (event === 'SIGNED_OUT') {
        user.value = null;
        userRole.value = 'user';
        if (sessionTimer.value) clearTimeout(sessionTimer.value);
      }
    });
  }

  async function handleLogin(email: string, pass: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) throw error;

      if (data.user) {
        return true;
      }
      return false;
    } catch (e: any) {
      console.error('Login Falhou:', e.message);
      return false;
    }
  }

  async function signOut() {
    try {
      await supabaseClient.auth.signOut();
    } catch (error) {
      console.error('Erro no SignOut:', error);
    } finally {
      user.value = null;
      userRole.value = 'user';
      if (sessionTimer.value) clearTimeout(sessionTimer.value);

      // CORREÇÃO: Argumentos separados
      ui.notify('Você saiu do sistema.', 'info');
      
      // Força recarregamento para limpar estados da memória
      window.location.href = '/';
    }
  }

  async function handleForgotPassword(email: string) {
    const redirectTo = window.location.origin;
    return await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
  }

  async function completePasswordRecovery() {
    // Limpa a URL suja do hash do supabase
    window.history.replaceState({}, document.title, window.location.pathname);

    const { data } = await supabaseClient.auth.getSession();
    if (data.session?.user) {
      user.value = data.session.user;
      await fetchUserRole(data.session.user.id);

      ui.closeAllModals();
      // CORREÇÃO: Argumentos separados
      ui.notify('Senha recuperada com sucesso!', 'success');
      startInactivityTimer();
    }
  }
  
  // Helper para abrir modal de login
  function openLoginModal() {
    ui.openAuth('login');
  }

  return {
    user,
    userRole,
    loading,
    isAuthReady,
    isAuthenticated,
    initialize,
    handleLogin,
    signOut,
    handleForgotPassword,
    completePasswordRecovery,
    resetTimer,
    openLoginModal
  };
});