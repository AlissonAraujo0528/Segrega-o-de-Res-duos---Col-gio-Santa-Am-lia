import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

// --- TRAVA DE SEGURANÇA (BOOT LOCK) ---
// Detecta se a página foi carregada com um link de recuperação.
// Usamos isso para impedir que o Listener processe logins automáticos indesejados.
const IS_RECOVERY_BOOT = window.location.hash && window.location.hash.includes('type=recovery');

if (IS_RECOVERY_BOOT) {
  console.warn("🚨 MODO RECUPERAÇÃO DETECTADO NO BOOT.");
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

  // Função central que decide se o usuário entra ou se troca a senha
  async function checkUserProfileAndInitialize(user: User) {
    const { useUiStore } = await import('./uiStore')
    const uiStore = useUiStore()

    // 1. SE ESTAMOS NO BOOT DE RECUPERAÇÃO, TRAVAMOS TUDO
    if (IS_RECOVERY_BOOT) {
       console.log("🔒 Boot de Recuperação: Forçando modal de senha.");
       uiStore.authModalMode = 'update_password';
       uiStore.isRecoveryMode = true; 
       currentUserId.value = user.id;
       isAuthReady.value = true;
       return; // Não carrega dashboard
    }

    try {
      console.log("🔍 Verificando perfil do usuário...");
      
      // 2. BUSCA PERFIL (Para ver se precisa trocar senha)
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('must_change_password')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      if (profile.must_change_password) {
        console.warn("⚠️ Usuário precisa trocar a senha (Banco de Dados).");
        
        uiStore.authModalMode = 'update_password';
        uiStore.isRecoveryMode = true;

        // Mantemos userRole null para não abrir o dashboard
        currentUserId.value = user.id;
      } else {
        // 3. TUDO CERTO - LIBERA ACESSO
        console.log("✅ Perfil OK. Carregando Role...");
        
        const { data: role, error: roleError } = await supabaseClient.rpc('get_my_role')
        if (roleError) throw roleError
        
        // Limpa estados de recuperação
        uiStore.isRecoveryMode = false;
        uiStore.authModalMode = 'login';
        
        // Define usuário logado -> ISSO ABRE O DASHBOARD NO APP.VUE
        userRole.value = role; 
        currentUserId.value = user.id;
        
        startInactivityTimer();
      }
    } catch (error) {
      console.error("❌ Erro ao inicializar perfil:", error);
      // Se falhar o carregamento do perfil, deslogamos para evitar estados inconsistentes
      // Mas relançamos o erro para o UI saber
      await handleLogout(); 
      throw error; 
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
    
    // 1. Faz o Login no Supabase
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;

    // 2. IMPORTANTE: Chama a verificação manualmente e AGUARDA ela terminar.
    // Isso garante que se der erro no perfil, o AuthModal recebe o erro e para o spinner.
    if (data.user) {
        await checkUserProfileAndInitialize(data.user);
    }
  }
  
  async function handleForgotPassword(email: string) {
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
    // Se for recuperação via link, a prioridade é do Boot Lock
    if (IS_RECOVERY_BOOT) return;

    // Se o evento for login, mas nós já temos o userRole (porque o handleLogin já rodou),
    // ignoramos para evitar chamadas duplas.
    if (event === 'SIGNED_IN' && session?.user && !userRole.value) {
       console.log("⚡ Listener detectou login (sessão restaurada ou auto-login)");
       // Usamos catch aqui para não quebrar o listener global, já que não tem UI para mostrar erro
       await checkUserProfileAndInitialize(session.user).catch(err => console.error("Erro no Listener:", err));
    } 
    else if (event === 'SIGNED_OUT') {
      stopInactivityTimer()
      userRole.value = null
      currentUserId.value = null
      isAuthReady.value = true
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