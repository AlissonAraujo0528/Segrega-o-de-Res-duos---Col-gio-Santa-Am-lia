import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

// --- TRAVA DE SEGURANÇA (BOOT LOCK) ---
const IS_RECOVERY_BOOT = window.location.hash && window.location.hash.includes('type=recovery');

if (IS_RECOVERY_BOOT) {
  console.warn("[AuthDebug] 🚨 MODO RECUPERAÇÃO DETECTADO NO BOOT.");
}

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000 

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  const userRole = ref<string | null>(null)
  const currentUserId = ref<string | null>(null)
  const isAuthReady = ref(false)
  const inactivityTimer = ref<number | undefined>(undefined)
  
  // Flag para controle manual
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

  async function checkUserProfileAndInitialize(user: User) {
    console.log("[AuthDebug] 🔍 checkUserProfileAndInitialize iniciado para:", user.email);
    
    const { useUiStore } = await import('./uiStore')
    const uiStore = useUiStore()

    // 1. Boot Lock Check
    if (IS_RECOVERY_BOOT) {
       console.log("[AuthDebug] 🔒 Boot de Recuperação: Travando tudo.");
       uiStore.authModalMode = 'update_password';
       uiStore.isRecoveryMode = true; 
       currentUserId.value = user.id;
       isAuthReady.value = true;
       return; 
    }

    try {
      // 2. Perfil Check
      console.log("[AuthDebug] Buscando perfil na tabela 'profiles'...");
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('must_change_password')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error("[AuthDebug] ❌ Erro ao buscar perfil:", profileError);
        throw profileError;
      }
      
      console.log("[AuthDebug] Perfil encontrado. must_change_password:", profile.must_change_password);

      if (profile.must_change_password) {
        console.warn("[AuthDebug] ⚠️ Usuário precisa trocar senha. Bloqueando acesso.");
        uiStore.authModalMode = 'update_password';
        uiStore.isRecoveryMode = true;
        currentUserId.value = user.id;
        // userRole permanece null
      } else {
        // 3. Login Normal
        console.log("[AuthDebug] ✅ Perfil OK. Buscando Role (RPC get_my_role)...");
        
        const { data: role, error: roleError } = await supabaseClient.rpc('get_my_role')
        
        if (roleError) {
             console.error("[AuthDebug] ❌ Erro no RPC get_my_role:", roleError);
             throw roleError;
        }

        console.log("[AuthDebug] Role recebida:", role);
        
        // Destrava UI
        uiStore.isRecoveryMode = false;
        uiStore.authModalMode = 'login';
        
        // Libera Dashboard
        userRole.value = role; 
        currentUserId.value = user.id;
        
        startInactivityTimer();
        console.log("[AuthDebug] 🚀 Acesso LIBERADO!");
      }
    } catch (error) {
      console.error("[AuthDebug] 💥 Erro fatal em checkUserProfile:", error);
      await handleLogout(); 
      throw error; 
    } finally {
      isAuthReady.value = true;
    }
  }

  async function handleLogout() {
    console.log("[AuthDebug] Fazendo Logout...");
    stopInactivityTimer()
    const { useUiStore } = await import('./uiStore')
    const uiStore = useUiStore()
    
    uiStore.isRecoveryMode = false
    uiStore.authModalMode = 'login'

    // Limpa storage local para evitar "sujeira"
    localStorage.removeItem('sb-' + import.meta.env.VITE_SUPABASE_URL + '-auth-token') // Tentativa genérica de limpeza

    await supabaseClient.auth.signOut()
    
    userRole.value = null
    currentUserId.value = null
    console.log("[AuthDebug] Logout concluído.");
  }

  // --- LOGIN MANUAL ---
  async function handleLogin(email: string, password: string) {
    console.log("[AuthDebug] Botão 'Entrar' clicado via handleLogin.");
    isAuthReady.value = false;
    isManualLogin = true; 
    
    try {
        console.log("[AuthDebug] Chamando supabase.auth.signInWithPassword...");
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error("[AuthDebug] ❌ Erro no Supabase Login:", error.message);
            throw error;
        }

        console.log("[AuthDebug] Supabase Login OK. User:", data.user?.id);

        if (data.user) {
            console.log("[AuthDebug] Iniciando verificação de perfil...");
            await checkUserProfileAndInitialize(data.user);
        } else {
            console.warn("[AuthDebug] Login sem dados de usuário?");
        }
    } catch (error) {
        console.error("[AuthDebug] Erro capturado no handleLogin:", error);
        throw error; 
    } finally {
        console.log("[AuthDebug] Finalizando handleLogin (finally block).");
        // Pequeno delay para garantir que o listener não sobrescreva
        setTimeout(() => { 
            isManualLogin = false; 
            console.log("[AuthDebug] isManualLogin = false");
        }, 500);
        isAuthReady.value = true;
    }
  }
  
  async function handleForgotPassword(email: string) {
    let baseUrl = (window.location.origin + window.location.pathname)
      .replace(/\/index\.html$/, '') 
      .replace(/\/+$/, '');
      
    const redirectTo = baseUrl; 
    console.log("[AuthDebug] Enviando reset para:", redirectTo);
    
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  // --- LISTENER ---
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log(`[AuthDebug] 👂 Evento Listener: ${event} | ManualLogin: ${isManualLogin}`);

    if (isManualLogin) {
        console.log("[AuthDebug] ✋ Ignorando evento pois isManualLogin é true.");
        return; 
    }

    if (IS_RECOVERY_BOOT) return;

    if (event === 'SIGNED_IN' && session?.user && !userRole.value) {
       console.log("[AuthDebug] ⚡ Auto-login detectado pelo listener.");
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