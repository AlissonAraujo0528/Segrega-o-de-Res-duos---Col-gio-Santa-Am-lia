import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'
import type { User } from '@supabase/supabase-js'
// import { useUiStore } from './uiStore'
// 2. CONSTANTE DE INATIVIDADE (vinda do script.js)
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutos

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  const userRole = ref<string | null>(null)
  const currentUserId = ref<string | null>(null)
  const isAuthReady = ref(false)
  
  // 3. STATE PARA O TIMER E A UISTORE
  const inactivityTimer = ref<number | undefined>(undefined)

  // --- FUNÇÕES DE INATIVIDADE (NOVAS) ---
  
  /**
   * Desloga o usuário e mostra um aviso.
   * Chamado pelo setTimeout.
   */
  async function logoutDueToInactivity() {
    const { useUiStore } = await import('./uiStore')
    const uiStore = useUiStore() 
    uiStore.showToast('Você foi desconectado por inatividade.', 'info')
    handleLogout()
  }

  /**
   * Limpa o timer antigo e inicia um novo.
   * Chamado por qualquer atividade do usuário.
   */
  function resetInactivityTimer() {
    clearTimeout(inactivityTimer.value)
    inactivityTimer.value = setTimeout(logoutDueToInactivity, INACTIVITY_TIMEOUT_MS) as unknown as number
  }

  /**
   * Começa a ouvir por atividade do usuário.
   * Chamado no login.
   */
  function startInactivityTimer() {
    // Lista de eventos que contam como "atividade"
    const activityEvents = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart']
    activityEvents.forEach(event => {
      document.addEventListener(event, resetInactivityTimer)
    })
    resetInactivityTimer() // Inicia o timer pela primeira vez
  }

  /**
   * Para de ouvir por atividade e limpa o timer.
   * Chamado no logout.
   */
  function stopInactivityTimer() {
    clearTimeout(inactivityTimer.value)
    const activityEvents = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart']
    activityEvents.forEach(event => {
      document.removeEventListener(event, resetInactivityTimer)
    })
  }

  // --- ACTIONS (Atualizadas) ---

  async function checkUserProfileAndInitialize(user: User) {
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

      if (profile.must_change_password) {
        console.warn("Usuário precisa trocar a senha!");
        await handleLogout(); // Força o logout
      } else {
        // Sucesso!
        userRole.value = role
        currentUserId.value = user.id
        startInactivityTimer() // 4. INICIA O TIMER NO LOGIN
      }
    } catch (error) {
      console.error("Erro ao procurar perfil:", error);
      await handleLogout() // Garante que saia se o perfil falhar
    } finally {
      isAuthReady.value = true
    }
  }

  async function handleLogout() {
    stopInactivityTimer() // 1. Para o timer
    const { error } = await supabaseClient.auth.signOut() // 2. Desloga
    if (error) {
      // Se o logout falhar (raro), pelo menos resetamos o timer
      console.error('Erro no logout:', error.message)
      resetInactivityTimer()
    }
    
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
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  // --- LISTENER (Atualizado) ---
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      checkUserProfileAndInitialize(session.user);
    } else if (event === 'SIGNED_OUT') {
      stopInactivityTimer() // 6. PARA O TIMER (failsafe)
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

  
  // Exporta o estado e as funções
  return {
    userRole,
    currentUserId,
    isAuthReady,
    handleLogin,
    handleLogout,
    handleForgotPassword,
  }
})