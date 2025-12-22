import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

// --- TRAVA DE SEGURANÇA (BOOT LOCK) ---
// Captura a flag de recuperação IMEDIATAMENTE ao carregar o arquivo.
// Isso acontece antes do Supabase limpar a URL ou disparar eventos.
const IS_RECOVERY_URL = window.location.hash && window.location.hash.includes('type=recovery');

if (IS_RECOVERY_URL) {
  console.warn("🚨 MODO RECUPERAÇÃO DETECTADO NO BOOT - Bloqueando login automático.");
}

// Constante de inatividade (15 minutos)
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000 

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  const userRole = ref<string | null>(null)
  const currentUserId = ref<string | null>(null)
  const isAuthReady = ref(false)
  const inactivityTimer = ref<number | undefined>(undefined)

  // --- FUNÇÕES DE INATIVIDADE ---
  async function logoutDueToInactivity() {
    const { useUiStore } = await import('./uiStore')
    const uiStore = useUiStore() 
    uiStore.showToast('Você foi desconectado por inatividade.', 'info')
    handleLogout()
  }

  function resetInactivityTimer() {
    clearTimeout(inactivityTimer.value)
    inactivityTimer.value = setTimeout(logoutDueToInactivity, INACTIVITY_TIMEOUT_MS) as unknown as number
  }

  function startInactivityTimer() {
    const activityEvents = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart']
    activityEvents.forEach(event => {
      document.addEventListener(event, resetInactivityTimer)
    })
    resetInactivityTimer()
  }

  function stopInactivityTimer() {
    clearTimeout(inactivityTimer.value)
    const activityEvents = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart']
    activityEvents.forEach(event => {
      document.removeEventListener(event, resetInactivityTimer)
    })
  }

  // --- ACTIONS ---

  async function checkUserProfileAndInitialize(user: User) {
    const { useUiStore } = await import('./uiStore')
    const uiStore = useUiStore()

    // 1. REGRA DE OURO: SE VEIO PELO LINK DE E-MAIL, NUNCA LIBERE O ACESSO
    if (IS_RECOVERY_URL) {
       console.log("🔒 Bloqueio de Recuperação Ativo. Mantendo usuário no Modal.");
       
       uiStore.authModalMode = 'update_password';
       uiStore.isRecoveryMode = true; 
       
       // Definimos o ID para permitir o update, mas NÃO o Role.
       // Sem Role, o App.vue não renderiza o Dashboard.
       currentUserId.value = user.id;
       isAuthReady.value = true;
       return; 
    }

    try {
      // 2. VERIFICAÇÃO DE BANCO DE DADOS (PRIMEIRO ACESSO)
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('must_change_password')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      if (profile.must_change_password) {
        console.warn("🔒 Bloqueio de Primeiro Acesso. Usuário deve trocar a senha.");
        
        uiStore.authModalMode = 'update_password';
        uiStore.isRecoveryMode = true;

        // Mantemos bloqueado (sem role)
        currentUserId.value = user.id;
      } else {
        // 3. LIBERAÇÃO TOTAL (Apenas se passou por todas as travas)
        console.log("✅ Login seguro efetuado.");
        uiStore.isRecoveryMode = false;
        uiStore.authModalMode = 'login';
        
        const { data: role, error: roleError } = await supabaseClient.rpc('get_my_role')
        if (roleError) throw roleError
        
        userRole.value = role; // <--- SÓ AQUI O SITE ABRE
        currentUserId.value = user.id;
        
        startInactivityTimer();
      }
    } catch (error) {
      console.error("Erro crítico na verificação de perfil:", error);
      await handleLogout();
    } finally {
      isAuthReady.value = true;
    }
  }

  async function handleLogout() {
    stopInactivityTimer()
    const { useUiStore } = await import('./uiStore')
    const uiStore = useUiStore()
    
    uiStore.isRecoveryMode = false
    uiStore.authModalMode = 'login'

    await supabaseClient.auth.signOut()
    
    userRole.value = null
    currentUserId.value = null
  }

  async function handleLogin(email: string, password: string) {
    isAuthReady.value = false
    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
    });
    if (error) throw error;
  }
  
  async function handleForgotPassword(email: string) {
    // Garante URL limpa para o redirecionamento
    let baseUrl = (window.location.origin + window.location.pathname)
      .replace(/\/index\.html$/, '') 
      .replace(/\/+$/, '');
      
    const redirectTo = baseUrl; 
    console.log("Reset link pointing to:", redirectTo);
    
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  // --- LISTENER ---
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    // Se a flag de URL estiver ativa, ignoramos qualquer evento de sucesso
    // e forçamos a interface de recuperação
    if (IS_RECOVERY_URL) {
        const { useUiStore } = await import('./uiStore');
        const uiStore = useUiStore();
        if (!uiStore.isRecoveryMode) {
             uiStore.isRecoveryMode = true;
             uiStore.authModalMode = 'update_password';
        }
    }

    if (event === 'SIGNED_IN' && session?.user) {
      await checkUserProfileAndInitialize(session.user);
    } else if (event === 'SIGNED_OUT') {
      stopInactivityTimer()
      userRole.value = null
      currentUserId.value = null
      isAuthReady.value = true
    } else if (event === 'INITIAL_SESSION') {
       if (session?.user) {
         await checkUserProfileAndInitialize(session.user);
       } else {
         isAuthReady.value = true;
       }
    } 
  });

  return {
    userRole,
    currentUserId,
    isAuthReady,
    handleLogin,
    handleLogout,
    handleForgotPassword,
  }
})