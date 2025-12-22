import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

// 1. CONSTANTE DE INATIVIDADE
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutos

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  const userRole = ref<string | null>(null)
  const currentUserId = ref<string | null>(null)
  const isAuthReady = ref(false)
  
  // 2. STATE PARA O TIMER
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

  // --- ACTIONS (CORRIGIDAS) ---

  async function checkUserProfileAndInitialize(user: User) {
    const { useUiStore } = await import('./uiStore')
    const uiStore = useUiStore()

    try {
      // 1. Verificar se é um LINK DE RECUPERAÇÃO (Prioridade Máxima)
      // O Supabase coloca #access_token=...&type=recovery na URL
      const isRecoveryUrl = window.location.hash && window.location.hash.includes('type=recovery');

      if (isRecoveryUrl) {
        console.log("Detectado fluxo de recuperação via URL!");
        uiStore.authModalMode = 'update_password';
        uiStore.isRecoveryMode = true; // Trava o modal aberto
        
        // Loga o usuário no state, mas NÃO inicia timer e NÃO fecha modal
        userRole.value = 'user'; // Assume user temporariamente para não quebrar a UI
        currentUserId.value = user.id;
        
        // Não buscamos role no banco para não perder tempo, o foco é trocar a senha
        isAuthReady.value = true;
        return; 
      }

      // 2. Se não for recuperação, segue o fluxo normal de banco de dados
      const { data: role, error: roleError } = await supabaseClient.rpc('get_my_role')
      if (roleError) throw roleError
      if (!role) throw new Error("Perfil de usuário não foi encontrado.")

      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('must_change_password')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      // 3. Verifica se o banco manda trocar a senha (Primeiro Acesso)
      if (profile.must_change_password) {
        console.warn("Usuário precisa trocar a senha (Banco de Dados)");
        
        uiStore.authModalMode = 'update_password' 
        uiStore.isRecoveryMode = true 
        
        userRole.value = role
        currentUserId.value = user.id
        // Não inicia timer
      } else {
        // 4. Login com sucesso normal
        uiStore.isRecoveryMode = false // Garante que o modal feche
        uiStore.authModalMode = 'login' // Reseta para o padrão
        
        userRole.value = role
        currentUserId.value = user.id
        
        startInactivityTimer()
      }
    } catch (error) {
      console.error("Erro ao procurar perfil:", error);
      await handleLogout()
    } finally {
      isAuthReady.value = true
    }
  }

  async function handleLogout() {
    stopInactivityTimer()
    
    const { useUiStore } = await import('./uiStore')
    const uiStore = useUiStore()
    
    uiStore.isRecoveryMode = false
    uiStore.authModalMode = 'login'

    const { error } = await supabaseClient.auth.signOut()
    if (error) {
      console.error('Erro no logout:', error.message)
      resetInactivityTimer()
    }
    
    userRole.value = null
    currentUserId.value = null
  }

  async function handleLogin(email: string, password: string) {
    isAuthReady.value = false
    const { error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });
    if (error) throw error;
  }
  
  async function handleForgotPassword(email: string) {
    // URL limpa sem index.html
    let baseUrl = (window.location.origin + window.location.pathname)
      .replace(/\/index\.html$/, '') 
      .replace(/\/+$/, '');
      
    const redirectTo = baseUrl; 
    
    console.log("Enviando e-mail para:", redirectTo);
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  // --- LISTENER ---
  supabaseClient.auth.onAuthStateChange((event, session) => {
    // Também capturamos o evento PASSWORD_RECOVERY aqui para reforçar
    if (event === 'PASSWORD_RECOVERY') {
       console.log("Evento PASSWORD_RECOVERY capturado no Listener");
       // A lógica principal será tratada pelo checkUserProfileAndInitialize via detecção de URL
       // ou pelo App.vue, mas não custa garantir aqui também:
       import('./uiStore').then(({ useUiStore }) => {
          const uiStore = useUiStore();
          uiStore.isRecoveryMode = true;
          uiStore.authModalMode = 'update_password';
       });
    }

    if (event === 'SIGNED_IN' && session?.user) {
      checkUserProfileAndInitialize(session.user);
    } else if (event === 'SIGNED_OUT') {
      stopInactivityTimer()
      userRole.value = null
      currentUserId.value = null
      isAuthReady.value = true
    } else if (event === 'INITIAL_SESSION') {
       if (session?.user) {
         checkUserProfileAndInitialize(session.user);
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