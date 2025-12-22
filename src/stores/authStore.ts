import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

// --- TRAVA DE SEGURANÇA (BOOT LOCK) ---
// Impede redirecionamentos automáticos indesejados ao carregar a página
const IS_RECOVERY_BOOT = window.location.hash && window.location.hash.includes('type=recovery');

if (IS_RECOVERY_BOOT) {
  console.warn("🚨 MODO RECUPERAÇÃO DETECTADO NO BOOT.");
}

// 1. CONSTANTE DE INATIVIDADE
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutos

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  const userRole = ref<string | null>(null)
  const currentUserId = ref<string | null>(null)
  const isAuthReady = ref(false)
  const inactivityTimer = ref<number | undefined>(undefined)
  
  // Flag para impedir que o Listener atrapalhe o Login Manual
  let isManualLogin = false; 

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

  // Função central de validação
  async function checkUserProfileAndInitialize(user: User) {
    const { useUiStore } = await import('./uiStore')
    const uiStore = useUiStore()

    // 1. Se for BOOT de recuperação, trava tudo
    if (IS_RECOVERY_BOOT) {
       console.log("🔒 Boot de Recuperação: Forçando modal de senha.");
       uiStore.authModalMode = 'update_password';
       uiStore.isRecoveryMode = true; 
       currentUserId.value = user.id;
       isAuthReady.value = true;
       return; 
    }

    try {
      console.log("🔍 Verificando perfil do usuário...");
      
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('must_change_password')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      // 2. Se precisar trocar senha (primeiro acesso)
      if (profile.must_change_password) {
        console.warn("⚠️ Usuário precisa trocar a senha.");
        
        uiStore.authModalMode = 'update_password';
        uiStore.isRecoveryMode = true;

        // Mantemos userRole null -> Dashboard fechada -> Modal Aberto
        currentUserId.value = user.id;
        
      } else {
        // 3. Login Normal
        console.log("✅ Perfil OK. Liberando acesso.");
        
        const { data: role, error: roleError } = await supabaseClient.rpc('get_my_role')
        if (roleError) throw roleError
        
        uiStore.isRecoveryMode = false;
        uiStore.authModalMode = 'login';
        
        userRole.value = role; // <--- LIBERA DASHBOARD
        currentUserId.value = user.id;
        
        startInactivityTimer();
      }
    } catch (error) {
      console.error("❌ Erro na verificação de perfil:", error);
      await handleLogout(); 
      throw error; // Repassa erro para o UI mostrar msg vermelha
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

  // --- LOGIN MANUAL BLINDADO ---
  async function handleLogin(email: string, password: string) {
    isAuthReady.value = false;
    isManualLogin = true; // 1. Ativa a flag de controle manual
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        // 2. Chama a verificação diretamente e aguarda
        if (data.user) {
            await checkUserProfileAndInitialize(data.user);
        }
    } catch (error) {
        throw error; // Joga o erro para o Modal exibir
    } finally {
        // 3. Libera a flag após terminar tudo (com sucesso ou erro)
        // O timeout garante que o Listener não pegue o evento residual imediatamente
        setTimeout(() => { isManualLogin = false }, 500);
        isAuthReady.value = true;
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

  // --- LISTENER (OUVINTE AUTOMÁTICO) ---
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    // SE ESTIVERMOS NO MEIO DE UM LOGIN MANUAL, O OUVINTE NÃO FAZ NADA.
    if (isManualLogin) return; 

    // Se for BOOT de recuperação, também ignora
    if (IS_RECOVERY_BOOT) return;

    // Lógica normal para reconexão automática (F5)
    if (event === 'SIGNED_IN' && session?.user && !userRole.value) {
       console.log("⚡ Auto-login detectado (Refresh/Sessão)");
       await checkUserProfileAndInitialize(session.user).catch(err => console.error(err));
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