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
    // Importação dinâmica para evitar Dependência Circular
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
    // Importação dinâmica aqui dentro para garantir que o Pinia já subiu
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

      // --- TRATAMENTO DE TROCA DE SENHA ---
      if (profile.must_change_password) {
        console.warn("Usuário precisa trocar a senha - Ativando modo de recuperação");
        
        // 1. Mantemos logado para permitir a troca
        userRole.value = role
        currentUserId.value = user.id

        // 2. Acionamos a UI
        uiStore.authModalMode = 'update_password' 
        uiStore.isRecoveryMode = true // Isso impede o App.vue de esconder o modal
        
        // NÃO iniciamos o timer de inatividade aqui para não deslogar o usuário no meio da troca
      } else {
        // Sucesso normal
        userRole.value = role
        currentUserId.value = user.id
        
        // Garante que o modo de recuperação esteja desligado
        uiStore.isRecoveryMode = false 
        
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
    
    // Importação dinâmica para limpar a UI corretamente
    const { useUiStore } = await import('./uiStore')
    const uiStore = useUiStore()
    
    uiStore.isRecoveryMode = false
    uiStore.authModalMode = 'login'

    const { error } = await supabaseClient.auth.signOut()
    if (error) {
      console.error('Erro no logout:', error.message)
      // Se falhar o logout no server, forçamos a limpeza local reiniciando o timer (ou limpando variáveis)
      resetInactivityTimer() 
    }
    
    // Limpeza local garantida
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
    const redirectTo = window.location.origin; 
    
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