import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

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

  // --- ACTIONS (CORRIGIDAS) ---

  async function checkUserProfileAndInitialize(user: User) {
    // Importar UI store antes de tudo para garantir controle
    const { useUiStore } = await import('./uiStore')
    const uiStore = useUiStore()

    try {
      const { data: role, error: roleError } = await supabaseClient.rpc('get_my_role')
      if (roleError) throw roleError
      if (!role) throw new Error("Perfil de usuário não foi encontrado.")

      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('must_change_password')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      // --- CORREÇÃO DA LÓGICA DE TROCA DE SENHA ---
      if (profile.must_change_password) {
        console.warn("Usuário precisa trocar a senha - Travando interface em modo recuperação");
        
        // 1. PRIMEIRO: Travamos a UI no modo de recuperação
        uiStore.authModalMode = 'update_password' 
        uiStore.isRecoveryMode = true 
        
        // 2. SEGUNDO: Definimos o usuário (o App.vue não vai fechar o modal por causa do passo 1)
        userRole.value = role
        currentUserId.value = user.id

        // OBS: Não iniciamos o timer de inatividade aqui para não atrapalhar
      } else {
        // Fluxo normal (Login com sucesso e senha em dia)
        uiStore.isRecoveryMode = false // Garante destravamento
        
        userRole.value = role
        currentUserId.value = user.id
        
        startInactivityTimer()
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      await handleLogout()
    } finally {
      isAuthReady.value = true
    }
  }

  async function handleLogout() {
    stopInactivityTimer()
    
    const { useUiStore } = await import('./uiStore')
    const uiStore = useUiStore()
    
    // Reseta estados visuais
    uiStore.isRecoveryMode = false
    uiStore.authModalMode = 'login'

    const { error } = await supabaseClient.auth.signOut()
    if (error) {
      console.error('Erro no logout:', error.message)
      // Força limpeza local mesmo com erro de rede
      resetInactivityTimer() 
    }
    
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
    // CORREÇÃO DO REDIRECT:
    // Pega a URL base (ex: https://site.com/pasta/) sem 'index.html' no final
    let baseUrl = (window.location.origin + window.location.pathname)
      .replace(/\/index\.html$/, '') 
      .replace(/\/+$/, ''); // Remove barra final se tiver
      
    // Importante: Essa URL deve estar autorizada no painel do Supabase
    const redirectTo = baseUrl; 
    
    console.log("Enviando e-mail de recuperação para redirecionar em:", redirectTo);

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  // --- LISTENER ---
  supabaseClient.auth.onAuthStateChange((event, session) => {
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
    // Nota: O evento PASSWORD_RECOVERY também é tratado no App.vue
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