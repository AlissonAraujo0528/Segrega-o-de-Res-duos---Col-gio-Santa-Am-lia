import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'
import { useUiStore } from './uiStore' 

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutos

export const useAuthStore = defineStore('auth', () => {
  const user = ref<any>(null)
  const userRole = ref<string | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const inactivityTimer = ref<ReturnType<typeof setTimeout> | undefined>(undefined)
  
  const uiStore = useUiStore()

  // Getters
  const isAuthReady = computed(() => !loading.value)
  const isAuthenticated = computed(() => !!user.value)

  // --- FUNÇÕES DE INATIVIDADE ---
  function logoutDueToInactivity() {
    uiStore.showToast('Você foi desconectado por inatividade.', 'info')
    handleLogout()
  }

  function resetInactivityTimer() {
    clearTimeout(inactivityTimer.value)
    if (user.value) {
      inactivityTimer.value = setTimeout(logoutDueToInactivity, INACTIVITY_TIMEOUT_MS)
    }
  }

  function startInactivityTimer() {
    const activityEvents = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart']
    activityEvents.forEach(event => document.addEventListener(event, resetInactivityTimer))
    resetInactivityTimer()
  }

  function stopInactivityTimer() {
    clearTimeout(inactivityTimer.value)
    const activityEvents = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart']
    activityEvents.forEach(event => document.removeEventListener(event, resetInactivityTimer))
  }

  // --- INICIALIZAÇÃO ---
  async function init() {
    loading.value = true
    
    // Verifica recuperação de senha na URL
    if (window.location.hash && window.location.hash.includes('type=recovery')) {
       uiStore.authModalMode = 'update_password'
       uiStore.openModal('auth')
    }

    const { data } = await supabaseClient.auth.getSession()
    if (data.session?.user) {
      user.value = data.session.user
      await fetchUserRole(user.value.id)
      startInactivityTimer()
    }
    loading.value = false

    // Escuta mudanças de auth
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
         uiStore.authModalMode = 'update_password'
         uiStore.openModal('auth')
      } else if (event === 'SIGNED_IN' && session?.user) {
        user.value = session.user
        await fetchUserRole(session.user.id)
        startInactivityTimer()
      } else if (event === 'SIGNED_OUT') {
        user.value = null
        userRole.value = null
        stopInactivityTimer()
      }
    })
  }

  async function fetchUserRole(userId: string) {
    try {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      
      if (profile) {
          userRole.value = profile.role
      } else {
          // Fallback para RPC se perfil falhar
          const { data: role } = await supabaseClient.rpc('get_my_role')
          userRole.value = role
      }
    } catch (e) {
      console.error('Erro ao buscar role:', e)
      userRole.value = 'user' 
    }
  }

  // --- ACTIONS DE LOGIN ---
  
  async function handleLogin(email: string, pass: string): Promise<boolean> {
    error.value = null
    try {
      // CORREÇÃO: Removemos 'data' que não estava sendo usado
      const { error: err } = await supabaseClient.auth.signInWithPassword({
        email,
        password: pass,
      })

      if (err) throw err
      
      return true 

    } catch (e: any) {
      console.error('Login error:', e)
      error.value = e.message
      return false 
    }
  }

  async function handleLogout() {
    await supabaseClient.auth.signOut()
    user.value = null
    userRole.value = null
    uiStore.authModalMode = 'login'
    stopInactivityTimer()
  }

  async function handleForgotPassword(email: string) {
    const redirectTo = window.location.origin
    return await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo })
  }
  
  async function completePasswordRecovery() {
    window.history.replaceState({}, document.title, window.location.pathname)
    
    const { data } = await supabaseClient.auth.getSession()
    if (data.session?.user) {
        user.value = data.session.user
        await fetchUserRole(data.session.user.id)
        
        uiStore.closeModal()
        uiStore.showToast('Senha recuperada com sucesso!', 'success')
        startInactivityTimer()
    }
  }

  return {
    user,
    userRole,
    loading,
    error,
    isAuthReady,
    isAuthenticated,
    init,
    handleLogin,
    handleLogout,
    handleForgotPassword,
    completePasswordRecovery
  }
})