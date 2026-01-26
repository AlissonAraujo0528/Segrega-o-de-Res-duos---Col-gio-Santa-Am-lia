import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabaseClient } from '../lib/supabaseClient'
import { useUiStore } from './uiStore'

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutos

export const useAuthStore = defineStore('auth', () => {
  const user = ref<any>(null)
  const userRole = ref<string>('user') // Padrão seguro para evitar null
  const loading = ref(true)
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

  // --- CORE: Busca de Role Blindada ---
  async function fetchUserRole(userId: string) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      if (data) userRole.value = data.role

    } catch (e) {
      console.warn('Não foi possível buscar a role no banco. Usando "user" como fallback.', e)
      userRole.value = 'user' // Fallback para não travar o login
    }
  }

  // --- INIT ---
  async function init() {
    loading.value = true
    
    // Verifica recuperação na URL
    if (window.location.hash && window.location.hash.includes('type=recovery')) {
       uiStore.authModalMode = 'update_password'
       uiStore.openModal('auth')
    }

    const { data } = await supabaseClient.auth.getSession()
    if (data.session?.user) {
      user.value = data.session.user
      // Não usamos await aqui para não bloquear a renderização inicial
      fetchUserRole(user.value.id)
      startInactivityTimer()
    }
    loading.value = false

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
         uiStore.authModalMode = 'update_password'
         uiStore.openModal('auth')
      } else if (event === 'SIGNED_IN' && session?.user) {
        user.value = session.user
        fetchUserRole(session.user.id)
        startInactivityTimer()
      } else if (event === 'SIGNED_OUT') {
        user.value = null
        userRole.value = 'user'
        stopInactivityTimer()
      }
    })
  }

  // --- LOGIN ---
  async function handleLogin(email: string, pass: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password: pass,
      })

      if (error) throw error
      
      // Se chegou aqui, logou.
      if (data.user) {
        user.value = data.user
        // Tentativa "Best Effort" de pegar a role
        fetchUserRole(data.user.id) 
      }
      
      return true // Retorna true para o Modal fazer o reload

    } catch (e: any) {
      console.error('Login error:', e.message)
      return false
    }
  }

  async function handleLogout() {
    await supabaseClient.auth.signOut()
    user.value = null
    userRole.value = 'user'
    stopInactivityTimer()
    uiStore.authModalMode = 'login'
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
        fetchUserRole(data.session.user.id)
        uiStore.closeModal()
        uiStore.showToast('Senha recuperada!', 'success')
        startInactivityTimer()
    }
  }

  return {
    user,
    userRole, 
    loading,
    isAuthReady,
    isAuthenticated,
    init,
    handleLogin,
    handleLogout,
    handleForgotPassword,
    completePasswordRecovery
  }
})